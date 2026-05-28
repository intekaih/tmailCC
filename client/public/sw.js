// Service Worker for handling Web Notifications
self.addEventListener('push', function(event) {
  // We handle realtime notifications via WebSockets in the foreground/background tab,
  // but if push notifications are ever integrated, this worker is ready.
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const emailId = event.notification.data ? event.notification.data.emailId : null;
  const verificationCode = event.notification.data ? event.notification.data.verificationCode : null;

  // Wait until we find the app client window and focus/send message
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Find a matching tab
      let matchingClient = null;
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.host)) {
          matchingClient = client;
          break;
        }
      }

      if (matchingClient) {
        // Focus the window first
        return matchingClient.focus().then(function(focusedClient) {
          if (event.action === 'copy' && verificationCode) {
            // Send copy command
            focusedClient.postMessage({
              type: 'tmail:copy-code',
              code: verificationCode
            });
          } else if (emailId) {
            // Focus the email
            focusedClient.postMessage({
              type: 'tmail:focus-email',
              emailId: emailId
            });
          }
        });
      }

      // If no open tab, open a new one
      if (self.clients.openWindow) {
        let url = '/';
        if (event.action === 'copy' && verificationCode) {
          url += `?copyCode=${encodeURIComponent(verificationCode)}`;
        } else if (emailId) {
          url += `?focusEmail=${encodeURIComponent(emailId)}`;
        }
        return self.clients.openWindow(url);
      }
    })
  );
});
