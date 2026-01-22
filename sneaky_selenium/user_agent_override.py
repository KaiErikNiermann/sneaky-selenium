"""User agent override module."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, TypedDict

from .cdp import execute_cdp_cmd

if TYPE_CHECKING:
    from ._types import WebDriverProtocol


class UserAgentOverrideParams(TypedDict, total=False):
    """Parameters for Network.setUserAgentOverride CDP command."""

    userAgent: str
    acceptLanguage: str | None
    platform: str | None


def user_agent_override(
    driver: WebDriverProtocol,
    user_agent: str | None = None,
    language: str | None = None,
    platform: str | None = None,
    **kwargs: Any,
) -> None:
    """Override the user agent string.

    Args:
        driver: The WebDriver instance.
        user_agent: Custom user agent string. If None, uses browser's default.
        language: Accept-Language header value.
        platform: Platform to report (e.g., 'Win32', 'MacIntel').
        **kwargs: Additional keyword arguments (unused).
    """
    if user_agent is None:
        version_info: dict[str, Any] = execute_cdp_cmd(
            driver, "Browser.getVersion", {}
        )
        ua: str = version_info.get('userAgent', '')
    else:
        ua = user_agent

    # Hide headless nature by replacing HeadlessChrome with Chrome
    ua = ua.replace("HeadlessChrome", "Chrome")

    override: UserAgentOverrideParams = {"userAgent": ua}

    match (bool(language), bool(platform)):
        case (True, True):
            override = {
                "userAgent": ua,
                "acceptLanguage": language,
                "platform": platform,
            }
        case (True, False):
            override = {"userAgent": ua, "acceptLanguage": language}
        case (False, True):
            override = {"userAgent": ua, "platform": platform}
        case (False, False):
            override = {"userAgent": ua}

    execute_cdp_cmd(driver, 'Network.setUserAgentOverride', override)
