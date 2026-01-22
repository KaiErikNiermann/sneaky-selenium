"""User-Agent Client Hints (UA-CH) evasion module.

Modern browsers use Client Hints instead of the User-Agent string for
fingerprinting. This module sets up realistic UA-CH values via CDP.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any, TypedDict

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "navigator.userAgentData.js"


class UABrand(TypedDict):
    """A User-Agent brand entry."""

    brand: str
    version: str


class ClientHintsParams(TypedDict, total=False):
    """Parameters for Client Hints configuration."""

    brands: list[UABrand]
    mobile: bool
    platform: str
    platformVersion: str
    architecture: str
    bitness: str
    model: str
    uaFullVersion: str


def navigator_user_agent_data(
    driver: WebDriverProtocol,
    brands: list[UABrand] | None = None,
    mobile: bool = False,
    platform: str = "Windows",
    platform_version: str = "15.0.0",
    architecture: str = "x86",
    bitness: str = "64",
    model: str = "",
    ua_full_version: str | None = None,
    **kwargs: Any,
) -> None:
    """Apply User-Agent Client Hints evasion.

    Modern fingerprinting relies heavily on navigator.userAgentData which
    provides structured browser/platform information. Headless browsers
    may have missing or inconsistent values.

    Args:
        driver: The WebDriver instance with CDP support.
        brands: List of brand objects with 'brand' and 'version' keys.
            Defaults to Chrome brands.
        mobile: Whether this is a mobile device. Defaults to False.
        platform: OS platform name. Defaults to 'Windows'.
        platform_version: OS version string. Defaults to '15.0.0'.
        architecture: CPU architecture. Defaults to 'x86'.
        bitness: Architecture bitness. Defaults to '64'.
        model: Device model (mainly for mobile). Defaults to ''.
        ua_full_version: Full browser version. Derived from brands if not set.
        **kwargs: Additional keyword arguments (unused).

    Example:
        >>> navigator_user_agent_data(
        ...     driver,
        ...     platform='macOS',
        ...     platform_version='14.0.0',
        ...     architecture='arm',
        ... )
    """
    if brands is None:
        brands = [
            {"brand": "Chromium", "version": "120"},
            {"brand": "Google Chrome", "version": "120"},
            {"brand": "Not_A Brand", "version": "8"},
        ]

    if ua_full_version is None:
        # Extract from first brand version
        ua_full_version = f"{brands[0]['version']}.0.0.0"

    params: ClientHintsParams = {
        "brands": brands,
        "mobile": mobile,
        "platform": platform,
        "platformVersion": platform_version,
        "architecture": architecture,
        "bitness": bitness,
        "model": model,
        "uaFullVersion": ua_full_version,
    }

    js_content = _JS_PATH.read_text(encoding="utf-8")
    evaluate_on_new_document(driver, js_content, params)
