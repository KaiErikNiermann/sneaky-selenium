"""Type aliases and protocols for stealthenium."""

from typing import Any, Protocol, TypeAlias, runtime_checkable


@runtime_checkable
class WebDriverProtocol(Protocol):
    """Protocol for Selenium WebDriver instances that support CDP commands."""

    session_id: str | None

    @property
    def command_executor(self) -> Any:
        """Return the command executor."""
        ...


# Type alias for any WebDriver that supports CDP
Driver: TypeAlias = WebDriverProtocol

# Common kwargs type for stealth functions
StealthKwargs: TypeAlias = dict[str, Any]
