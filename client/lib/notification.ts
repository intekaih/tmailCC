/**
 * tmailCC - Notification API Helpers
 * Browser Notification API utilities with deduplication and permission handling
 */

// Track permission state to avoid repeated requests
let cachedPermission: NotificationPermission | null = null;

/**
 * Request notification permission from browser.
 * Caches the result to avoid repeated requests.
 * Should be called after user interaction (e.g., button click).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[Notification] Browser does not support Notification API');
    return 'denied';
  }

  // Return cached permission if available
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

  // Request permission
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
 * Does NOT trigger a permission request.
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
 * Only shows if permission is granted.
 *
 * @param title - Notification title
 * @param body - Notification body text
 * @param options - Additional notification options
 * @returns The notification instance or null if not shown
 */
export function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string; // Tag for deduplication - notifications with same tag replace each other
    badge?: string;
    data?: any;
    onClick?: () => void;
  }
): Notification | null {
  if (!canShowNotifications()) {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag, // Browser auto-deduplicates by tag
      badge: options?.badge,
      data: options?.data,
      silent: false, // Play system sound
    });

    // Handle click to focus the tab
    if (options?.onClick) {
      notification.onclick = (event) => {
        event.preventDefault(); // Prevent default browser behavior
        notification.close();
        options.onClick?.();
      };
    } else {
      notification.onclick = () => {
        // Default behavior: focus the tab and close notification
        notification.close();
        window.focus();
      };
    }

    // Auto-close after 5 seconds
    notification.onshow = () => {
      setTimeout(() => {
        notification.close();
      }, 5000);
    };

    return notification;
  } catch (err) {
    console.error('[Notification] Failed to show notification:', err);
    return null;
  }
}

/**
 * Reset cached permission (useful for testing or when permission state changes externally).
 */
export function resetNotificationPermissionCache(): void {
  cachedPermission = null;
}
