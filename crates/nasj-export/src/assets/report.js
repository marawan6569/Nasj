(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('topology-data').textContent);
  const $ = id => document.getElementById(id);
  const svg = $('topology-graph');
  const nodes = Array.from(svg.querySelectorAll('[data-node]'));
  const edges = Array.from(svg.querySelectorAll('[data-edge]'));
  const byId = new Map(data.nodes.map((node, index) => [node.id, index]));
  const search = $('search');
  const kindFilter = $('kind-filter');
  const unresolved = $('unresolved-only');
  const hostView = $('vhost-view');
  const overview = { x: svg.viewBox.baseVal.x, y: svg.viewBox.baseVal.y, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height };
  let base = { ...overview };
  let view = { ...base };
  let viewMode = 'readable';
  let geometryKey = null;
  let drag = null;
  let pinch = null;
  const pointers = new Map();
  let directMatches = [];
  let visibleIndices = [];
  let selected = null;
  const pretty = value => value.replaceAll('_', ' ');
  const source = value => value ? `${value.path}:${value.line}` : 'No source metadata';
  const shortSource = value => value ? `${value.path.split('/').pop()}:${value.line}` : 'No source metadata';
  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  const setView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  const outgoing = data.nodes.map(() => []);
  const incoming = data.nodes.map(() => []);
  const endpoints = data.edges.map(edge => [byId.get(edge.from), byId.get(edge.to)]);
  endpoints.forEach(([from, to], i) => { outgoing[from].push([to, i]); incoming[to].push([from, i]); });
  const searchable = data.nodes.map(node => `${node.label} ${node.kind} ${source(node.source)} ${JSON.stringify(node.attributes)} ${JSON.stringify(node.condition || '')}`.toLocaleLowerCase());
  const nativePoints = nodes.map(node => { const matrix = node.transform.baseVal.consolidate().matrix; return [matrix.e, matrix.f]; });
  const cache = new Map();
  const servers = data.nodes.map((node, i) => [node, i]).filter(([node]) => node.kind === 'server').sort(([a, ai], [b, bi]) => a.label === b.label ? ai - bi : a.label < b.label ? -1 : 1);
  const domains = new Map();
  servers.forEach(([node, index]) => {
    const domain = node.attributes.virtual_host || node.label;
    if (!domains.has(domain)) { const group = document.createElement('optgroup'); group.label = domain; domains.set(domain, group); hostView.append(group); }
    const option = new Option(`${node.label} · ${shortSource(node.source)}`, String(index));
    option.title = source(node.source);
    domains.get(domain).append(option);
  });
  const hostMembers = index => {
    const members = new Set([index]);
    const queue = [index];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      outgoing[queue[cursor]].forEach(([to]) => {
        if (data.nodes[to].kind !== 'server' && !members.has(to)) { members.add(to); queue.push(to); }
      });
    }
    incoming[index].forEach(([from, edge]) => { if (data.edges[edge].kind === 'routes_to' && data.nodes[from].kind === 'domain') members.add(from); });
    return members;
  };
  // Rank declarations, not guessed traffic/popularity. Port numbers alone do
  // not imply TLS; only configured listener protocol and effective edges count.
  const hostScore = index => {
    if (data.analysis !== 'configuration' || data.nodes[index].attributes.state !== 'configured') return null;
    const owners = new Set(), responses = new Set(), visited = new Set(), queue = [index];
    let locations = 0, actions = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const from = queue[cursor];
      if (visited.has(from)) continue;
      visited.add(from);
      if (data.nodes[from].attributes.reachability === 'unreachable_after_return') continue;
      if (data.nodes[from].kind === 'location') locations++;
      outgoing[from].forEach(([to, edgeIndex]) => {
        const edge = data.edges[edgeIndex];
        if (edge.evidence !== 'configured') return;
        if (['proxies_to', 'backed_by'].includes(edge.kind)) owners.add(from);
        if (edge.kind === 'responds_with') responses.add(from);
        if (['responds_with', 'redirects_to', 'evaluates'].includes(edge.kind)) actions++;
        if (edge.kind === 'contains') queue.push(to);
      });
    }
    const https = outgoing[index].some(([to, edgeIndex]) => data.edges[edgeIndex].kind === 'listens_on' && data.edges[edgeIndex].evidence === 'configured' && data.nodes[to].attributes.protocol === 'https');
    return [Number(https && owners.size > 0), owners.size, responses.size, locations, actions];
  };
  let initialHost = servers.length ? servers[0][1] : null, bestScore = null;
  servers.forEach(([, index]) => {
    const score = hostScore(index);
    if (!score) return;
    const firstDifference = bestScore ? score.findIndex((value, i) => value !== bestScore[i]) : -1;
    if (!bestScore || firstDifference >= 0 && score[firstDifference] > bestScore[firstDifference]) { initialHost = index; bestScore = score; }
  });
  if (initialHost !== null) hostView.value = String(initialHost);

  // Two directed walks, never an undirected component expansion. Reverse paths
  // find callers; forward paths start only at direct matches (and guard nodes).
  // Thus shared destinations retain their callers without pulling in siblings
  // through context domains/servers. Model order makes truncation predictable.
  const SEARCH_MATCH_LIMIT = 40, SEARCH_NODE_LIMIT = 200, SEARCH_DEPTH_LIMIT = 24, SEARCH_EDGE_LIMIT = 4000;
  const searchContext = matches => {
    const direct = matches.slice(0, SEARCH_MATCH_LIMIT), members = new Set(direct);
    const reverseSeen = new Set(), forwardSeen = new Set(), guards = new Set();
    let examined = 0, limited = matches.length > direct.length;
    const walk = (start, reverse) => {
      const seen = reverse ? reverseSeen : forwardSeen, stack = [[start, 0]];
      while (stack.length) {
        const [index, depth] = stack.pop();
        if (seen.has(index)) continue;
        if (!members.has(index) && members.size >= SEARCH_NODE_LIMIT) { limited = true; continue; }
        members.add(index); seen.add(index);
        if (reverse && data.nodes[index].kind === 'condition') guards.add(index);
        const links = reverse && data.nodes[index].kind === 'domain' ? [] : (reverse ? incoming[index] : outgoing[index]);
        if (depth >= SEARCH_DEPTH_LIMIT) { if (links.some(([next]) => !seen.has(next))) limited = true; continue; }
        // Reverse push order gives a stable depth-first caller-to-domain path.
        for (let i = links.length - 1; i >= 0; i--) {
          if (++examined > SEARCH_EDGE_LIMIT) { limited = true; return; }
          stack.push([links[i][0], depth + 1]);
        }
      }
    };
    direct.forEach(index => { if (examined <= SEARCH_EDGE_LIMIT) walk(index, true); });
    direct.forEach(index => { if (examined <= SEARCH_EDGE_LIMIT) walk(index, false); });
    // Preserve the other outcomes of an ancestor guard, including false chains.
    guards.forEach(index => { if (examined <= SEARCH_EDGE_LIMIT) walk(index, false); });
    return { direct, members, limited, total: matches.length };
  };
  // Same native layered/mean-order strategy as the static exporter. Layouts are
  // calculated lazily and at most eight vhost layouts are retained, including
  // shared upstream members only in the selected focus view.
  const focusLayout = members => {
    const indices = [...members].sort((a, b) => a - b);
    const degree = new Map(indices.map(i => [i, incoming[i].filter(([from]) => members.has(from)).length]));
    const rank = new Map(indices.map(i => [i, 0]));
    const queue = indices.filter(i => degree.get(i) === 0);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const from = queue[cursor];
      outgoing[from].forEach(([to]) => {
        if (!members.has(to)) return;
        rank.set(to, Math.max(rank.get(to), rank.get(from) + 1)); degree.set(to, degree.get(to) - 1);
        if (degree.get(to) === 0) queue.push(to);
      });
    }
    const columns = new Map();
    indices.forEach(i => { const r = rank.get(i); if (!columns.has(r)) columns.set(r, []); columns.get(r).push(i); });
    const ordered = [...columns.entries()].sort(([a], [b]) => a - b);
    const row = new Map();
    ordered.forEach(([, column]) => column.forEach((i, r) => row.set(i, r)));
    const center = i => { const parents = incoming[i].filter(([from]) => members.has(from)); return parents.length ? parents.reduce((sum, [from]) => sum + row.get(from), 0) / parents.length : row.get(i); };
    for (let pass = 0; pass < 3; pass++) ordered.forEach(([, column]) => { column.sort((a, b) => center(a) - center(b) || a - b); column.forEach((i, r) => row.set(i, r)); });
    const points = new Map(indices.map(i => [i, [32 + rank.get(i) * 320, 32 + row.get(i) * 128]]));
    let width = 320, height = 180;
    points.forEach(([x, y]) => { width = Math.max(width, x + 292); height = Math.max(height, y + 120); });
    return { members, points, bounds: { x: 0, y: 0, width, height } };
  };
  let activePoints = new Map(nativePoints.map((point, i) => [i, point]));
  const boundsOf = indices => {
    const points = indices.map(i => activePoints.get(i)).filter(Boolean);
    if (!points.length) return { x: 0, y: 0, width: 320, height: 180 };
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    const x = Math.min(...xs) - 24, y = Math.min(...ys) - 24;
    return { x, y, width: Math.max(...xs) + 284 - x, height: Math.max(...ys) + 112 - y };
  };
  const updateFrameNote = () => {
    const outside = visibleIndices.filter(i => { const [x, y] = activePoints.get(i); return x < view.x || y < view.y || x + 260 > view.x + view.width || y + 88 > view.y + view.height; }).length;
    $('frame-note').textContent = outside ? `${outside} nodes outside frame · Drag / pinch, select a result, or Fit view` : 'All visible nodes in frame';
  };
  const frame = (indices, anchor = null) => {
    const rect = svg.getBoundingClientRect(), aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    const bounds = boundsOf(indices), fitted = Math.max(bounds.width, bounds.height * aspect);
    // At least 220 CSS px per card. Fit small routes, center larger ones without
    // shrinking labels to overview scale. Explicit selection always stays inside.
    const width = Math.max(320, Math.min(fitted, rect.width * 260 / 220));
    const height = width / aspect;
    let x = bounds.x + bounds.width / 2 - width / 2, y = bounds.y + bounds.height / 2 - height / 2;
    if (anchor !== null && activePoints.has(anchor)) {
      const [ax, ay] = activePoints.get(anchor);
      x = Math.max(ax + 284 - width, Math.min(x, ax - 24));
      y = Math.max(ay + 112 - height, Math.min(y, ay - 24));
    }
    view = { x, y, width, height }; setView(); updateFrameNote();
  };
  const showReadable = () => {
    viewMode = 'readable';
    const important = visibleIndices.filter(i => !['domain', 'listener', 'server'].includes(data.nodes[i].kind));
    const anchor = directMatches.length ? (directMatches.includes(selected) ? selected : directMatches[0]) : selected !== null && visibleIndices.includes(selected) ? selected : null;
    const allBounds = boundsOf(visibleIndices), rect = svg.getBoundingClientRect();
    const canFit = Math.max(allBounds.width, allBounds.height * rect.width / Math.max(1, rect.height)) <= rect.width * 260 / 220;
    frame(canFit || !important.length ? visibleIndices : important, anchor);
  };
  const focusNode = index => {
    viewMode = 'manual';
    const nearby = [index, ...incoming[index].map(([i]) => i), ...outgoing[index].map(([i]) => i)].filter(i => visibleIndices.includes(i));
    frame(nearby, index);
  };
  const place = (key, layout, fullOverview) => {
    if (key === geometryKey) return;
    geometryKey = key;
    activePoints = layout.points;
    base = layout.bounds;
    layout.points.forEach(([x, y], i) => nodes[i].setAttribute('transform', `translate(${x} ${y})`));
    endpoints.forEach(([from, to], i) => {
      if (!layout.points.has(from) || !layout.points.has(to)) return;
      const [startX, startY] = layout.points.get(from), [x2, endY] = layout.points.get(to);
      const x1 = startX + 260, y1 = startY + 44, y2 = endY + 44, middle = (x1 + x2) / 2;
      edges[i].querySelector('path').setAttribute('d', `M${x1} ${y1} C${middle} ${y1} ${middle} ${y2} ${x2} ${y2}`);
      const label = edges[i].querySelector('text'); label.setAttribute('x', middle); label.setAttribute('y', (y1 + y2) / 2 - 8);
    });
    svg.querySelectorAll('.vhost-group').forEach(group => { if (fullOverview) group.removeAttribute('hidden'); else group.setAttribute('hidden', ''); });
    const callers = [...layout.members].filter(i => data.nodes[i].kind === 'server');
    const callerLabels = callers.slice(0, 3).map(i => data.nodes[i].label).join(' / ');
    $('view-caption').textContent = search.value.trim() ? `Global search${callers.length ? ` · Routes via ${callerLabels}${callers.length > 3 ? ` + ${callers.length - 3} more` : ''}` : ' · No connected virtual host in this result'}` : fullOverview ? 'Full infrastructure overview' : data.nodes[Number(hostView.value)].label;
  };
  const point = (event, matrix = svg.getScreenCTM().inverse()) => new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
  const zoom = (factor, anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) => {
    viewMode = 'manual';
    factor = Math.max(160 / view.width, Math.min(factor, base.width * 20 / view.width));
    view = { x: anchor.x - (anchor.x - view.x) * factor, y: anchor.y - (anchor.y - view.y) * factor, width: view.width * factor, height: view.height * factor };
    setView(); updateFrameNote();
  };
  const clearSelection = () => {
    selected = null;
    nodes.forEach(node => node.classList.remove('selected', 'related'));
    edges.forEach(edge => edge.classList.remove('related'));
    $('selection').hidden = true;
    $('inspect-selection').hidden = true;
  };
  const select = index => {
    clearSelection();
    const node = data.nodes[index];
    selected = index;
    nodes[index].classList.add('selected');
    $('selection').hidden = false;
    $('inspect-selection').hidden = false;
    $('node-kind').textContent = pretty(node.kind);
    $('node-title').textContent = node.label;
    const fields = $('node-fields');
    fields.replaceChildren();
    if (node.condition) {
      const condition = node.condition;
      fields.append(text('dt', 'Symbolic condition'), text('dd', `${condition.variable} ${condition.operator === 'equal' ? '=' : '!='} ${JSON.stringify(condition.value)}${condition.value_redacted ? ' (value redacted)' : ''}`));
    }
    for (const [key, value] of [...Object.entries({ id: node.id, source: source(node.source) }), ...Object.entries(node.attributes)]) {
      fields.append(text('dt', pretty(key)), text('dd', value));
    }
    const relationships = $('relationships');
    relationships.replaceChildren();
    data.edges.forEach((edge, i) => {
      if (edge.from !== node.id && edge.to !== node.id) return;
      const other = byId.get(edge.from === node.id ? edge.to : edge.from);
      if (other !== undefined) nodes[other].classList.add('related');
      edges[i].classList.add('related');
      const description = `${pretty(edge.kind)} · ${edge.evidence} · ${other === undefined ? 'unknown' : data.nodes[other].label}`;
      const item = text('li', description);
      item.append(text('small', ` — ${source(edge.source)}`));
      relationships.append(item);
    });
    if (!relationships.childElementCount) relationships.append(text('li', 'No resolved relationships.'));
    focusNode(index);
  };
  const kinds = [...new Set(data.nodes.map(node => node.kind))].sort();
  kinds.forEach(kind => kindFilter.add(new Option(pretty(kind), kind)));
  const applyFilters = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const fullOverview = !query && hostView.value === '';
    const eligible = (node, i) => (!kindFilter.value || node.kind === kindFilter.value) && (!unresolved.checked || node.attributes.routing === 'unresolved') && (!query || searchable[i].includes(query));
    const result = query ? searchContext(data.nodes.map((node, i) => eligible(node, i) ? i : -1).filter(i => i >= 0)) : null;
    directMatches = result ? result.direct : [];
    const directSet = new Set(directMatches);
    let layout;
    if (result) layout = focusLayout(result.members);
    else if (fullOverview) layout = { members: new Set(data.nodes.map((_, i) => i)), points: new Map(nativePoints.map((point, i) => [i, point])), bounds: overview };
    else {
      const key = hostView.value;
      if (!cache.has(key)) { cache.set(key, focusLayout(hostMembers(Number(key)))); if (cache.size > 8) cache.delete(cache.keys().next().value); }
      layout = cache.get(key);
    }
    const key = query ? `search:${query}:${kindFilter.value}:${unresolved.checked}` : `host:${hostView.value}`;
    const changed = key !== geometryKey;
    place(key, layout, fullOverview);
    const visible = data.nodes.map((node, i) => layout.members.has(i) && (query || eligible(node, i)));
    visibleIndices = data.nodes.map((_, i) => i).filter(i => visible[i]);
    nodes.forEach((node, i) => {
      node.classList.toggle('search-match', Boolean(query && directSet.has(i)));
      node.classList.toggle('search-context', Boolean(query && visible[i] && !directSet.has(i)));
      node.setAttribute('aria-label', `${data.nodes[i].label}${query && visible[i] ? directSet.has(i) ? ' · Direct search match' : ' · Routing context' : ''}`);
      node.setAttribute('aria-hidden', String(!visible[i])); node.setAttribute('tabindex', visible[i] ? '0' : '-1');
      if (visible[i]) node.removeAttribute('hidden'); else node.setAttribute('hidden', '');
    });
    edges.forEach((element, i) => {
      const show = visible[endpoints[i][0]] && visible[endpoints[i][1]];
      if (show) element.removeAttribute('hidden'); else element.setAttribute('hidden', '');
    });
    const matches = $('matches'); matches.replaceChildren();
    const listed = query ? directMatches : visibleIndices;
    listed.slice(0, 200).forEach(index => {
      const node = data.nodes[index], button = text('button', node.label);
      button.type = 'button'; button.title = source(node.source);
      button.append(text('small', `${pretty(node.kind)} · ${shortSource(node.source)}`));
      button.addEventListener('click', () => { select(index); svg.scrollIntoView({ block: 'nearest' }); });
      const item = document.createElement('li'); item.append(button); matches.append(item);
    });
    if (!listed.length) matches.append(text('li', 'No matching nodes.', 'empty'));
    $('visible-count').textContent = `${visibleIndices.length} of ${nodes.length} nodes · ${query ? `Global search · ${directMatches.length} ${directMatches.length === 1 ? 'match' : 'matches'} + ${visibleIndices.length - directMatches.length} context` : fullOverview ? 'Full overview' : 'Virtual host focus'}`;
    $('matches-note').textContent = result && result.limited ? `Limited search: showing ${directMatches.length} of ${result.total} matches; up to 200 nodes, 24 hops and 4000 edge visits. Context may be incomplete; narrow your search.` : query ? 'Highlighted = direct match; dashed = routing context. Filters select matches; connecting context remains.' : listed.length > 200 ? 'First 200 matches; narrow your search.' : 'Select a result to focus it on the graph.';
    $('search-limit').hidden = !result?.limited;
    $('search-limit').textContent = result?.limited ? 'Search context limited · Narrow the query (details in inspector)' : '';
    if (selected !== null && !visible[selected]) clearSelection();
    if (changed) showReadable(); else updateFrameNote();
  };
  search.addEventListener('input', applyFilters);
  kindFilter.addEventListener('change', applyFilters);
  unresolved.addEventListener('change', applyFilters);
  hostView.addEventListener('change', () => { search.value = ''; clearSelection(); applyFilters(); });
  $('clear-filters').addEventListener('click', () => { search.value = ''; kindFilter.value = ''; unresolved.checked = false; applyFilters(); });
  $('reset-selection').addEventListener('click', clearSelection);
  $('zoom-in').addEventListener('click', () => zoom(0.8));
  $('zoom-out').addEventListener('click', () => zoom(1.25));
  $('fit').addEventListener('click', () => { viewMode = 'fit'; view = { ...boundsOf(visibleIndices) }; setView(); updateFrameNote(); });
  $('readable').addEventListener('click', showReadable);
  $('inspect-selection').addEventListener('click', () => { $('selection').scrollIntoView({ block: 'start' }); $('selection').focus({ preventScroll: true }); });
  $('show-selection').addEventListener('click', () => { if (selected !== null) { focusNode(selected); svg.scrollIntoView({ block: 'center' }); nodes[selected].focus({ preventScroll: true }); } });
  new ResizeObserver(() => { if (viewMode === 'readable') showReadable(); }).observe(svg);
  svg.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.88 : 1.14, point(event)); }, { passive: false });
  const startDrag = (event, moved = false) => {
    drag = { matrix: svg.getScreenCTM().inverse(), start: point(event), view: { ...view }, node: event.target.closest('[data-node]'), moved, x: event.clientX, y: event.clientY };
  };
  const midpoint = () => {
    const [a, b] = [...pointers.values()];
    return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2, distance: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) };
  };
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    pointers.set(event.pointerId, event); svg.setPointerCapture(event.pointerId);
    if (pointers.size === 1) startDrag(event);
    else {
      const mid = midpoint(), matrix = svg.getScreenCTM().inverse();
      pinch = { matrix, anchor: point(mid, matrix), distance: mid.distance, view: { ...view } }; drag = null;
    }
  });
  svg.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event);
    if (pinch && pointers.size === 2) {
      viewMode = 'manual';
      const mid = midpoint(), current = point(mid, pinch.matrix), start = pinch.view;
      const factor = Math.max(160 / start.width, Math.min(pinch.distance / mid.distance, base.width * 20 / start.width));
      view = { x: pinch.anchor.x - (current.x - start.x) * factor, y: pinch.anchor.y - (current.y - start.y) * factor, width: start.width * factor, height: start.height * factor };
      setView(); updateFrameNote(); return;
    }
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3) drag.moved = true;
    if (!drag.moved) return;
    viewMode = 'manual';
    const current = point(event, drag.matrix);
    view = { ...drag.view, x: drag.view.x - (current.x - drag.start.x), y: drag.view.y - (current.y - drag.start.y) };
    setView(); updateFrameNote();
  });
  const endPointer = event => {
    if (!pointers.has(event.pointerId)) return;
    const tap = event.type === 'pointerup' && !pinch && drag && !drag.moved && drag.node;
    const index = tap ? Number(drag.node.dataset.node) : null;
    pointers.delete(event.pointerId); pinch = null; drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (pointers.size === 1) startDrag([...pointers.values()][0], true);
    if (index !== null) select(index);
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('lostpointercapture', endPointer);
  nodes.forEach((node, index) => {
    node.setAttribute('role', 'button');
    node.addEventListener('focus', () => {
      if (!visibleIndices.includes(index)) return;
      const [x, y] = activePoints.get(index);
      if (x < view.x || y < view.y || x + 260 > view.x + view.width || y + 88 > view.y + view.height) focusNode(index);
    });
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(index); } });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearSelection();
    if (event.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
  });
  const theme = $('theme');
  const setTheme = dark => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; theme.textContent = dark ? 'Light theme' : 'Dark theme'; theme.setAttribute('aria-pressed', String(dark)); };
  setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
  $('node-count').textContent = data.nodes.length;
  $('edge-count').textContent = data.edges.length;
  $('warning-count').textContent = data.warnings.length;
  const warningCount = data.warnings.filter(diagnostic => diagnostic.severity === 'warning' || !diagnostic.severity).length;
  const infoCount = data.warnings.filter(diagnostic => diagnostic.severity === 'info').length;
  const errorCount = data.warnings.filter(diagnostic => diagnostic.severity === 'error').length;
  $('review-warnings').textContent = `${warningCount} analysis warning${warningCount === 1 ? '' : 's'} · ${infoCount} info · ${errorCount} errors · Review`;
  $('review-warnings').addEventListener('click', () => $('diagnostics').scrollIntoView({ block: 'start' }));
  data.warnings.forEach(warning => {
    const severity = ['info', 'warning', 'error'].includes(warning.severity) ? warning.severity : 'warning';
    const item = text('li', `${severity.toUpperCase()} · ${warning.code}: ${warning.message}`, `diagnostic ${severity}`);
    if (warning.source) item.append(text('small', source(warning.source)));
    $('warnings').append(item);
  });
  if (!data.warnings.length) $('warnings').append(text('li', 'No analysis diagnostics.', 'subtle'));
  data.sources.forEach(path => $('sources').append(text('li', path)));
  if (!data.sources.length) $('sources').append(text('li', data.analysis === 'synthetic' ? 'Synthetic topology; no files read.' : 'No source files recorded.'));
  applyFilters();
})();
