"""Chrome app evasion module."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "chrome.app.js"


def chrome_app(driver: WebDriverProtocol, **kwargs: Any) -> None:
    """Add chrome.app evasion to the driver.

    Args:
        driver: The WebDriver instance.
        **kwargs: Additional keyword arguments (unused).
    """
    evaluate_on_new_document(driver, _JS_PATH.read_text())
