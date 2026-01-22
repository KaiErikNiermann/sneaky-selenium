"""Sneaky Selenium - Make Selenium undetectable.

A Python package designed to prevent Selenium from being detected.
Updated for 2026 with modern evasion techniques.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .chrome_app import chrome_app
from .chrome_runtime import chrome_runtime
from .hairline_fix import hairline_fix
from .iframe_content_window import iframe_content_window
from .media_codecs import media_codecs
from .navigator_hardware import navigator_hardware
from .navigator_languages import navigator_languages
from .navigator_permissions import navigator_permissions
from .navigator_plugins import navigator_plugins
from .navigator_user_agent_data import navigator_user_agent_data
from .navigator_vendor import navigator_vendor
from .navigator_webdriver import navigator_webdriver
from .tor import (
    TOR_CONTROL_PORT,
    TOR_SOCKS5_HOST,
    TOR_SOCKS5_PORT,
    TorDriverConfig,
    check_tor_connection,
    create_tor_driver,
    get_tor_exit_ip,
    is_tor_available,
    stealth_with_tor,
    verify_tor_connection_via_driver,
)
from .user_agent_override import user_agent_override
from .utils import with_utils
from .webgl_vendor import webgl_vendor_override
from .window_outerdimensions import window_outerdimensions

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

__all__ = [
    # Main stealth function
    "stealth",
    # Tor integration
    "stealth_with_tor",
    "create_tor_driver",
    "TorDriverConfig",
    "is_tor_available",
    "check_tor_connection",
    "get_tor_exit_ip",
    "verify_tor_connection_via_driver",
    "TOR_SOCKS5_HOST",
    "TOR_SOCKS5_PORT",
    "TOR_CONTROL_PORT",
    # Individual evasion modules
    "chrome_app",
    "chrome_runtime",
    "hairline_fix",
    "iframe_content_window",
    "media_codecs",
    "navigator_hardware",
    "navigator_languages",
    "navigator_permissions",
    "navigator_plugins",
    "navigator_user_agent_data",
    "navigator_vendor",
    "navigator_webdriver",
    "user_agent_override",
    "with_utils",
    "webgl_vendor_override",
    "window_outerdimensions",
]


def stealth(
    driver: WebDriverProtocol,
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
) -> None:
    """Apply stealth modifications to a Selenium WebDriver instance.

    This function applies various evasions to make Selenium harder to detect
    by anti-bot systems. It modifies browser fingerprints and behavior to
    appear more like a regular browser.

    Args:
        driver: The WebDriver instance (Chrome or Remote with CDP support).
        user_agent: Custom user agent string. If None, modifies the existing
            user agent to remove 'HeadlessChrome'.
        languages: List of language codes for navigator.languages.
            Defaults to ['en-US', 'en'].
        vendor: The navigator.vendor value. Defaults to 'Google Inc.'.
        platform: The platform to report (e.g., 'Win32', 'MacIntel').
            If None, uses the browser's default.
        webgl_vendor: WebGL vendor to report. Defaults to 'Intel Inc.'.
        renderer: WebGL renderer to report.
            Defaults to 'Intel Iris OpenGL Engine'.
        fix_hairline: Whether to apply the hairline fix for Modernizr.
            Defaults to False.
        run_on_insecure_origins: Whether to run chrome.runtime on insecure
            (non-HTTPS) origins. Defaults to False.
        device_memory: Device RAM in GB (power of 2: 2, 4, 8, 16).
            Defaults to 8.
        hardware_concurrency: Number of logical CPU cores.
            Defaults to 8.
        **kwargs: Additional keyword arguments passed to individual evasions.

    Example:
        >>> from selenium import webdriver
        >>> from sneaky_selenium import stealth
        >>>
        >>> driver = webdriver.Chrome()
        >>> stealth(driver, languages=['en-US', 'en'], vendor='Google Inc.')
    """
    if languages is None:
        languages = ["en-US", "en"]

    ua_languages = ",".join(languages)

    # Core utilities (must be first)
    with_utils(driver, **kwargs)

    # Chrome API mocks
    chrome_app(driver, **kwargs)
    chrome_runtime(driver, run_on_insecure_origins, **kwargs)

    # Navigator property evasions (critical for 2026)
    navigator_webdriver(driver, **kwargs)  # Most important - removes automation flag
    navigator_user_agent_data(driver, platform=platform or "Windows", **kwargs)  # UA-CH
    navigator_hardware(driver, device_memory, hardware_concurrency, **kwargs)
    navigator_languages(driver, languages, **kwargs)
    navigator_permissions(driver, **kwargs)
    navigator_plugins(driver, **kwargs)
    navigator_vendor(driver, vendor, **kwargs)

    # DOM and rendering evasions
    iframe_content_window(driver, **kwargs)
    media_codecs(driver, **kwargs)
    webgl_vendor_override(driver, webgl_vendor, renderer, **kwargs)
    window_outerdimensions(driver, **kwargs)

    # User agent override (via CDP)
    user_agent_override(driver, user_agent, ua_languages, platform, **kwargs)

    # Optional fixes
    if fix_hairline:
        hairline_fix(driver, **kwargs)
