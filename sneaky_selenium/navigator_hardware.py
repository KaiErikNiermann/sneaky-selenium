"""Hardware fingerprint evasion module.

Spoofs navigator.deviceMemory and navigator.hardwareConcurrency to prevent
detection of headless/automation environments through hardware fingerprinting.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any, TypedDict

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "navigator.hardware.js"


class HardwareParams(TypedDict, total=False):
    """Parameters for hardware fingerprint configuration."""

    deviceMemory: int
    hardwareConcurrency: int


def navigator_hardware(
    driver: WebDriverProtocol,
    device_memory: int = 8,
    hardware_concurrency: int = 8,
    **kwargs: Any,
) -> None:
    """Apply hardware fingerprint evasion.

    Modern fingerprinting uses hardware metrics to identify browsers.
    Headless browsers often report unusual or missing values.

    Args:
        driver: The WebDriver instance with CDP support.
        device_memory: Device RAM in GB. Must be a power of 2 (2, 4, 8, 16).
            Defaults to 8.
        hardware_concurrency: Number of logical CPU cores.
            Defaults to 8.
        **kwargs: Additional keyword arguments (unused).

    Example:
        >>> navigator_hardware(driver, device_memory=16, hardware_concurrency=12)
    """
    params: HardwareParams = {
        "deviceMemory": device_memory,
        "hardwareConcurrency": hardware_concurrency,
    }

    js_content = _JS_PATH.read_text(encoding="utf-8")
    evaluate_on_new_document(driver, js_content, params)
