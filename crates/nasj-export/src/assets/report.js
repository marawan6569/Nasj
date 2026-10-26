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
  if (servers.length) hostView.value = String(servers[0][1]);
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
    const points = new Map(indices.map(i => [i, [48 + rank.get(i) * 380, 48 + row.get(i) * 136]]));
    let width = 720, height = 240;
    points.forEach(([x, y]) => { width = Math.max(width, x + 308); height = Math.max(height, y + 136); });
    return { members, points, bounds: { x: 0, y: 0, width, height } };
  };
  let activePoints = new Map(nativePoints.map((point, i) => [i, point]));
  const showReadable = () => {
    viewMode = 'readable';
    const rect = svg.getBoundingClientRect();
    const width = Math.max(320, Math.min(base.width, rect.width));
    const anchor = hostView.value && !search.value.trim() ? activePoints.get(Number(hostView.value)) : null;
    view = { x: Math.max(0, (anchor ? anchor[0] + 130 : 0) - width / 2), y: base.y, width, height: width * rect.height / Math.max(1, rect.width) };
    setView();
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
    $('view-caption').textContent = search.value.trim() ? 'Search across all virtual hosts' : fullOverview ? 'Full infrastructure overview' : data.nodes[Number(hostView.value)].label;
    showReadable();
  };
  const point = (event, matrix = svg.getScreenCTM().inverse()) => new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
  const zoom = (factor, anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) => {
    viewMode = 'manual';
    factor = Math.max(160 / view.width, Math.min(factor, base.width * 20 / view.width));
    view = { x: anchor.x - (anchor.x - view.x) * factor, y: anchor.y - (anchor.y - view.y) * factor, width: view.width * factor, height: view.height * factor };
    setView();
  };
  const clearSelection = () => {
    selected = null;
    nodes.forEach(node => node.classList.remove('selected', 'related'));
    edges.forEach(edge => edge.classList.remove('related'));
    $('selection').hidden = true;
  };
  const select = index => {
    clearSelection();
    const node = data.nodes[index];
    selected = index;
    nodes[index].classList.add('selected');
    $('selection').hidden = false;
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
  };
  const kinds = [...new Set(data.nodes.map(node => node.kind))].sort();
  kinds.forEach(kind => kindFilter.add(new Option(pretty(kind), kind)));
  const applyFilters = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const fullOverview = !query && hostView.value === '';
    let layout;
    if (query) layout = focusLayout(new Set(data.nodes.map((node, i) => searchable[i].includes(query) ? i : -1).filter(i => i >= 0)));
    else if (fullOverview) layout = { members: new Set(data.nodes.map((_, i) => i)), points: new Map(nativePoints.map((point, i) => [i, point])), bounds: overview };
    else {
      const key = hostView.value;
      if (!cache.has(key)) { cache.set(key, focusLayout(hostMembers(Number(key)))); if (cache.size > 8) cache.delete(cache.keys().next().value); }
      layout = cache.get(key);
    }
    place(query ? `search:${query}` : `host:${hostView.value}`, layout, fullOverview);
    const visible = data.nodes.map((node, i) => layout.members.has(i) && (!kindFilter.value || node.kind === kindFilter.value) && (!unresolved.checked || node.attributes.routing === 'unresolved'));
    nodes.forEach((node, i) => { node.hidden = !visible[i]; node.setAttribute('aria-hidden', String(!visible[i])); if (visible[i]) node.removeAttribute('hidden'); else node.setAttribute('hidden', ''); });
    edges.forEach((element, i) => {
      const edge = data.edges[i];
      const show = visible[byId.get(edge.from)] && visible[byId.get(edge.to)];
      if (show) element.removeAttribute('hidden'); else element.setAttribute('hidden', '');
    });
    const matches = $('matches');
    matches.replaceChildren();
    let shown = 0;
    visible.forEach((show, index) => {
      if (!show || shown++ >= 200) return;
      const node = data.nodes[index];
      const button = text('button', node.label);
      button.type = 'button';
      button.title = source(node.source);
      button.append(text('small', `${pretty(node.kind)} · ${shortSource(node.source)}`));
      button.addEventListener('click', () => {
        select(index);
        viewMode = 'manual';
        const transform = nodes[index].transform.baseVal.consolidate().matrix;
        const rect = svg.getBoundingClientRect(), width = Math.max(320, Math.min(660, rect.width));
        view = { x: transform.e - 40, y: transform.f - 40, width, height: width * rect.height / Math.max(1, rect.width) };
        setView();
      });
      const item = document.createElement('li');
      item.append(button); matches.append(item);
    });
    if (!shown) matches.append(text('li', 'No matching nodes.', 'empty'));
    $('visible-count').textContent = `${visible.filter(Boolean).length} of ${nodes.length} nodes · ${query ? 'Global search' : fullOverview ? 'Full overview' : 'Virtual host focus'}`;
    $('matches-note').textContent = shown > 200 ? 'First 200 matches; narrow your search.' : 'Select a result to focus it on the graph.';
    if (selected !== null && !visible[selected]) clearSelection();
  };
  search.addEventListener('input', applyFilters);
  kindFilter.addEventListener('change', applyFilters);
  unresolved.addEventListener('change', applyFilters);
  hostView.addEventListener('change', () => { search.value = ''; clearSelection(); applyFilters(); });
  $('clear-filters').addEventListener('click', () => { search.value = ''; kindFilter.value = ''; unresolved.checked = false; applyFilters(); });
  $('reset-selection').addEventListener('click', clearSelection);
  $('zoom-in').addEventListener('click', () => zoom(0.8));
  $('zoom-out').addEventListener('click', () => zoom(1.25));
  $('fit').addEventListener('click', () => { viewMode = 'fit'; view = { ...base }; setView(); });
  $('readable').addEventListener('click', showReadable);
  new ResizeObserver(() => { if (viewMode === 'readable') showReadable(); }).observe(svg);
  svg.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.88 : 1.14, point(event)); }, { passive: false });
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { matrix: svg.getScreenCTM().inverse(), start: point(event), view: { ...view }, node: event.target.closest('[data-node]'), moved: false, x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3) drag.moved = true;
    if (!drag.moved) return;
    viewMode = 'manual';
    const current = point(event, drag.matrix);
    view = { ...drag.view, x: drag.view.x - (current.x - drag.start.x), y: drag.view.y - (current.y - drag.start.y) };
    setView();
  });
  svg.addEventListener('pointerup', () => {
    if (drag && !drag.moved && drag.node) select(Number(drag.node.dataset.node));
    drag = null;
  });
  svg.addEventListener('pointercancel', () => { drag = null; });
  nodes.forEach((node, index) => {
    node.setAttribute('role', 'button');
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
