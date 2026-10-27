"""Validate only the reviewed embedded PNGs, including portable/no-JS reports."""
from pathlib import Path
from playwright.sync_api import expect


def assert_only_brand_images(page):
    expect(page.locator('img')).to_have_count(2)
    expect(page.locator('img.brand-logo')).to_have_count(2)
    assert page.locator('iframe,object').count() == 0
    assert page.locator('img').evaluate_all('images => images.every(image => image.src.startsWith("data:image/png;base64,") && image.alt === "NASJ — نسج")')


def check_branding(browser, page, report, temporary, screenshots, errors, requests, dialogs):
    assert_only_brand_images(page)
    page.wait_for_function('Array.from(document.querySelectorAll("img.brand-logo")).every(image => image.complete && image.naturalWidth === 320 && image.naturalHeight === 166)')
    expected_sources = page.locator('img.brand-logo').evaluate_all('images => images.map(image => image.src)')
    assert len(set(expected_sources)) == 2
    favicon = page.locator('link[rel="icon"]').get_attribute('href')
    assert favicon.startswith('data:image/png;base64,')
    csp = page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content')
    assert 'img-src data:;' in csp
    assert "connect-src 'none';" in csp
    for width, height in [(1440, 900), (390, 844), (768, 1024)]:
        page.set_viewport_size({'width': width, 'height': height})
        for theme in ['light', 'dark']:
            if page.locator('html').get_attribute('data-theme') != theme:
                page.locator('#theme').click()
            expect(page.locator(f'.brand-{theme}')).to_be_visible()
            expect(page.locator('.brand-dark' if theme == 'light' else '.brand-light')).to_be_hidden()
            box = page.locator(f'.brand-{theme}').bounding_box()
            assert abs(box['width'] / box['height'] - 320 / 166) < .01
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            assert page.locator('header').bounding_box()['height'] < 160
            assert page.locator('header').bounding_box()['y'] + page.locator('header').bounding_box()['height'] <= page.locator('.toolbar').bounding_box()['y'] + 1
            if width in [1440, 390]:
                page.screenshot(path=str(screenshots / f'brand-{theme}-{width}.png'), full_page=True)
    # Only the single HTML file is copied; there is no adjacent assets directory.
    moved = temporary / 'moved-alone' / 'report.html'
    moved.parent.mkdir()
    moved.write_bytes(report.read_bytes())
    standalone_context = browser.new_context(offline=True, java_script_enabled=False, viewport={'width': 390, 'height': 844})
    static = standalone_context.new_page()
    static.on('pageerror', lambda error: errors.append(str(error)))
    static.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    static.on('request', lambda request: requests.append(request.url))
    static.on('dialog', lambda dialog: (dialogs.append(dialog.message), dialog.dismiss()))
    static.goto(moved.as_uri())
    assert_only_brand_images(static)
    assert static.locator('img.brand-light').evaluate('image => image.complete && image.naturalWidth === 320 && image.naturalHeight === 166')
    expect(static.locator('h1')).to_have_text('NASJ topology')
    expect(static.locator('noscript')).to_be_visible()
    assert static.locator('.node').count() > 10
    assert static.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    standalone_context.close()
    if page.locator('html').get_attribute('data-theme') != 'light':
        page.locator('#theme').click()
    page.set_viewport_size({'width': 1440, 'height': 1000})
