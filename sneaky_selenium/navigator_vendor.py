"""Navigator vendor evasion module."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "navigator.vendor.js"

VendorName = Literal["Google Inc.", "Apple Computer, Inc.", ""] | str


def navigator_vendor(
    driver: WebDriverProtocol,
    vendor: VendorName,
    **kwargs: Any,
) -> None:
    """Set navigator.vendor property.

    Args:
        driver: The WebDriver instance.
        vendor: The vendor name (e.g., 'Google Inc.').
        **kwargs: Additional keyword arguments (unused).
    """
    evaluate_on_new_document(driver, _JS_PATH.read_text(), vendor)
