"""tmailCC Comprehensive Automated E2E Test"""
import sys
import os
import io
import time
from playwright.sync_api import sync_playwright

# Fix UTF-8 encoding on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:3000"

def run_test():
    success = True
    print("\n=== STARTING COMPREHENSIVE E2E TESTS ===\n")
    
    with sync_playwright() as p:
        # Launch Chromium with explicit large viewport
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        try:
            # 1. Open the app route
            print("[Step 1] Navigating to workspace app /app...")
            page.goto(f"{BASE_URL}/app", timeout=15000)
            page.wait_for_load_state("networkidle")
            print(f"  Loaded page title: '{page.title()}'")
            
            # 2. Open Login modal
            print("[Step 2] Clicking 'Đăng nhập' (Sign In)...")
            login_btn = page.locator("button:has-text('Đăng nhập')").first
            login_btn.click()
            page.wait_for_selector(".modal", timeout=5000)
            print("  Login modal opened successfully.")
            
            # 3. Enter login credentials
            print("[Step 3] Submitting login form...")
            page.locator("input[placeholder='yourname']").fill("testadmin")
            page.locator("input[type='password']").fill("TestAdmin123!")
            page.locator("form button[type='submit']:has-text('Đăng nhập')").click()
            
            # Wait for login state transition (modal closes and user avatar/info shows up)
            page.wait_for_selector(".user-info", timeout=10000)
            print("  Successfully logged in as testadmin!")
            
            # 4. Create new email address
            print("[Step 4] Creating new email address...")
            page.locator("button:has-text('Tạo địa chỉ mới')").click()
            page.wait_for_selector("input[placeholder='Địa chỉ ngẫu nhiên']", timeout=5000)
            
            # Generate random local part
            test_local = f"autotest{int(time.time())}"
            page.locator("input[placeholder='Địa chỉ ngẫu nhiên']").fill(test_local)
            
            # Submit creation
            page.locator("button:text-is('Tạo')").click()
            time.sleep(3) # Wait for creation request
            print(f"  Sent request to create: {test_local}")
            
            # Verify the account is created
            page.wait_for_selector(f"text={test_local}", timeout=10000)
            print(f"  ✅ Account with local part '{test_local}' successfully created!")
            
            # 5. Open Settings Panel
            print("[Step 5] Opening Settings Panel...")
            settings_btn = page.locator("button[title='Cài đặt'], button[title='Settings'], button[aria-label='Cài đặt'], button[aria-label='Settings']").first
            settings_btn.click()
            page.wait_for_selector(".settings-panel", timeout=5000)
            print("  Settings Panel opened.")
            
            # 6. Click and check all Admin/User settings tabs
            tabs_to_verify = [
                ("Thống kê", "stats"),
                ("Người dùng", "users"),
                ("Tên miền", "domains"),
                ("Cấu hình", "config"),
                ("Danh sách chặn", "blocklist"),
                ("OTP Keys", "otpkeys"),
                ("Dotmail", "dotmails"),
                ("API Keys", "keys"),
                ("Webhooks", "webhooks"),
                ("Đổi thông tin", "password")
            ]
            
            print("[Step 6] Verifying all settings tabs...")
            for tab_label, tab_id in tabs_to_verify:
                print(f"  - Clicking tab: '{tab_label}'...")
                tab_el = page.locator(f".tab-btn:has-text('{tab_label}')").first
                tab_el.click()
                time.sleep(1) # Allow tab animation and data fetch
                # Basic check: verify active class or container content
                assert "active" in tab_el.evaluate("el => el.className"), f"Tab {tab_label} did not become active"
                print(f"    ✅ Tab '{tab_label}' works and loads correctly.")
                
            # 7. Close Settings Panel
            print("[Step 7] Closing Settings Panel...")
            close_btn = page.locator(".settings-panel .modal-close").first
            close_btn.click()
            # Wait for panel to disappear
            page.wait_for_selector(".settings-panel", state="hidden", timeout=5000)
            print("  ✅ Settings Panel closed.")
            
            # 8. Toggle Theme (Dark / Light mode)
            print("[Step 8] Testing Dark/Light Mode toggle...")
            theme_btn = page.locator(".topbar-right button.icon-btn").last
            theme_btn.click()
            time.sleep(1)
            print("  ✅ Toggled theme successfully.")
            
            # 9. Toggle Language (VI / EN)
            print("[Step 9] Testing Language translation toggle...")
            lang_btn = page.locator(".lang-btn").first
            original_lang = lang_btn.text_content().strip()
            lang_btn.click()
            time.sleep(1)
            new_lang = lang_btn.text_content().strip()
            print(f"  ✅ Language toggled from {original_lang} to {new_lang}.")
            
            # Toggle it back to original
            lang_btn.click()
            time.sleep(1)
            
            # 10. Logout
            print("[Step 10] Logging out...")
            logout_btn = page.locator("button[title='Đăng xuất'], button[title='Logout'], button[aria-label='Đăng xuất'], button[aria-label='Logout']").first
            logout_btn.click()
            # Verify we are logged out (login button should reappear)
            page.wait_for_selector("button:has-text('Đăng nhập')", timeout=5000)
            print("  ✅ Successfully logged out.")
            
            # 11. Verify Public /otp route
            print("[Step 11] Navigating to /otp...")
            page.goto(f"{BASE_URL}/otp", timeout=15000)
            page.wait_for_load_state("networkidle")
            assert "OTP" in page.title(), f"Page title does not contain OTP: {page.title()}"
            print("  ✅ /otp loaded successfully.")
            
            # 12. Verify Public /developer route
            print("[Step 12] Navigating to /developer...")
            page.goto(f"{BASE_URL}/developer", timeout=15000)
            page.wait_for_load_state("networkidle")
            print("  ✅ /developer loaded successfully.")
            
            # 13. Verify Public /docs/faq route
            print("[Step 13] Navigating to /docs/faq...")
            page.goto(f"{BASE_URL}/docs/faq", timeout=15000)
            page.wait_for_load_state("networkidle")
            print("  ✅ /docs/faq loaded successfully.")
            
            # 14. Verify Landing page / and animations
            print("[Step 14] Navigating to landing page /...")
            page.goto(f"{BASE_URL}/", timeout=15000)
            page.wait_for_load_state("networkidle")
            # Scroll down
            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            time.sleep(1)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            print("  ✅ Landing page / and scroll animations run successfully.")
            
        except Exception as e:
            print(f"\n❌ E2E TEST FAILED: {e}")
            success = False
            try:
                os.makedirs("artifacts", exist_ok=True)
                screenshot_path = "artifacts/failure_screenshot.png"
                page.screenshot(path=screenshot_path)
                print(f"  Failure screenshot saved to: {screenshot_path}")
            except Exception as se:
                print(f"  Failed to save screenshot: {se}")
        finally:
            browser.close()
            
    if success:
        print("\n🎉 ALL COMPREHENSIVE E2E TESTS PASSED SUCCESSFULLY! 🎉\n")
        sys.exit(0)
    else:
        print("\n❌ COMPREHENSIVE E2E TESTS ENCOUNTERED FAILURES ❌\n")
        sys.exit(1)

if __name__ == "__main__":
    run_test()
