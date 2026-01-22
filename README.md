# Sneaky Selenium ![Python Versions](https://img.shields.io/badge/python-3.13%20%7C%203.14-blue)

**Sneaky Selenium** is a Python package designed to prevent Selenium from being detected. Its primary goal is to enhance Selenium's stealth capabilities ensuring smooth automation while bypassing detection systems. Currently supports **Chrome** and **Remote WebDriver**.

## Project Lineage

This project has evolved through several maintainers:

1. **[puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)** by [berstend](https://github.com/berstend) (2019) - The original JavaScript stealth plugin for Puppeteer
2. **[selenium-stealth](https://github.com/diprajpatra/selenium-stealth)** by [diprajpatra](https://github.com/diprajpatra) (2020) - Python port for Selenium, now unmaintained
3. **[stealthenium](https://github.com/markmelnic/stealthenium)** by [markmelnic](https://github.com/markmelnic) (2024) - Updated fork with fixes
4. **sneaky-selenium** (2026) - Current version with modern evasions, Tor integration, and Python 3.13+ support

## Features

- **Passes public bot detection tests.**
- **Bypasses Cloudflare and other bot detection systems.**
- **Maintains a reasonable reCAPTCHA v3 score.**
- **Tor integration for anonymous browsing.**
- **Updated for 2026 with modern evasion techniques.**

## Installation

Available on PyPI:

```bash
pip install sneaky-selenium
```

For Tor support (optional):

```bash
pip install sneaky-selenium[tor]
```

## Usage

```python
from selenium import webdriver
from sneaky_selenium import stealth
import time

options = webdriver.ChromeOptions()
options.add_argument("start-maximized")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)

driver = webdriver.Chrome(options=options)

stealth(driver,
        languages=["en-US", "en"],
        vendor="Google Inc.",
        platform="Win32",
        webgl_vendor="Intel Inc.",
        renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
        )

driver.get("https://bot.sannysoft.com/")
time.sleep(5)
driver.quit()
```

## Tor Integration

Sneaky Selenium supports routing traffic through the Tor network for anonymous browsing.

### Prerequisites

1. Install Tor: `sudo pacman -S tor` (Arch) / `sudo apt install tor` (Debian) / `brew install tor` (macOS)
2. Start Tor: `sudo systemctl start tor`
3. Install with Tor support: `pip install sneaky-selenium[tor]`

### Quick Start with Tor

```python
from sneaky_selenium import stealth_with_tor

# One-liner to create a stealthed browser routing through Tor
driver = stealth_with_tor()
driver.get("https://check.torproject.org")
driver.quit()
```

### Custom Tor Configuration

```python
from sneaky_selenium import stealth_with_tor, TorDriverConfig

config = TorDriverConfig(
    socks_host="127.0.0.1",
    socks_port=9050,      # Default Tor port (9150 for Tor Browser Bundle)
    headless=True,
    additional_options=["--window-size=1920,1080"],
)

driver = stealth_with_tor(
    config=config,
    languages=["en-US", "en"],
    platform="Win32",
)

driver.get("https://bot.sannysoft.com/")
driver.quit()
```

### Utility Functions

```python
from sneaky_selenium import (
    is_tor_available,
    check_tor_connection,
    get_tor_exit_ip,
    verify_tor_connection_via_driver,
)

# Check if Tor is running
if is_tor_available():
    print("Tor is available!")

# Get connection info (requires requests[socks])
info = check_tor_connection()
print(f"Connected: {info['connected']}, IP: {info['ip']}, Is Tor: {info['is_tor']}")

# Verify via browser
result = verify_tor_connection_via_driver(driver)
print(result["message"])
```

## API Reference

```python
stealth(
    driver: Driver,
    user_agent: str | None = None,
    languages: list[str] | None = ["en-US", "en"],
    vendor: str = "Google Inc.",
    platform: str | None = "Win32",
    webgl_vendor: str = "Intel Inc.",
    renderer: str = "Intel Iris OpenGL Engine",
    fix_hairline: bool = False,
    run_on_insecure_origins: bool = False,
    device_memory: int = 8,
    hardware_concurrency: int = 8,
)
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

© 2019 berstend, 2020 diprajpatra, 2024 markmelnic, 2026 KaiErikNiermann
