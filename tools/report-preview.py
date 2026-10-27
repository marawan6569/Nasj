#!/usr/bin/env python3
"""Capture a public-safe README preview from synthetic repository fixtures only."""
import argparse
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright

repo = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=repo / 'docs/images/report-preview.png')
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='nasj-public-preview-') as folder, sync_playwright() as p:
    report = Path(folder) / 'report.html'
    subprocess.run([str(repo / 'target/debug/nasj'), 'map', '--config', str(repo / 'fixtures/nginx/multi-vhost.conf'), '--strict', '--format', 'html', '-o', str(report)], check=True)
    # Normalize development checkout prefixes in the example only. Mapping and
    # actual report provenance remain unchanged in the CLI/exporter.
    report.write_text(report.read_text().replace(str(repo) + '/', ''))
    browser = p.chromium.launch()
    context = browser.new_context(offline=True, viewport={'width': 1600, 'height': 1000})
    page = context.new_page()
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('request', lambda request: requests.append(request.url))
    page.goto(report.as_uri())
    page.wait_for_function('document.querySelectorAll("img.brand-logo").length === 2 && Array.from(document.querySelectorAll("img.brand-logo")).every(image => image.complete && image.naturalWidth > 0)')
    if page.locator('html').get_attribute('data-theme') != 'light':
        page.locator('#theme').click()
    page.locator('#search').fill('127.0.0.1:8100')
    page.locator('#matches button').click()
    page.locator('#fit').click()
    page.locator('h1').click()
    assert str(repo) not in page.locator('body').inner_text()
    assert page.locator('.node:not([hidden])').count() == 6
    assert page.locator('.edge:not([hidden])').count() == 5
    assert not errors, errors
    assert all(url.startswith('file:') for url in requests), requests
    args.output.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(args.output), full_page=False)
    browser.close()
print('PASS: public synthetic preview, normalized source paths, embedded branding, zero external requests/errors')
