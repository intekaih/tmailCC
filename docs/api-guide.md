# Hướng Dẫn Sử Dụng tmailCC API

> **Base URL:** `https://tmailcc.kaih.co.uk/api/v1`

---

## 1. Cách Lấy API Key

1. Đăng nhập tmailCC
2. Vào **Menu** > **Developer API**
3. Click **Tạo Key**
4. Điền tên (VD: "My App")
5. Chọn scopes cần thiết
6. Copy API key **ngay** (chỉ hiển thị 1 lần!)

---

## 2. Scopes Có Sẵn

| Scope | Mô tả |
|-------|--------|
| `accounts:create` | Tạo email mới |
| `accounts:read` | Xem danh sách email |
| `accounts:delete` | Xóa email |
| `emails:read` | Đọc nội dung thư |
| `otp:read` | Chờ nhận mã OTP |
| `domains:read` | Xem danh sách domain |
| `webhooks:manage` | Quản lý webhooks |
| `usage:read` | Xem thống kê |

---

## 3. Các Endpoint

### Tạo Email Mới

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/v1/accounts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "kaih.co.uk"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "abc123@kaih.co.uk",
    "localPart": "abc123",
    "domain": "kaih.co.uk",
    "createdAt": "2026-05-23T12:00:00Z"
  }
}
```

---

### Xem Inbox

```bash
curl https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk/emails \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Đọc Chi Tiết Email

```bash
curl https://tmailcc.kaih.co.uk/api/v1/emails/EMAIL_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Chờ Nhận Mã OTP

```bash
curl "https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk/wait-otp?timeout=120" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response khi tìm thấy OTP:**
```json
{
  "success": true,
  "data": {
    "email": {
      "from": {"address": "google.com", "name": "Google"},
      "subject": "Mã xác minh"
    },
    "otpCodes": ["123456"],
    "waitTimeMs": 5000
  }
}
```

---

### Xóa Email Account

```bash
curl -X DELETE "https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Xem Domains

```bash
curl https://tmailcc.kaih.co.uk/api/v1/domains \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 4. Ví Dụ JavaScript

### Tạo Email & Đọc Inbox

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE = 'https://tmailcc.kaih.co.uk/api/v1';

async function createEmail() {
  const res = await fetch(`${BASE}/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain: 'kaih.co.uk' })
  });
  return (await res.json()).data.address;
}

async function getEmails(address) {
  const res = await fetch(
    `${BASE}/accounts/${encodeURIComponent(address)}/emails`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  return (await res.json()).data.emails;
}

// Sử dụng
const email = await createEmail();
console.log('Email:', email);
const emails = await getEmails(email);
console.log('Emails:', emails);
```

---

### Chờ OTP Tự Động

```javascript
async function waitForOTP(address, timeoutSec = 120) {
  const start = Date.now();
  
  while (Date.now() - start < timeoutSec * 1000) {
    const res = await fetch(
      `${BASE}/accounts/${address}/wait-otp?timeout=10`,
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    
    const data = await res.json();
    
    if (data.success && data.data.otpCodes) {
      return data.data.otpCodes[0];
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  throw new Error('Timeout - không tìm thấy OTP');
}

// Sử dụng
const code = await waitForOTP('test@kaih.co.uk');
console.log('Mã OTP:', code);
```

---

### Node.js Express Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET';

function verifySignature(payload, signature, timestamp) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  );
}

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-tmailcc-signature'];
  const ts = req.headers['x-tmailcc-timestamp'];
  const event = req.headers['x-tmailcc-event'];
  
  if (!verifySignature(req.body, sig, ts)) {
    return res.status(401).send('Invalid');
  }
  
  if (event === 'email.received') {
    console.log('Email mới:', req.body.data);
  }
  
  if (event === 'otp.detected') {
    console.log('OTP:', req.body.data.otpCodes);
  }
  
  res.send('OK');
});

app.listen(3000);
```

---

## 5. Mã Lỗi

| Code | HTTP | Ý nghĩa |
|------|------|----------|
| `UNAUTHORIZED` | 401 | API key sai hoặc thiếu |
| `FORBIDDEN` | 403 | Không đủ quyền (scope thiếu) |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `RATE_LIMITED` | 429 | Gọi quá nhanh (>100 lần/phút) |
| `OTP_TIMEOUT` | 408 | Chờ OTP timeout |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |

---

## 6. Rate Limit

- **100 request/phút** cho mỗi API key
- Headers trả về:
  - `X-RateLimit-Limit`: Số request cho phép
  - `X-RateLimit-Remaining`: Request còn lại

---

## 7. Tạo Webhook

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["email.received", "otp.detected"],
    "name": "My Webhook"
  }'
```

**Webhook payload khi có email:**

```json
{
  "event": "email.received",
  "timestamp": "2026-05-23T12:00:00Z",
  "data": {
    "id": "email-uuid",
    "from": {"address": "sender@example.com", "name": "Sender"},
    "to": "abc123@kaih.co.uk",
    "subject": "Test",
    "text": "Body...",
    "receivedAt": "2026-05-23T12:00:00Z"
  }
}
```

---

---

## 8. Dotmail API (Admin)

> **Lưu ý:** Các endpoint Dotmail yêu cầu quyền Admin (Bearer token của admin user).
> Dotmail chỉ quản lý Gmail gốc, sinh biến thể dotmail, và đọc OTP — không gắn với dịch vụ cụ thể.

### Xem tất cả Gmail gốc & Dotmail

```bash
curl https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "parents": [
    {
      "id": "uuid",
      "address": "00yt0001@gmail.com",
      "app_password": "abcdefghijklmnop",
      "created_at": "2026-05-25T11:00:00Z",
      "dotmails": [
        { "id": "uuid", "address": "0.0yt0001@gmail.com", "created_at": "..." },
        { "id": "uuid", "address": "00.yt0001@gmail.com", "created_at": "..." }
      ]
    }
  ]
}
```

---

### Thêm Gmail gốc

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "add-parent", "address": "00yt0001@gmail.com", "app_password": "abcdefghijklmnop"}'
```

---

### Sinh Dotmail (chỉ 1 dấu chấm)

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "generate", "parent_id": "PARENT_UUID"}'
```

---

### Lấy OTP từ Gmail (qua IMAP)

```bash
curl "https://tmailcc.kaih.co.uk/api/admin/dotmails?action=otp&address=0.0yt0001@gmail.com" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "otp": "123456",
  "from": "noreply@example.com",
  "subject": "Your verification code"
}
```

---

### Xóa Gmail gốc

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete-parent", "id": "PARENT_UUID"}'
```

---

### Xóa một Dotmail

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "delete-dotmail", "id": "DOTMAIL_UUID"}'
```

---

### Cập nhật App Password Gmail gốc

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "update-parent", "id": "PARENT_UUID", "app_password": "new_app_password"}'
```

---

### Kiểm tra kết nối Gmail gốc (IMAP)

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/dotmails \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "check-parent", "id": "PARENT_UUID"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Kết nối IMAP thành công! Tài khoản sẵn sàng."
}
```

---

## 9. Domain Management API (Admin)

> **Lưu ý:** Các endpoint này yêu cầu quyền Admin (Bearer token của admin user).

### Xem danh sách Domain (Admin)

```bash
curl https://tmailcc.kaih.co.uk/api/admin/domains \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "domains": [
    {
      "id": "uuid",
      "domain": "kaih.co.uk",
      "label": "Primary",
      "isActive": true,
      "isDefault": true,
      "note": "Default domain",
      "createdAt": "2026-05-23T10:00:00.000Z"
    }
  ]
}
```

---

### Thêm Domain mới (Admin)

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/admin/domains \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "newdomain.com",
    "label": "Optional Label",
    "isDefault": false,
    "note": "Optional note"
  }'
```

---

### Xóa Domain (Admin)

```bash
curl -X DELETE https://tmailcc.kaih.co.uk/api/admin/domain/DOMAIN_UUID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 10. Lưu Ý Bảo Mật

- Không commit API key vào code
- Dùng environment variables
- Chỉ request scopes cần thiết
- Verify webhook signature luôn
- Rotate key định kỳ

---

## Tài Liệu Đầy Đủ

Xem: `docs/developer-api.md`
