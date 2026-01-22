"""Chrome runtime evasion module."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from .wrapper import evaluate_on_new_document

if TYPE_CHECKING:
    from ._types import WebDriverProtocol

_JS_PATH = Path(__file__).parent / "js" / "chrome.runtime.js"


def chrome_runtime(
    driver: WebDriverProtocol,
    run_on_insecure_origins: bool = False,
    **kwargs: Any,
) -> None:
    """Add chrome.runtime evasion to the driver.

    Args:
        driver: The WebDriver instance.
        run_on_insecure_origins: Whether to run on insecure origins.
        **kwargs: Additional keyword arguments (unused).
    """
    evaluate_on_new_document(
        driver,
        _JS_PATH.read_text(),
        run_on_insecure_origins,
    )
