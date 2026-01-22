"""Navigator languages evasion module."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "navigator.languages.js"


def navigator_languages(
    driver: WebDriverProtocol,
    languages: list[str],
    **kwargs: Any,
) -> None:
    """Set navigator.languages property.

    Args:
        driver: The WebDriver instance.
        languages: List of language codes (e.g., ['en-US', 'en']).
        **kwargs: Additional keyword arguments (unused).
    """
    evaluate_on_new_document(driver, _JS_PATH.read_text(), languages)
