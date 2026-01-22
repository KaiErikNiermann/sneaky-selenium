"""WebGL vendor evasion module."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "webgl.vendor.js"


def webgl_vendor_override(
    driver: WebDriverProtocol,
    webgl_vendor: str,
    renderer: str,
    **kwargs: Any,
) -> None:
    """Override WebGL vendor and renderer information.

    Args:
        driver: The WebDriver instance.
        webgl_vendor: The WebGL vendor name (e.g., 'Intel Inc.').
        renderer: The WebGL renderer name (e.g., 'Intel Iris OpenGL Engine').
        **kwargs: Additional keyword arguments (unused).
    """
    evaluate_on_new_document(
        driver,
        _JS_PATH.read_text(),
        webgl_vendor,
        renderer,
    )
