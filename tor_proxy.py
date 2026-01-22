"""Tor proxy connection test script.

This script tests Tor connectivity. For Selenium integration with Tor,
use the stealthenium.tor module directly:

    from sneaky_selenium import stealth_with_tor, TorDriverConfig
    
    # Create a stealthed browser that routes through Tor
    driver = stealth_with_tor()
    driver.get("https://check.torproject.org")
"""

from sneaky_selenium.tor import (
    TOR_SOCKS5_HOST,
    TOR_SOCKS5_PORT,
    check_tor_connection,
    is_tor_available,
)


def main() -> None:
    """Test Tor proxy connection."""
    print("=" * 50)
    print("Tor Proxy Connection Test")
    print("=" * 50)

    print(f"\nChecking if Tor is running on {TOR_SOCKS5_HOST}:{TOR_SOCKS5_PORT}...")

    if not is_tor_available():
        print("✗ Tor SOCKS5 proxy is not available!")
        print("\nTo start Tor:")
        print("  - Linux: sudo systemctl start tor")
        print("  - macOS: brew services start tor")
        print("  - Or run: tor")
        return

    print("✓ Tor proxy port is open")

    print("\nVerifying Tor connection via check.torproject.org...")
    result = check_tor_connection()

    if result["connected"]:
        print("✓ Connected successfully!")
        print(f"  Exit node IP: {result['ip']}")
        print(f"  Traffic via Tor: {result['is_tor']}")

        if result["is_tor"]:
            print("\n✓ You are successfully browsing through Tor!")
        else:
            print("\n⚠ Connected but traffic may not be going through Tor")
    else:
        print(f"✗ Connection failed: {result['error']}")

    # Test with requests through Tor
    print("\nTesting with httpbin.org/ip...")
    try:
        import requests  # noqa: PLC0415
        
        session = requests.Session()
        proxy_url = f"socks5h://{TOR_SOCKS5_HOST}:{TOR_SOCKS5_PORT}"
        session.proxies = {"http": proxy_url, "https": proxy_url}
        
        response = session.get("https://httpbin.org/ip", timeout=30)
        data = response.json()
        print(f"✓ httpbin sees your IP as: {data.get('origin')}")
    except ImportError:
        print("⚠ requests[socks] not installed, skipping httpbin test")
    except Exception as e:  # noqa: BLE001
        print(f"✗ httpbin test failed: {e}")


if __name__ == "__main__":
    main()
