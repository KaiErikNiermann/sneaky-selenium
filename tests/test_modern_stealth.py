"""Modern stealth tests for 2026.

Tests for current bot detection vectors including:
- navigator.webdriver
- User-Agent Client Hints (UA-CH)
- Hardware fingerprinting
- WebGL fingerprinting
- Various Chrome API presence checks

NOTE: Some tests are marked with @pytest.mark.https_only because certain
browser APIs (userAgentData, deviceMemory) only work on secure contexts
(HTTPS/localhost), not on data: URLs or about:blank.
"""

from __future__ import annotations

import http.server
import socketserver
import threading
from typing import TYPE_CHECKING, Any

import pytest
from selenium import webdriver

from sneaky_selenium import stealth

if TYPE_CHECKING:
    from collections.abc import Generator


# Custom marker for HTTPS-only tests
def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "https_only: marks tests as requiring HTTPS/secure context"
    )


class SimpleHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """Silent HTTP handler that serves a minimal HTML page."""

    def do_GET(self) -> None:
        """Serve a minimal HTML page for any request."""
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        html = b"<!DOCTYPE html><html><body><h1>Test Page</h1></body></html>"
        self.wfile.write(html)

    def log_message(self, format: str, *args: object) -> None:
        """Suppress log messages."""
        pass


@pytest.fixture(scope="module")
def local_server() -> Generator[str, None, None]:
    """Start a local HTTP server for secure context testing."""
    # Use port 0 to get a random available port
    handler = SimpleHTTPHandler
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        yield f"http://127.0.0.1:{port}"
        httpd.shutdown()


@pytest.fixture(scope="module")
def stealth_driver() -> Generator[webdriver.Chrome, None, None]:
    """Create a headless Chrome browser with stealth applied.

    Uses data: URL which is fast but has limitations:
    - No userAgentData (secure context only)
    - No deviceMemory (secure context only)
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")  # New headless mode
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
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
        device_memory=8,
        hardware_concurrency=8,
        fix_hairline=True,
        run_on_insecure_origins=True,
    )

    # Navigate to a data URL to trigger the scripts
    driver.get("data:text/html,<!DOCTYPE html><html><body><h1>Test</h1></body></html>")

    yield driver
    driver.quit()


@pytest.fixture(scope="module")
def stealth_driver_http(
    local_server: str,
) -> Generator[webdriver.Chrome, None, None]:
    """Create a headless Chrome with stealth for HTTP context.

    Uses localhost HTTP server which supports secure-context APIs.
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
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
        device_memory=8,
        hardware_concurrency=8,
        fix_hairline=True,
    )

    # Navigate to localhost which is treated as secure context
    driver.get(local_server)

    yield driver
    driver.quit()


@pytest.fixture(scope="module")
def vanilla_driver() -> Generator[webdriver.Chrome, None, None]:
    """Create a headless Chrome browser WITHOUT stealth for comparison."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=options)
    driver.get("data:text/html,<h1>Vanilla</h1>")
    yield driver
    driver.quit()


def execute_js(driver: webdriver.Chrome, script: str) -> Any:
    """Execute JavaScript and return result."""
    return driver.execute_script(f"return {script}")


class TestNavigatorWebdriver:
    """Tests for navigator.webdriver evasion - the most critical check."""

    def test_webdriver_is_false(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.webdriver should be false or undefined."""
        result = execute_js(stealth_driver, "navigator.webdriver")
        assert result in (False, None), f"navigator.webdriver should be false, got {result}"

    def test_webdriver_typeof(self, stealth_driver: webdriver.Chrome) -> None:
        """typeof navigator.webdriver should be boolean or undefined."""
        result = execute_js(stealth_driver, "typeof navigator.webdriver")
        assert result in ("boolean", "undefined"), f"Got unexpected type: {result}"

    def test_vanilla_has_webdriver_true(self, vanilla_driver: webdriver.Chrome) -> None:
        """Verify vanilla driver HAS webdriver=true (sanity check)."""
        result = execute_js(vanilla_driver, "navigator.webdriver")
        # In headless mode, this should be true
        assert result is True, "Vanilla driver should have webdriver=true"


class TestUserAgentClientHints:
    """Tests for User-Agent Client Hints (UA-CH) evasion.

    NOTE: These tests use stealth_driver_http because userAgentData
    is only available in secure contexts (HTTPS/localhost).
    """

    def test_user_agent_data_exists(
        self, stealth_driver_http: webdriver.Chrome
    ) -> None:
        """navigator.userAgentData should exist."""
        result = execute_js(stealth_driver_http, "'userAgentData' in navigator")
        assert result is True, "userAgentData should exist in secure context"

    def test_user_agent_data_brands(
        self, stealth_driver_http: webdriver.Chrome
    ) -> None:
        """userAgentData.brands should be an array with entries."""
        result = execute_js(
            stealth_driver_http, "navigator.userAgentData?.brands?.length > 0"
        )
        assert result is True, "brands should have entries"

    def test_user_agent_data_platform(
        self, stealth_driver_http: webdriver.Chrome
    ) -> None:
        """userAgentData.platform should be set."""
        result = execute_js(stealth_driver_http, "navigator.userAgentData?.platform")
        assert result is not None, "platform should be set"
        assert len(result) > 0, "platform should not be empty"

    def test_user_agent_data_mobile(
        self, stealth_driver_http: webdriver.Chrome
    ) -> None:
        """userAgentData.mobile should be boolean."""
        result = execute_js(
            stealth_driver_http, "typeof navigator.userAgentData?.mobile"
        )
        assert result == "boolean", "mobile should be boolean"

    def test_user_agent_data_works_on_data_url(
        self, stealth_driver: webdriver.Chrome
    ) -> None:
        """userAgentData should work even on data: URLs with our stealth injection."""
        result = execute_js(stealth_driver, "'userAgentData' in navigator")
        assert result is True, "userAgentData should exist with stealth on data: URLs"


class TestHardwareFingerprinting:
    """Tests for hardware fingerprint evasion.

    NOTE: deviceMemory tests use HTTP fixture because it requires secure context.
    hardwareConcurrency works on all contexts.
    """

    def test_device_memory_http(self, stealth_driver_http: webdriver.Chrome) -> None:
        """navigator.deviceMemory should be a reasonable value (secure context)."""
        result = execute_js(stealth_driver_http, "navigator.deviceMemory")
        assert result is not None, "deviceMemory should exist in secure context"
        assert result >= 2, f"deviceMemory should be >= 2, got {result}"

    def test_device_memory_on_data_url(
        self, stealth_driver: webdriver.Chrome
    ) -> None:
        """deviceMemory should work on data: URLs with our stealth injection."""
        result = execute_js(stealth_driver, "navigator.deviceMemory")
        # Our stealth injects deviceMemory even on data: URLs
        assert result is not None, "deviceMemory should be defined with stealth"
        assert result >= 2, f"deviceMemory should be >= 2, got {result}"

    def test_hardware_concurrency(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.hardwareConcurrency should be a reasonable value."""
        result = execute_js(stealth_driver, "navigator.hardwareConcurrency")
        assert result is not None, "hardwareConcurrency should exist"
        assert result >= 2, f"hardwareConcurrency should be >= 2, got {result}"


class TestChromeAPIs:
    """Tests for Chrome API presence evasion.

    NOTE: chrome.runtime is only available in extensions and secure contexts.
    Our stealth adds a mock object when run_on_insecure_origins=True.
    """

    def test_chrome_object_exists(self, stealth_driver: webdriver.Chrome) -> None:
        """window.chrome should exist."""
        result = execute_js(stealth_driver, "typeof window.chrome")
        assert result == "object", f"chrome should be object, got {result}"

    def test_chrome_runtime_mock_on_data_url(
        self, stealth_driver: webdriver.Chrome
    ) -> None:
        """chrome.runtime should be mocked on data: URLs with run_on_insecure_origins."""
        # Our stealth_driver uses run_on_insecure_origins=True
        result = execute_js(stealth_driver, "typeof window.chrome?.runtime")
        assert result == "object", f"chrome.runtime should exist on data: URL, got {result}"

    def test_chrome_app_exists(self, stealth_driver: webdriver.Chrome) -> None:
        """chrome.app should exist."""
        result = execute_js(stealth_driver, "typeof window.chrome?.app")
        assert result == "object", f"chrome.app should exist, got {result}"


class TestNavigatorProperties:
    """Tests for navigator property evasions."""

    def test_languages(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.languages should be set."""
        result = execute_js(stealth_driver, "navigator.languages")
        assert result is not None, "languages should exist"
        assert len(result) > 0, "languages should not be empty"

    def test_vendor(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.vendor should be 'Google Inc.'."""
        result = execute_js(stealth_driver, "navigator.vendor")
        assert result == "Google Inc.", f"vendor should be 'Google Inc.', got {result}"

    def test_plugins_length(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.plugins should have entries (PDF plugins)."""
        result = execute_js(stealth_driver, "navigator.plugins.length")
        assert result > 0, f"plugins.length should be > 0, got {result}"

    def test_plugins_is_plugin_array(self, stealth_driver: webdriver.Chrome) -> None:
        """navigator.plugins should be PluginArray type."""
        result = execute_js(
            stealth_driver, "Object.prototype.toString.call(navigator.plugins)"
        )
        assert "PluginArray" in result, f"Expected PluginArray, got {result}"


class TestWebGLFingerprinting:
    """Tests for WebGL fingerprint evasion."""

    def test_webgl_vendor(self, stealth_driver: webdriver.Chrome) -> None:
        """WebGL vendor should be spoofed."""
        script = """
        (function() {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (!gl) return null;
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (!ext) return null;
            return gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        })()
        """
        result = stealth_driver.execute_script(script)
        if result:  # WebGL may not be available in headless
            assert "Intel" in result, f"WebGL vendor should contain Intel, got {result}"

    def test_webgl_renderer(self, stealth_driver: webdriver.Chrome) -> None:
        """WebGL renderer should be spoofed."""
        script = """
        (function() {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (!gl) return null;
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (!ext) return null;
            return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        })()
        """
        result = stealth_driver.execute_script(script)
        if result:  # WebGL may not be available in headless
            assert "Intel" in result, f"WebGL renderer should contain Intel, got {result}"


class TestUserAgent:
    """Tests for User-Agent string evasion."""

    def test_no_headless_in_ua(self, stealth_driver: webdriver.Chrome) -> None:
        """User-Agent should not contain 'HeadlessChrome'."""
        result = execute_js(stealth_driver, "navigator.userAgent")
        assert "HeadlessChrome" not in result, f"UA contains HeadlessChrome: {result}"

    def test_user_agent_format(self, stealth_driver: webdriver.Chrome) -> None:
        """User-Agent should look like a normal Chrome UA."""
        result = execute_js(stealth_driver, "navigator.userAgent")
        assert "Chrome/" in result, f"UA should contain Chrome/: {result}"
        assert "Mozilla" in result, f"UA should contain Mozilla: {result}"


class TestPermissions:
    """Tests for permissions API evasion."""

    def test_notification_permission_query(
        self, stealth_driver_http: webdriver.Chrome
    ) -> None:
        """Permissions query for notifications should work (HTTP context)."""
        # Use execute_async_script for Promise-based code
        script = """
        const callback = arguments[arguments.length - 1];
        navigator.permissions.query({name: 'notifications'})
            .then(result => callback(result.state))
            .catch(e => callback('error: ' + e.message));
        """
        result = stealth_driver_http.execute_async_script(script)
        # Should return a valid state, not throw an error
        # Note: 'default' is also valid (same as 'prompt')
        assert result in (
            "granted",
            "denied",
            "prompt",
            "default",
        ), f"Unexpected permission state: {result}"


class TestMediaCodecs:
    """Tests for media codec evasion."""

    def test_can_play_type(self, stealth_driver_http: webdriver.Chrome) -> None:
        """HTMLMediaElement.canPlayType should work (HTTP context for full support)."""
        script = """
        var video = document.createElement('video');
        return video.canPlayType('video/mp4; codecs="avc1.42E01E"');
        """
        result = stealth_driver_http.execute_script(script)
        assert result in ("probably", "maybe", ""), f"Unexpected canPlayType: {result}"


class TestWindowProperties:
    """Tests for window property evasions."""

    def test_outer_dimensions(self, stealth_driver: webdriver.Chrome) -> None:
        """window.outerWidth and outerHeight should be reasonable."""
        width = execute_js(stealth_driver, "window.outerWidth")
        height = execute_js(stealth_driver, "window.outerHeight")
        assert width > 0, f"outerWidth should be > 0, got {width}"
        assert height > 0, f"outerHeight should be > 0, got {height}"
