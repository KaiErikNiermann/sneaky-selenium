"""CDP command execution for stealthenium."""

from __future__ import annotations

from json import dumps
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from ._types import WebDriverProtocol


CdpCommand = Literal[
    "Browser.getVersion",
    "Network.setUserAgentOverride",
    "Page.addScriptToEvaluateOnNewDocument",
]


def execute_cdp_cmd(
    driver: WebDriverProtocol,
    cmd: CdpCommand | str,
    params: dict[str, Any] | None = None,
) -> Any:
    """Execute a Chrome DevTools Protocol command.

    Args:
        driver: The WebDriver instance to execute the command on.
        cmd: The CDP command to execute.
        params: Optional parameters for the command.

    Returns:
        The value returned by the CDP command.
    """
    if params is None:
        params = {}

    resource = f"/session/{driver.session_id}/chromium/send_command_and_get_result"

    command_executor = driver.command_executor
    if hasattr(command_executor, '_url'):
        url: str = command_executor._url + resource  # type: ignore[union-attr]
    else:
        url = command_executor._client_config.remote_server_addr + resource  # type: ignore[union-attr]

    body = dumps({'cmd': cmd, 'params': params})

    response: dict[str, Any] = command_executor._request('POST', url, body)  # type: ignore[union-attr]

    return response.get('value')
