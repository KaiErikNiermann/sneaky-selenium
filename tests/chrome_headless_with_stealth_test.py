"""Tests for Chrome headless with stealthenium applied."""

from __future__ import annotations

import base64
import math
import os
import time
from typing import TYPE_CHECKING

import pytest
from selenium import webdriver

from sneaky_selenium import stealth

if TYPE_CHECKING:
    from collections.abc import Generator


def _is_png(data: bytes) -> bool:
    """Check if data is a PNG image by checking magic bytes."""
    return data[:8] == b'\x89PNG\r\n\x1a\n'


@pytest.fixture
def browser_data() -> Generator[tuple[str, dict[str, str]], None, None]:
    """Create a headless Chrome browser with stealth applied."""
    options = webdriver.ChromeOptions()
    options.add_argument("start-maximized")
    options.add_argument("--headless")

    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    driver = webdriver.Chrome(options=options)

    stealth(
        driver,
        languages=["en-US", "en"],
        vendor="Google Inc.",
        platform="Win32",
        webgl_vendor="Intel Inc.",
        renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
    )

    path = str(os.getcwd()).replace("\\", "/") + "/tests/static/test.html"
    url = "file:///" + path if os.name == "nt" else "file://" + path
    driver.get(url)
    time.sleep(10)

    metrics = driver.execute_cdp_cmd("Page.getLayoutMetrics", {})
    width = math.ceil(metrics["contentSize"]["width"])
    height = math.ceil(metrics["contentSize"]["height"])
    screen_orientation = {"angle": 0, "type": "portraitPrimary"}
    driver.execute_cdp_cmd(
        "Emulation.setDeviceMetricsOverride",
        {
            "mobile": False,
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "screenOrientation": screen_orientation,
        },
    )
    clip = {"x": 0, "y": 0, "width": width, "height": height, "scale": 1}
    opt: dict[str, object] = {"format": "png", "clip": clip}

    result = driver.execute_cdp_cmd("Page.captureScreenshot", opt)
    html = driver.page_source
    driver.quit()
    yield html, result


def test_stealth_png(browser_data: tuple[str, dict[str, str]]) -> None:
    """Test that screenshot is a valid PNG."""
    _html, result = browser_data
    buffer = base64.b64decode(result.get("data", ""))

    assert _is_png(buffer), "Screenshot should be a valid PNG image"


def test_stealth_failed(browser_data: tuple[str, dict[str, str]]) -> None:
    """Test that no elements have failed-text class."""
    html, _result = browser_data
    assert "failed-text" not in html and "passed" in html


def test_stealth_warn(browser_data: tuple[str, dict[str, str]]) -> None:
    """Test that no elements have warn class."""
    html, _result = browser_data
    assert "warn" not in html and "passed" in html
