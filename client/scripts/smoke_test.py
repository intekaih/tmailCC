"""tmailCC smoke test - verify pages load without errors after refactoring."""
from playwright.sync_api import sync_playwright
import sys
import os
import io

# Fix UTF-8 encoding on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Pages to test
PAGES = [
    ("/", "Home/Landing page"),
    ("/landing", "Landing page"),
    ("/otp", "OTP page"),
    ("/developer", "Developer page"),
    ("/docs/faq", "FAQ page"),
]

def test_page(page, url, name):
    errors = []

    # Capture console errors
    def on_console(msg):
        if msg.type == "error":
            errors.append(f"[console.error] {msg.text}")

    page.on("console", on_console)

    try:
        response = page.goto(f"http://localhost:3000{url}", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=15000)

        status = response.status if response else "no response"
        try:
            title = page.title()
        except Exception:
            title = "(unable to read title)"

        # Filter out known benign errors (Cloudflare Turnstile not loaded, etc.)
        critical_errors = [
            e for e in errors
            if "turnstile" not in e.lower()
            and "cf-" not in e.lower()
            and "net::ERR" not in e
            and "Failed to load resource" not in e
            and "net::ERR_CONNECTION_REFUSED" not in e
            and "net::ERR_ABORTED" not in e
        ]

        if critical_errors:
            print(f"  [FAIL] {name} ({url}) - {status} - {title}")
            for err in critical_errors:
                print(f"       {err}")
            return False

        print(f"  [OK]   {name} ({url}) - {status} - {title}")
        return True
    except Exception as ex:
        print(f"  [FAIL] {name} ({url}) - Exception: {ex}")
        return False

def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("\n=== tmailCC Smoke Test ===\n")
        for url, name in PAGES:
            ok = test_page(page, url, name)
            results.append((name, url, ok))

        browser.close()

    print(f"\n=== Results: {sum(1 for _, _, ok in results if ok)}/{len(results)} passed ===\n")

    failed = [r for r in results if not r[2]]
    if failed:
        print("FAILED pages:")
        for name, url, _ in failed:
            print(f"  - {name} ({url})")
        sys.exit(1)
    else:
        print("All pages loaded successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
