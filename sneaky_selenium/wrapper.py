"""Script evaluation wrapper for sneaky_selenium."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from .cdp import execute_cdp_cmd

if TYPE_CHECKING:
    from ._types import WebDriverProtocol


def _strip_leading_comments(code: str) -> str:
    """Strip leading comments and whitespace from JavaScript code.

    This is needed because the wrapper puts the code in parentheses,
    and (// comment ...) is not valid JavaScript.

    Args:
        code: JavaScript code that may start with comments.

    Returns:
        The code with leading comments stripped.
    """
    # Pattern to match leading comments (single-line and multi-line)
    # and whitespace, including triple-slash references
    lines = code.split('\n')
    result_lines = []
    in_header = True

    for line in lines:
        stripped = line.strip()
        if in_header:
            # Skip empty lines, single-line comments, and reference directives
            if not stripped or stripped.startswith('//'):
                continue
            # Skip multi-line comment opening
            if stripped.startswith('/*'):
                # Find the end of the comment
                if '*/' in stripped:
                    continue
                # Multi-line comment spans multiple lines
                # For simplicity, we'll just skip until we find */
                continue
            in_header = False
        result_lines.append(line)

    return '\n'.join(result_lines)


def evaluation_string(fun: str, *args: Any) -> str:
    """Convert function and arguments to a callable string expression.

    Args:
        fun: The JavaScript function as a string.
        *args: Arguments to pass to the function.

    Returns:
        A string expression that calls the function with the given arguments.
    """
    # Strip leading comments so (fun)(...) is valid
    clean_fun = _strip_leading_comments(fun)

    # Strip trailing semicolon if present (TypeScript outputs these)
    clean_fun = clean_fun.rstrip()
    if clean_fun.endswith(';'):
        clean_fun = clean_fun[:-1]

    encoded_args = ', '.join(
        json.dumps('undefined' if arg is None else arg) for arg in args
    )
    return f'({clean_fun})({encoded_args})'


def evaluate_on_new_document(
    driver: WebDriverProtocol,
    page_function: str,
    *args: Any,
) -> None:
    """Evaluate a function on every new document.

    Args:
        driver: The WebDriver instance.
        page_function: The JavaScript function to evaluate.
        *args: Arguments to pass to the function.
    """
    js_code = evaluation_string(page_function, *args)

    execute_cdp_cmd(driver, "Page.addScriptToEvaluateOnNewDocument", {
        "source": js_code,
    })


# Backwards compatibility aliases
evaluationString = evaluation_string
evaluateOnNewDocument = evaluate_on_new_document
