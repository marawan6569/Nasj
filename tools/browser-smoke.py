#!/usr/bin/env python3
"""Exercise generated reports from file:// with the browser offline. No server."""
from pathlib import Path
import argparse
import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from playwright.sync_api import expect, sync_playwright

repo = Path(__file__).resolve().parent.parent
binary = repo / "target/debug/nasj"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--screenshots", type=Path, help="Optional directory for reviewed desktop/mobile screenshots")
arguments = parser.parse_args()


def generate(config, output, format):
    subprocess.run([str(binary), "map", "--config", str(config), "--format", format, "-o", str(output)], check=True)


with tempfile.TemporaryDirectory(prefix="nasj-browser-") as temporary, sync_playwright() as playwright:
    temporary = Path(temporary)
    screenshots = arguments.screenshots or temporary
    screenshots.mkdir(parents=True, exist_ok=True)
    report = temporary / "report.html"
    svg_report = temporary / "report.svg"
    config = repo / "fixtures/nginx/topology/nginx.conf"
    generate(config, report, "html")
    generate(config, svg_report, "svg")
    root = ET.parse(svg_report).getroot()
    assert root.tag == "{http://www.w3.org/2000/svg}svg"
    assert len(root.findall(".//{http://www.w3.org/2000/svg}g[@class='node']")) > 10
    browser = playwright.chromium.launch()
    context = browser.new_context(offline=True, service_workers="block", viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    errors, requests, dialogs = [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("request", lambda request: requests.append(request.url))
    page.on("dialog", lambda dialog: (dialogs.append(dialog.message), dialog.dismiss()))
    page.goto(report.as_uri())
    expect(page.locator("#node-count")).not_to_have_text("—")
    assert int(page.locator("#node-count").inner_text()) > 10
    assert page.locator("#sources li").count() == 5
    expect(page.locator("#review-warnings")).to_contain_text("2 analysis warnings")
    graph = page.locator("#topology-graph")
    initial_view = graph.get_attribute("viewBox")
    page.locator("#search").fill("location /api")
    expect(page.locator("#matches button")).to_have_count(1)
    page.locator("#matches button").click()
    expect(page.locator("#selection")).to_be_visible()
    expect(page.locator("#node-title")).to_have_text("location /api")
    expect(page.locator("#node-fields")).to_contain_text("snippets/locations.conf:1")
    expect(page.locator("#relationships")).to_contain_text("configured")
    page.locator("#clear-filters").click()
    page.locator("#kind-filter").select_option("domain")
    assert page.locator(".node:not([hidden])").count() == 2
    page.locator("#clear-filters").click()
    page.locator("#unresolved-only").check()
    assert page.locator(".node:not([hidden])").count() == 2
    page.locator("#clear-filters").click()
    page.locator("#fit").click()
    assert graph.get_attribute("viewBox") == initial_view
    page.locator("#zoom-in").click()
    assert float(graph.get_attribute("viewBox").split()[2]) < float(initial_view.split()[2])
    page.locator("#zoom-out").click()
    page.locator("#fit").click()
    bounds = graph.bounding_box()
    x, y = bounds["x"] + bounds["width"] * .6, bounds["y"] + bounds["height"] * .7
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + 80, y + 40, steps=5)
    page.mouse.up()
    assert graph.get_attribute("viewBox") != initial_view
    page.locator("#fit").click()
    page.mouse.move(x, y)
    page.mouse.wheel(0, -120)
    expect(graph).not_to_have_attribute("viewBox", initial_view)
    first = page.locator(".node").first
    page.locator("#fit").click()
    first.click()
    expect(page.locator("#selection")).to_be_visible()
    page.locator("#reset-selection").click()
    first.focus()
    page.keyboard.press("Enter")
    expect(page.locator("#selection")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.locator("#selection")).to_be_hidden()
    theme = page.locator("html").get_attribute("data-theme")
    page.locator("#theme").click()
    assert page.locator("html").get_attribute("data-theme") != theme
    page.locator("#fit").click()
    page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert graph.bounding_box()["height"] >= 400
    page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)

    hostile = temporary / "hostile.html"
    generate(repo / "fixtures/nginx/hostile.conf", hostile, "html")
    page.goto(hostile.as_uri())
    expect(page.locator("#node-count")).not_to_have_text("—")
    assert page.locator("script").count() == 2
    assert page.locator("img,iframe,object").count() == 0
    assert page.evaluate("window.nasjInjected === undefined")
    payload = json.loads(page.locator("#topology-data").text_content())
    assert any("</script>" in node["label"] for node in payload["nodes"])
    page.locator("#search").fill("</script>")
    assert page.locator("#matches button").count() > 0
    page.locator("#matches button").first.click()
    assert page.locator("#node-title").inner_text().startswith("</script>")

    odd_config = temporary / "odd.conf"
    odd_config.write_text('http { server { listen 80; location / { root "/srv/\uffff"; } } }')
    odd_svg = temporary / "odd.svg"
    generate(odd_config, odd_svg, "svg")
    ET.parse(odd_svg)

    empty_config = temporary / "empty.conf"
    empty_config.write_text("events {}")
    empty = temporary / "empty.html"
    generate(empty_config, empty, "html")
    page.goto(empty.as_uri())
    expect(page.locator("#node-count")).to_have_text("0")
    expect(page.locator("#matches")).to_contain_text("No matching nodes")
    assert not errors, errors
    assert not dialogs, dialogs
    assert all(url.startswith("file:") for url in requests), requests
    context.close()
    browser.close()
    print("PASS: offline file reports; XML; zoom/pan; selection; search/filters; source/evidence; themes; mobile; hostile/empty data; no external requests or browser errors")
