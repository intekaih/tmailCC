/**
 * tmailCC - Notification API Helpers
 * Browser Notification API utilities with deduplication, service worker, and actions support.
 */

// Track permission state to avoid repeated requests
let cachedPermission: NotificationPermission | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

// Register Service Worker for notification actions
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[Notification] Service Worker registered:', reg);
        swRegistration = reg;
        
        // Listen for messages from Service Worker (e.g. copy code)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'tmail:copy-code') {
            const code = event.data.code;
            navigator.clipboard.writeText(code)
              .then(() => {
                // Dispatch event to show a toast
                window.dispatchEvent(new CustomEvent('tmail:show-toast', {
                  detail: { message: `Đã sao chép mã xác thực: ${code}`, type: 'success' }
                }));
              })
              .catch(err => {
                console.error('[Notification] Failed to copy code:', err);
              });
          } else if (event.data && event.data.type === 'tmail:focus-email') {
            window.dispatchEvent(new CustomEvent('tmail:focus-email', {
              detail: { emailId: event.data.emailId }
            }));
          }
        });
      })
      .catch(err => {
        console.error('[Notification] SW registration failed:', err);
      });
  });
}

/**
 * Extract verification code/OTP from subject and text body.
 */
export function extractVerificationCode(subject: string, bodyText: string): string | null {
  const text = `${subject || ''} ${bodyText || ''}`;
  
  // 1. Look for explicit labels: code/otp/mã xác minh/verification code followed by 4-8 alphanumeric chars
  const labelPatterns = [
    /(?:code|otp|verification|confirm|confirming|activation|mã|verification code|mã xác nhận|mã xác minh|mã otp)\s*[:=-]?\s*\b([a-zA-Z0-9]{4,8})\b/i,
    /\b([a-zA-Z0-9]{4,8})\b\s*(?:is your|là mã)/i
  ];

  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = match[1];
      if (/^[a-zA-Z]+$/.test(val) && val.length < 5) continue; // Skip short pure alphabetic words
      return val;
    }
  }

  // 2. Fallback: Search for any 6-digit number first (most common for OTP)
  const sixDigitMatch = text.match(/\b(\d{6})\b/);
  if (sixDigitMatch && sixDigitMatch[1]) {
    return sixDigitMatch[1];
  }

  // 3. Fallback: Search for any 4 to 8 digit number
  const digitMatch = text.match(/\b(\d{4,8})\b/);
  if (digitMatch && digitMatch[1]) {
    return digitMatch[1];
  }

  return null;
}

/**
 * Request notification permission from browser.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[Notification] Browser does not support Notification API');
    return 'denied';
  }

  if (cachedPermission !== null) {
    return cachedPermission;
  }

  if (Notification.permission === 'granted') {
    cachedPermission = 'granted';
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    cachedPermission = 'denied';
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    cachedPermission = permission;
    console.log('[Notification] Permission result:', permission);
    return permission;
  } catch (err) {
    console.error('[Notification] Failed to request permission:', err);
    return 'denied';
  }
}

/**
 * Get current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (cachedPermission !== null) {
    return cachedPermission;
  }
  return Notification.permission;
}

/**
 * Check if notifications are supported and permitted.
 */
export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a browser notification.
 * Uses Service Worker Registration if available to support custom actions (like Copy Code).
 */
export function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    badge?: string;
    data?: any;
    onClick?: () => void;
    verificationCode?: string | null;
  }
): any {
  if (!canShowNotifications()) {
    return null;
  }

  const notificationData = {
    ...(options?.data || {}),
    verificationCode: options?.verificationCode || null
  };

  const notificationOptions: NotificationOptions = {
    body,
    icon: options?.icon || '/favicon.ico',
    tag: options?.tag,
    badge: options?.badge,
    data: notificationData,
    silent: false,
  };

  // Add Action buttons if verification code is found
  if (options?.verificationCode) {
    notificationOptions.actions = [
      {
        action: 'copy',
        title: `Sao chép mã (${options.verificationCode})`,
      }
    ];
  }

  // Use Service Worker if registered to support actions
  if (swRegistration) {
    swRegistration.showNotification(title, notificationOptions)
      .catch(err => {
        console.error('[Notification] Service Worker showNotification failed, falling back:', err);
        fallbackShowNotification(title, notificationOptions, options?.onClick);
      });
    return null;
  }

  return fallbackShowNotification(title, notificationOptions, options?.onClick);
}

/**
 * Fallback to standard non-service-worker notification (no action buttons).
 */
function fallbackShowNotification(
  title: string,
  options: NotificationOptions,
  onClickCallback?: () => void
): Notification | null {
  try {
    const notification = new Notification(title, options);

    if (onClickCallback) {
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();
        onClickCallback();
      };
    } else {
      notification.onclick = () => {
        notification.close();
        window.focus();
      };
    }

    notification.onshow = () => {
      setTimeout(() => {
        notification.close();
      }, 5000);
    };

    return notification;
  } catch (err) {
    console.error('[Notification] Fallback showNotification failed:', err);
    return null;
  }
}

/**
 * Reset cached permission.
 */
export function resetNotificationPermissionCache(): void {
  cachedPermission = null;
}
