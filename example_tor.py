"""Example: Using stealthenium with Tor for anonymous browsing.

This example demonstrates how to create an undetectable Selenium browser
session that routes all traffic through the Tor network.

Requirements:
    - Tor must be running (sudo systemctl start tor)
    - Chrome/Chromium and chromedriver installed
    - pip install sneaky-selenium selenium

Usage:
    python example_tor.py
"""

from sneaky_selenium import (
    TorDriverConfig,
    check_tor_connection,
    is_tor_available,
    stealth_with_tor,
    verify_tor_connection_via_driver,
)


def main() -> None:
    """Demonstrate stealthenium with Tor integration."""
    print("=" * 60)
    print("Stealthenium + Tor Example")
    print("=" * 60)

    # Step 1: Check if Tor is available
    print("\n[1/4] Checking Tor availability...")
    if not is_tor_available():
        print("✗ Tor is not running!")
        print("\nStart Tor with one of:")
        print("  - sudo systemctl start tor  (Linux)")
        print("  - brew services start tor   (macOS)")
        print("  - tor                        (Manual)")
        return

    print("✓ Tor SOCKS5 proxy is available")

    # Step 2: Verify Tor connection (optional, using requests)
    print("\n[2/4] Verifying Tor connection...")
    tor_check = check_tor_connection()
    if tor_check["connected"] and tor_check["is_tor"]:
        print(f"✓ Tor is working (Exit IP: {tor_check['ip']})")
    elif tor_check["error"]:
        print(f"⚠ Warning: {tor_check['error']}")
        print("  (Continuing anyway, will verify via browser)")
    else:
        print("⚠ Traffic may not be routed through Tor")

    # Step 3: Create stealthed Tor browser
    print("\n[3/4] Creating stealthed Tor browser...")

    # Configure the driver
    config = TorDriverConfig(
        headless=False,  # Set to True for headless operation
        # socks_port=9150,  # Use 9150 for Tor Browser Bundle
    )

    # Create the stealthed driver with Tor
    driver = stealth_with_tor(
        config=config,
        languages=["en-US", "en"],
        vendor="Google Inc.",
        platform="Win32",
        webgl_vendor="Intel Inc.",
        renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
    )

    print("✓ Stealthed Tor browser created")

    try:
        # Step 4: Verify via browser
        print("\n[4/4] Verifying Tor connection via browser...")
        result = verify_tor_connection_via_driver(driver)
        print(result["message"])

        # Navigate to bot detection test
        print("\n[Bonus] Testing bot detection evasion...")
        driver.get("https://bot.sannysoft.com/")
        print("✓ Navigated to bot.sannysoft.com")
        print("  Check the browser window to see detection results")

        # Wait for user to inspect
        input("\nPress Enter to close the browser...")

    finally:
        driver.quit()
        print("\n✓ Browser closed")


def example_minimal() -> None:
    """Minimal example - just 3 lines to get started."""
    from sneaky_selenium import stealth_with_tor  # noqa: PLC0415

    # Create a stealthed browser that routes through Tor
    driver = stealth_with_tor()
    driver.get("https://check.torproject.org")
    # ... do your scraping ...
    driver.quit()


def example_custom_config() -> None:
    """Example with custom configuration."""
    from sneaky_selenium import TorDriverConfig, stealth_with_tor  # noqa: PLC0415

    # Custom configuration
    config = TorDriverConfig(
        socks_host="127.0.0.1",
        socks_port=9050,  # Default Tor port (9150 for Tor Browser Bundle)
        headless=True,
        additional_options=[
            "--disable-gpu",
            "--window-size=1920,1080",
        ],
    )

    driver = stealth_with_tor(
        config=config,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        languages=["en-US", "en"],
        platform="Win32",
    )

    try:
        driver.get("https://httpbin.org/ip")
        print(f"Current IP: {driver.find_element('tag name', 'pre').text}")
    finally:
        driver.quit()


def example_existing_driver() -> None:
    """Example: Add Tor proxy to an existing driver setup."""
    from selenium import webdriver  # noqa: PLC0415

    from sneaky_selenium import stealth  # noqa: PLC0415

    # Create your own driver with Tor proxy
    options = webdriver.ChromeOptions()
    options.add_argument("--proxy-server=socks5://127.0.0.1:9050")
    options.add_argument("--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])

    driver = webdriver.Chrome(options=options)

    # Apply just the stealth evasions
    stealth(driver, languages=["en-US", "en"])

    try:
        driver.get("https://check.torproject.org")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
