"""Tor proxy integration for sneaky_selenium.

This module provides functionality to create Selenium WebDriver instances
that route traffic through the Tor network while applying stealth evasions.
"""

from __future__ import annotations

import logging
import socket
from typing import TYPE_CHECKING, Any, Literal

from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService

if TYPE_CHECKING:
    from selenium.webdriver.chrome.webdriver import WebDriver as ChromeWebDriver

__all__ = [
    "TOR_SOCKS5_HOST",
    "TOR_SOCKS5_PORT",
    "TOR_CONTROL_PORT",
    "is_tor_available",
    "check_tor_connection",
    "get_tor_exit_ip",
    "create_tor_driver",
    "stealth_with_tor",
    "TorDriverConfig",
]

logger = logging.getLogger(__name__)

# Default Tor SOCKS5 proxy settings
TOR_SOCKS5_HOST: Literal["127.0.0.1"] = "127.0.0.1"
TOR_SOCKS5_PORT: Literal[9050] = 9050
TOR_CONTROL_PORT: Literal[9051] = 9051


class TorDriverConfig:
    """Configuration for Tor-enabled WebDriver.

    Attributes:
        socks_host: Tor SOCKS5 proxy host address.
        socks_port: Tor SOCKS5 proxy port.
        chrome_binary: Path to Chrome/Chromium binary (optional).
        chromedriver_path: Path to chromedriver executable (optional).
        headless: Whether to run in headless mode.
        additional_options: Extra Chrome options to add.
    """

    def __init__(
        self,
        socks_host: str = TOR_SOCKS5_HOST,
        socks_port: int = TOR_SOCKS5_PORT,
        chrome_binary: str | None = None,
        chromedriver_path: str | None = None,
        headless: bool = False,
        additional_options: list[str] | None = None,
    ) -> None:
        self.socks_host = socks_host
        self.socks_port = socks_port
        self.chrome_binary = chrome_binary
        self.chromedriver_path = chromedriver_path
        self.headless = headless
        self.additional_options = additional_options or []


def is_tor_available(
    socks_host: str = TOR_SOCKS5_HOST,
    socks_port: int = TOR_SOCKS5_PORT,
) -> bool:
    """Check if Tor SOCKS5 proxy is available on the specified host/port.

    Args:
        socks_host: Tor SOCKS5 proxy host address.
        socks_port: Tor SOCKS5 proxy port.

    Returns:
        True if the proxy port is accepting connections.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((socks_host, socks_port))
        sock.close()
        return result == 0
    except OSError:
        return False


def check_tor_connection(
    socks_host: str = TOR_SOCKS5_HOST,
    socks_port: int = TOR_SOCKS5_PORT,
) -> dict[str, Any]:
    """Check if Tor connection is working by querying the Tor Project's API.

    This requires the 'requests' package with SOCKS support (requests[socks]).

    Args:
        socks_host: Tor SOCKS5 proxy host address.
        socks_port: Tor SOCKS5 proxy port.

    Returns:
        Dictionary with connection info:
        - connected: bool - True if connected through Tor
        - ip: str | None - The exit node IP address
        - is_tor: bool - Whether traffic is going through Tor
        - error: str | None - Error message if connection failed
    """
    result: dict[str, Any] = {
        "connected": False,
        "ip": None,
        "is_tor": False,
        "error": None,
    }

    try:
        import requests  # noqa: PLC0415
    except ImportError:
        result["error"] = "requests package not installed. Run: pip install requests[socks]"
        return result

    try:
        session = requests.Session()
        proxy_url = f"socks5h://{socks_host}:{socks_port}"
        session.proxies = {"http": proxy_url, "https": proxy_url}

        response = session.get(
            "https://check.torproject.org/api/ip",
            timeout=30,
        )
        response.raise_for_status()

        data = response.json()
        result["connected"] = True
        result["ip"] = data.get("IP")
        result["is_tor"] = data.get("IsTor", False)

    except requests.exceptions.ProxyError as e:
        result["error"] = f"Tor proxy not available. Is Tor running? Error: {e}"
    except requests.exceptions.ConnectionError as e:
        result["error"] = f"Connection error: {e}"
    except requests.exceptions.Timeout:
        result["error"] = "Request timed out"
    except Exception as e:  # noqa: BLE001
        result["error"] = f"Unexpected error: {e}"

    return result


def get_tor_exit_ip(
    socks_host: str = TOR_SOCKS5_HOST,
    socks_port: int = TOR_SOCKS5_PORT,
) -> str | None:
    """Get the current public IP address as seen through Tor.

    Args:
        socks_host: Tor SOCKS5 proxy host address.
        socks_port: Tor SOCKS5 proxy port.

    Returns:
        The exit node IP address, or None if connection failed.
    """
    result = check_tor_connection(socks_host, socks_port)
    return result.get("ip")


def _create_tor_chrome_options(
    config: TorDriverConfig | None = None,
) -> ChromeOptions:
    """Create ChromeOptions configured to use Tor SOCKS5 proxy.

    Args:
        config: Tor driver configuration. Uses defaults if None.

    Returns:
        ChromeOptions configured for Tor proxy.
    """
    config = config or TorDriverConfig()
    options = ChromeOptions()

    # Configure SOCKS5 proxy
    options.add_argument(f"--proxy-server=socks5://{config.socks_host}:{config.socks_port}")

    # DNS resolution through proxy (important for anonymity)
    options.add_argument("--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1")

    # Standard anti-detection options
    options.add_argument("start-maximized")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    # Disable WebRTC to prevent IP leaks
    options.add_argument("--disable-webrtc")

    # Additional privacy settings
    options.add_argument("--disable-features=WebRtcHideLocalIpsWithMdns")
    options.add_argument("--no-first-run")
    options.add_argument("--no-service-autorun")
    options.add_argument("--password-store=basic")

    if config.headless:
        options.add_argument("--headless=new")

    if config.chrome_binary:
        options.binary_location = config.chrome_binary

    for opt in config.additional_options:
        options.add_argument(opt)

    return options


def create_tor_driver(
    config: TorDriverConfig | None = None,
    verify_tor: bool = True,
) -> ChromeWebDriver:
    """Create a Chrome WebDriver configured to route traffic through Tor.

    This creates a WebDriver that uses the Tor SOCKS5 proxy. The driver
    is NOT yet stealthed - use stealth_with_tor() for a complete solution.

    Args:
        config: Tor driver configuration. Uses defaults if None.
        verify_tor: If True, verify Tor is available before creating driver.

    Returns:
        A Chrome WebDriver configured to use Tor proxy.

    Raises:
        RuntimeError: If Tor is not available and verify_tor is True.

    Example:
        >>> from sneaky_selenium.tor import create_tor_driver, TorDriverConfig
        >>> config = TorDriverConfig(headless=True)
        >>> driver = create_tor_driver(config)
        >>> driver.get("https://check.torproject.org")
    """
    config = config or TorDriverConfig()

    if verify_tor and not is_tor_available(config.socks_host, config.socks_port):
        msg = (
            f"Tor SOCKS5 proxy not available at {config.socks_host}:{config.socks_port}. "
            "Start Tor with: sudo systemctl start tor (Linux) or brew services start tor (macOS)"
        )
        raise RuntimeError(msg)

    options = _create_tor_chrome_options(config)

    service: ChromeService | None = None
    if config.chromedriver_path:
        service = ChromeService(config.chromedriver_path)

    if service:
        driver = webdriver.Chrome(options=options, service=service)
    else:
        driver = webdriver.Chrome(options=options)

    logger.debug("Created Tor-enabled Chrome WebDriver")
    return driver


def stealth_with_tor(
    config: TorDriverConfig | None = None,
    verify_tor: bool = True,
    # Stealth options
    user_agent: str | None = None,
    languages: list[str] | None = None,
    vendor: str = "Google Inc.",
    platform: str | None = None,
    webgl_vendor: str = "Intel Inc.",
    renderer: str = "Intel Iris OpenGL Engine",
    fix_hairline: bool = False,
    run_on_insecure_origins: bool = False,
    device_memory: int = 8,
    hardware_concurrency: int = 8,
    **kwargs: Any,
) -> ChromeWebDriver:
    """Create a stealthed Chrome WebDriver that routes traffic through Tor.

    This is the primary function for creating a fully anonymous and
    undetectable browser session. It combines Tor routing with all
    stealth evasions.

    Args:
        config: Tor driver configuration. Uses defaults if None.
        verify_tor: If True, verify Tor is available before creating driver.
        user_agent: Custom user agent string.
        languages: List of language codes for navigator.languages.
        vendor: The navigator.vendor value.
        platform: The platform to report (e.g., 'Win32', 'MacIntel').
        webgl_vendor: WebGL vendor to report.
        renderer: WebGL renderer to report.
        fix_hairline: Whether to apply the hairline fix for Modernizr.
        run_on_insecure_origins: Whether to run chrome.runtime on HTTP.
        device_memory: Device RAM in GB (power of 2: 2, 4, 8, 16).
        hardware_concurrency: Number of logical CPU cores.
        **kwargs: Additional keyword arguments passed to stealth evasions.

    Returns:
        A stealthed Chrome WebDriver routing through Tor.

    Raises:
        RuntimeError: If Tor is not available and verify_tor is True.

    Example:
        >>> from sneaky_selenium.tor import stealth_with_tor, TorDriverConfig
        >>>
        >>> # Basic usage with defaults
        >>> driver = stealth_with_tor()
        >>>
        >>> # Custom configuration
        >>> config = TorDriverConfig(headless=True, socks_port=9150)
        >>> driver = stealth_with_tor(
        ...     config=config,
        ...     languages=["en-US", "en"],
        ...     platform="Win32",
        ... )
        >>> driver.get("https://check.torproject.org")
    """
    # Import here to avoid circular imports
    from . import stealth  # noqa: PLC0415

    driver = create_tor_driver(config=config, verify_tor=verify_tor)

    stealth(
        driver,
        user_agent=user_agent,
        languages=languages,
        vendor=vendor,
        platform=platform,
        webgl_vendor=webgl_vendor,
        renderer=renderer,
        fix_hairline=fix_hairline,
        run_on_insecure_origins=run_on_insecure_origins,
        device_memory=device_memory,
        hardware_concurrency=hardware_concurrency,
        **kwargs,
    )

    logger.debug("Applied stealth evasions to Tor-enabled driver")
    return driver


def verify_tor_connection_via_driver(driver: ChromeWebDriver) -> dict[str, Any]:
    """Verify that a WebDriver is correctly routing through Tor.

    This navigates to the Tor Project's check page and verifies
    the connection is going through Tor.

    Args:
        driver: A WebDriver instance (should be Tor-enabled).

    Returns:
        Dictionary with verification results:
        - is_tor: bool - True if traffic is going through Tor
        - ip: str | None - The detected IP address
        - message: str - Human-readable status message
    """
    result: dict[str, Any] = {
        "is_tor": False,
        "ip": None,
        "message": "",
    }

    try:
        driver.get("https://check.torproject.org/api/ip")

        # Get the JSON response from the page body
        import json  # noqa: PLC0415

        body_text = driver.find_element("tag name", "pre").text
        data = json.loads(body_text)

        result["ip"] = data.get("IP")
        result["is_tor"] = data.get("IsTor", False)

        if result["is_tor"]:
            result["message"] = f"✓ Connected through Tor (Exit IP: {result['ip']})"
        else:
            result["message"] = f"⚠ Not using Tor (IP: {result['ip']})"

    except Exception as e:  # noqa: BLE001
        result["message"] = f"✗ Failed to verify Tor connection: {e}"

    return result
