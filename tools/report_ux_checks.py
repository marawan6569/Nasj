"""Synthetic report UX regressions shared by offline browser engines."""
import json
from playwright.sync_api import expect


def visible_indices(page):
    return set(page.locator('.node:not([hidden])').evaluate_all('(nodes) => nodes.map(node => Number(node.dataset.node))'))


def assert_in_frame(page, indices):
    assert page.evaluate('''indices => {
      const svg = document.getElementById('topology-graph'), view = svg.viewBox.baseVal;
      return indices.every(i => {
        const matrix = svg.querySelector(`[data-node="${i}"]`).transform.baseVal.consolidate().matrix;
        return matrix.e >= view.x - .1 && matrix.f >= view.y - .1 && matrix.e + 260 <= view.x + view.width + .1 && matrix.f + 88 <= view.y + view.height + .1;
      });
    }''', list(indices)), indices


def assert_path(page, payload, indices):
    assert set(indices) <= visible_indices(page), indices
    for start, end in zip(indices, indices[1:]):
        edges = [i for i, edge in enumerate(payload['edges']) if edge['from'] == payload['nodes'][start]['id'] and edge['to'] == payload['nodes'][end]['id']]
        assert edges, (start, end)
        assert all(page.locator(f'.edge[data-edge="{i}"]').get_attribute('hidden') is None for i in edges)


def check_search_context(page, payload, screenshots):
    def find(kind, label):
        return next(i for i, n in enumerate(payload['nodes']) if n['kind'] == kind and n['label'] == label)

    portal = find('server', 'portal.example.test · HTTPS :443')
    api = find('server', 'api.example.test · HTTPS :443')
    portal_http = find('server', 'portal.example.test · HTTP :80')
    api_http = find('server', 'api.example.test · HTTP :80')
    assert page.locator('#vhost-view').input_value() == str(portal)
    target = find('target', '127.0.0.1:8100')
    upstream = find('upstream', 'portal_app')
    location = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'location' and any(e['from'] == payload['nodes'][i]['id'] and e['to'] == payload['nodes'][upstream]['id'] for e in payload['edges']))
    domain = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'domain' and any(e['from'] == n['id'] and e['to'] == payload['nodes'][portal]['id'] for e in payload['edges']))
    page.locator('#search').fill('127.0.0.1:8100')
    expect(page.locator('#matches button')).to_have_count(1)
    assert_path(page, payload, [domain, portal, location, upstream, target])
    assert not ({api, api_http, portal_http} & visible_indices(page))
    expect(page.locator('.node.search-match:not([hidden])')).to_have_count(1)
    expect(page.locator('.node.search-context:not([hidden])')).to_have_count(5)  # Two declared domain aliases plus host/location/upstream.
    assert_in_frame(page, [target])
    assert page.locator(f'.node[data-node="{target}"] .node-card').bounding_box()['width'] >= 219
    page.screenshot(path=str(screenshots / 'backend-search.png'), full_page=True)
    # Type/unresolved filters select direct matches without removing their paths.
    page.locator('#kind-filter').select_option('target')
    assert_path(page, payload, [domain, portal, location, upstream, target])
    page.locator('#matches button').click()
    assert_in_frame(page, [target])
    page.locator(f'.node[data-node="{target}"]').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#node-title')).to_have_text('127.0.0.1:8100')
    page.locator('#clear-filters').click()

    # Both configured callers of a shared upstream remain; redirect-only siblings
    # sharing a domain are not incoming routes to this backend.
    page.locator('#search').fill('127.0.0.1:8200')
    shared = find('target', '127.0.0.1:8200')
    assert {portal, api, shared} <= visible_indices(page)
    assert not ({portal_http, api_http} & visible_indices(page))
    expect(page.locator('#matches button')).to_have_count(1)
    assert page.locator('.edge:not([hidden])').count() >= 7
    page.locator('#search').fill('127.0.0.1:8')
    expect(page.locator('.node.search-match:not([hidden])')).to_have_count(3)
    assert {portal, api} <= visible_indices(page)

    page.locator('#search').fill('portal.example.test')
    assert {portal, portal_http} <= visible_indices(page)
    assert not ({api, api_http} & visible_indices(page))
    page.locator('#kind-filter').select_option('domain')
    assert all(payload['nodes'][int(i)]['kind'] == 'domain' for i in page.locator('.node.search-match').evaluate_all('(nodes) => nodes.map(n => n.dataset.node)'))
    assert {portal, portal_http} <= visible_indices(page)
    page.locator('#clear-filters').click()

    page.locator('#search').fill('/srv/example-assets/')
    static = find('static_root', '/srv/example-assets/')
    assets = find('location', 'location /assets/')
    assert_path(page, payload, [domain, portal, assets, static])
    assert not ({api, api_http, portal_http} & visible_indices(page))
    expect(page.locator('.node.search-match:not([hidden])')).to_have_count(1)

    page.locator('#search').fill('301 →')
    redirect = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'redirect' and n['attributes']['status'] == '301')
    guard = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'condition' and n['condition']['value'] == 'portal.example.test')
    fallback = next(i for i, n in enumerate(payload['nodes']) if any(e['from'] == payload['nodes'][guard]['id'] and e['to'] == n['id'] and e['kind'] == 'when_false' for e in payload['edges']))
    assert_path(page, payload, [portal_http, guard, redirect])
    assert_path(page, payload, [guard, fallback])
    assert not ({portal, api, api_http} & visible_indices(page))
    assert_in_frame(page, [guard, redirect, fallback])
    page.locator('#unresolved-only').check()
    assert_path(page, payload, [portal_http, guard, redirect])
    assert page.locator('#matches button').count() == 1
    page.screenshot(path=str(screenshots / 'conditional-search.png'), full_page=True)
    page.locator('#clear-filters').click()
    page.locator('#vhost-view').select_option(str(portal_http))
    assert_in_frame(page, [guard, redirect, fallback])
    page.screenshot(path=str(screenshots / 'conditional-initial.png'), full_page=True)
    page.locator('#vhost-view').select_option(str(portal))


def check_mobile(page, payload, screenshots, context, engine):
    portal_http = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'server' and n['label'] == 'portal.example.test · HTTP :80')
    for width, height in [(390, 844), (768, 1024)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.locator('#vhost-view').select_option(str(portal_http))
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.locator('#search').fill('301 →')
        page.locator('#kind-filter').select_option('redirect')
        page.locator('#matches button').click()
        selected = int(page.locator('.node.selected').get_attribute('data-node'))
        assert_in_frame(page, [selected])
        page.locator('#inspect-selection').click()
        expect(page.locator('#selection')).to_be_in_viewport()
        expect(page.locator('#node-fields')).to_contain_text('https://$host$request_uri')
        page.locator('#show-selection').click()
        expect(page.locator('#topology-graph')).to_be_in_viewport()
        assert_in_frame(page, [selected])
        graph = page.locator('#topology-graph')
        assert page.locator('.graph-tools').bounding_box()['y'] + page.locator('.graph-tools').bounding_box()['height'] <= graph.bounding_box()['y'] + 1
        assert page.locator('#vhost-view').bounding_box()['height'] >= 44
        assert page.locator('#zoom-in').bounding_box()['height'] >= 44
        before = graph.get_attribute('viewBox')
        rect = graph.bounding_box()
        x, y = rect['x'] + rect['width'] * .5, rect['y'] + rect['height'] * .5
        # Real browser touch events (rather than mouse drag) in Chromium. Other
        # engines still run controls/selection/framing/overflow offline checks.
        if engine == 'chromium':
            cdp = context.new_cdp_session(page)
            cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 2})
            def touch(kind, points):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': px, 'y': py, 'id': i} for i, (px, py) in enumerate(points)]})
            touch('touchStart', [(x, y)])
            touch('touchMove', [(x + 50, y + 30)])
            touch('touchEnd', [])
            expect(graph).not_to_have_attribute('viewBox', before)
            page.locator('#readable').click()
            before_width = float(graph.get_attribute('viewBox').split()[2])
            touch('touchStart', [(x - 35, y), (x + 35, y)])
            touch('touchMove', [(x - 80, y), (x + 80, y)])
            touch('touchEnd', [])
            assert float(graph.get_attribute('viewBox').split()[2]) < before_width * .8
            # Gesture cancellation must release state; later taps still select.
            touch('touchStart', [(x, y)])
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
            page.locator('#readable').click()
            page.locator('#reset-selection').click()
            graph.scroll_into_view_if_needed()
            card = page.locator(f'.node[data-node="{selected}"] .node-card').bounding_box()
            tx, ty = card['x'] + card['width'] / 2, card['y'] + card['height'] / 2
            touch('touchStart', [(tx, ty)])
            touch('touchEnd', [])
            expect(page.locator('.node.selected')).to_have_attribute('data-node', str(selected))
            cdp.detach()
        page.locator('#readable').click()
        page.screenshot(path=str(screenshots / f'ux-{width}.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        expect(page.locator('#frame-note')).not_to_be_empty()
        page.locator('#clear-filters').click()
    page.set_viewport_size({'width': 1440, 'height': 900})


def check_large_search(page, payload):
    page.locator('#search').fill('host99.example.test')
    shown = visible_indices(page)
    assert [payload['nodes'][i]['label'] for i in shown if payload['nodes'][i]['kind'] == 'server'] == ['host99.example.test · HTTP :9099']
    page.locator('#search').fill('127.0.0.1:8300')
    expect(page.locator('#matches button')).to_have_count(1)
    assert page.locator('.node:not([hidden])').count() <= 200
    expect(page.locator('#search-limit')).to_be_visible()
    expect(page.locator('#matches-note')).to_contain_text('Context may be incomplete')
    shown = visible_indices(page)
    assert any(payload['nodes'][i]['kind'] == 'server' for i in shown)
    assert any(payload['nodes'][i]['kind'] == 'domain' for i in shown)
    assert page.locator('.edge:not([hidden])').count() > 5
    target = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'target')
    upstream = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'upstream')
    server = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'server')
    domain = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'domain')
    location = next(i for i, n in enumerate(payload['nodes']) if n['kind'] == 'location')
    assert_path(page, payload, [domain, server, location, upstream, target])
    page.locator('#search').fill('host')
    expect(page.locator('#matches button')).to_have_count(40)
    assert page.locator('.node.search-match').count() == 40
    assert page.locator('.node:not([hidden])').count() <= 200
    page.locator('#clear-filters').click()


def check_selection_policy(page, repo, temporary, generate):
    report = temporary / 'selection.html'
    generate(repo / 'fixtures/nginx/ux-selection.conf', report, 'html')
    page.goto(report.as_uri())
    expect(page.locator('#node-count')).not_to_have_text('—')
    payload = json.loads(page.locator('#topology-data').text_content())
    selected = payload['nodes'][int(page.locator('#vhost-view').input_value())]
    assert selected['label'] == 'app.example.test · HTTP :80'
    page.locator('#search').fill('127.0.0.1:8999')
    expect(page.locator('#matches button')).to_have_count(1)
    assert page.locator('.node:not([hidden])').count() == 2
    assert page.locator('.edge:not([hidden])').count() == 1
    assert all(payload['nodes'][i]['kind'] in ['upstream', 'target'] for i in visible_indices(page))
    page.locator('#search').fill('no-match-example-unique')
    expect(page.locator('#matches')).to_contain_text('No matching nodes')
    assert not visible_indices(page)
    # TLS is read from the declared protocol, including nonstandard ports. A
    # configured HTTPS application takes priority over a larger HTTP application.
    config = temporary / 'secure-selection.conf'
    config.write_text('http { server { listen 80; server_name broad.example.test; location /a { root /srv/example-a; } location /b { root /srv/example-b; } } server { listen 8443 ssl; server_name secure.example.test; location / { proxy_pass http://127.0.0.1:8111; } } }')
    report = temporary / 'secure-selection.html'
    generate(config, report, 'html')
    page.goto(report.as_uri())
    expect(page.locator('#node-count')).not_to_have_text('—')
    payload = json.loads(page.locator('#topology-data').text_content())
    assert payload['nodes'][int(page.locator('#vhost-view').input_value())]['label'] == 'secure.example.test · HTTPS :8443'
    config = temporary / 'tie-selection.conf'
    config.write_text('http { server { listen 8080; server_name z.example.test; return 204; } server { listen 8080; server_name a.example.test; return 204; } }')
    report = temporary / 'tie-selection.html'
    generate(config, report, 'html')
    page.goto(report.as_uri())
    expect(page.locator('#node-count')).not_to_have_text('—')
    payload = json.loads(page.locator('#topology-data').text_content())
    selected = page.locator('#vhost-view').input_value()
    assert payload['nodes'][int(selected)]['label'] == 'a.example.test · HTTP :8080'
    page.reload()
    expect(page.locator('#vhost-view')).to_have_value(selected)

    # Long but finite nested input exercises the explicit hop limit.
    config = temporary / 'deep-search.conf'
    config.write_text('http { server { listen 80; server_name deep.example.test; ' + ''.join(f'location /{"x/" * (i+1)} {{ ' for i in range(30)) + 'proxy_pass http://127.0.0.1:8998;' + '}' * 32)
    report = temporary / 'deep-search.html'
    generate(config, report, 'html')
    page.goto(report.as_uri())
    expect(page.locator('#node-count')).not_to_have_text('—')
    page.locator('#search').fill('127.0.0.1:8998')
    expect(page.locator('#search-limit')).to_be_visible()
    assert page.locator('.node:not([hidden])').count() <= 25
