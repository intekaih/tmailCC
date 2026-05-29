"""
tmailCC x GPT Full Automation
1. Register tmailCC account
2. Get API key from Developer Settings
3. Use demo tool to create email
4. Attempt GPT registration
"""
import sys, io, time, random, string
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

TMAIL_URL   = "http://localhost:3002"
DEMO_URL    = "http://localhost:3003"
RESULTS     = {}

def log(msg, emoji=""):
    print(f"{emoji}  {msg}")
    sys.stdout.flush()

def rand_str(n=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        ctx     = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
        page = ctx.new_page()

        # ---- STEP 1: Register tmailCC account ----
        log("=== STEP 1: Register tmailCC account ===", "1")
        page.goto(f"{TMAIL_URL}/auth/login", timeout=20000)
        page.wait_for_load_state("networkidle", timeout=20000)

        # Click "Sign up"
        try:
            page.get_by_role("link", name="Sign up").click(timeout=3000)
        except:
            page.get_by_role("button", name="Sign up").click(timeout=3000)
        page.wait_for_load_state("networkidle", timeout=10000)

        email_acc = f"test{ rand_str() }@test.com"
        RESULTS["tmail_email"] = email_acc
        password = "TestPass123!"

        log(f"Filling registration: {email_acc}")
        page.locator("input[name='email'], input[type='email'], input#email").first.fill(email_acc)
        page.locator("button[type='submit']").first.click()
        page.wait_for_load_state("networkidle", timeout=10000)

        # ---- STEP 2: Get API key ----
        log("=== STEP 2: Waiting for OTP to verify tmailCC... ===", "2")
        # We'll skip OTP for now - just use the landing page and go to developer settings
        # In a real scenario we'd poll emails. For this demo, let's check if registration worked.

        # Try to navigate to app
        page.goto(f"{TMAIL_URL}/app", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)

        # Check if logged in
        url_after = page.url
        log(f"URL after app visit: {url_after}")

        if "login" in url_after or "auth" in url_after:
            log("Registration may need email verification - checking page content", "!")
            # Look for "verify" message
            try:
                msg = page.locator("body").inner_text()
                if "verify" in msg.lower() or "xac minh" in msg.lower():
                    log("Email verification required. Let's check if we can proceed differently.", "!")
            except:
                pass

        # Since tmailCC registration likely needs email verification which requires
        # IMAP setup we don't have, let's try a different approach:
        # Check if there's a demo/test account or if we can use the existing setup

        log("Checking if we can access developer settings...", "?")
        page.goto(f"{TMAIL_URL}/developer", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)

        # Check if we're logged in
        dev_url = page.url
        if "login" in dev_url or "auth" in dev_url:
            log("Not logged in - checking registration page", "!")
            page.goto(f"{TMAIL_URL}/auth/login", timeout=15000)
            page.wait_for_load_state("networkidle", timeout=10000)

            # Look for any existing login form
            try:
                # Check for email input
                email_input = page.locator("input[name='email'], input[type='email']").first
                if email_input.is_visible(timeout=3000):
                    log("Found login form", "OK")
            except:
                pass

        # ---- Let's check the actual tmailCC registration flow ----
        log("Inspecting tmailCC registration flow...", "?")
        page.goto(f"{TMAIL_URL}/auth/login", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)

        # Take screenshot to see what we're dealing with
        page.screenshot(path="e:/tmailCC/tools/gpt-reg-demo/_debug_tmail.png", full_page=True)
        log("Screenshot saved: _debug_tmail.png", "📸")

        # Check page content
        try:
            content = page.locator("body").inner_text(timeout=3000)
            log(f"Page text preview: {content[:300]}", "...")
        except Exception as e:
            log(f"Could not read page: {e}", "!")

        browser.close()

if __name__ == "__main__":
    main()
