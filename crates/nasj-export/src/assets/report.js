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
  const base = { x: svg.viewBox.baseVal.x, y: svg.viewBox.baseVal.y, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height };
  let view = { ...base };
  let drag = null;
  let selected = null;
  const pretty = value => value.replaceAll('_', ' ');
  const source = value => value ? `${value.path}:${value.line}` : 'No source metadata';
  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  const setView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  const point = (event, matrix = svg.getScreenCTM().inverse()) => new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
  const zoom = (factor, anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) => {
    factor = Math.max(base.width / 30 / view.width, Math.min(factor, base.width * 20 / view.width));
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
    const visible = data.nodes.map(node => {
      const searchable = `${node.label} ${node.kind} ${source(node.source)} ${JSON.stringify(node.attributes)}`.toLocaleLowerCase();
      return (!query || searchable.includes(query)) && (!kindFilter.value || node.kind === kindFilter.value) && (!unresolved.checked || node.attributes.routing === 'unresolved');
    });
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
      button.append(text('small', `${pretty(node.kind)} · ${source(node.source)}`));
      button.addEventListener('click', () => {
        select(index);
        const transform = nodes[index].transform.baseVal.consolidate().matrix;
        view = { x: transform.e - 100, y: transform.f - 100, width: 660, height: 320 };
        setView();
      });
      const item = document.createElement('li');
      item.append(button); matches.append(item);
    });
    if (!shown) matches.append(text('li', 'No matching nodes.', 'empty'));
    $('visible-count').textContent = `${visible.filter(Boolean).length} of ${nodes.length} nodes visible`;
    $('matches-note').textContent = shown > 200 ? 'First 200 matches; narrow your search.' : 'Select a result to focus it on the graph.';
    if (selected !== null && !visible[selected]) clearSelection();
  };
  search.addEventListener('input', applyFilters);
  kindFilter.addEventListener('change', applyFilters);
  unresolved.addEventListener('change', applyFilters);
  $('clear-filters').addEventListener('click', () => { search.value = ''; kindFilter.value = ''; unresolved.checked = false; applyFilters(); });
  $('reset-selection').addEventListener('click', clearSelection);
  $('zoom-in').addEventListener('click', () => zoom(0.8));
  $('zoom-out').addEventListener('click', () => zoom(1.25));
  $('fit').addEventListener('click', () => { view = { ...base }; setView(); });
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
