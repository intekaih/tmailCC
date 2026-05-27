# tmailCC Developer API Test Checklist

## Prerequisites
- [ ] Server running on configured port (default: 3000)
- [ ] Valid Supabase credentials configured
- [ ] Test user account created in the system

---

## 1. Create API Key

**Endpoint:** `POST /api/v1/developer/api-keys`

**Steps:**
1. Authenticate as test user
2. Send request with key name and scopes
3. Copy the returned API key (shown only once)

**Expected Result:**
```json
{
  "id": "uuid",
  "name": "Test Key",
  "prefix": "tcc_",
  "key_hint": "xxxx",
  "scopes": ["emails:read", "emails:write"],
  "is_active": true,
  "created_at": "2026-05-23T12:00:00Z"
}
```

**Verify:**
- [ ] API key stored in database
- [ ] Key hash matches (not the raw key)
- [ ] Scopes correctly assigned

---

## 2. Create Email via API

**Endpoint:** `POST /api/v1/emails`

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "from": "sender@example.com",
  "to": "testuser@tmailcc.com",
  "subject": "API Test Email",
  "text": "This is a test message",
  "html": "<p>This is a test message</p>"
}
```

**Expected Result:**
```json
{
  "id": "uuid",
  "from": "sender@example.com",
  "to": "testuser@tmailcc.com",
  "subject": "API Test Email",
  "created_at": "2026-05-23T12:00:00Z"
}
```

**Verify:**
- [ ] Email stored in database
- [ ] Email ID returned in response
- [ ] API key usage logged

---

## 3. Receive Email (Send Test Email)

**Method 1: SMTP Simulation**
```bash
# Simulate incoming email via SMTP
nc -C localhost 2500
HELO test.com
MAIL FROM:<sender@example.com>
RCPT TO:<testuser@tmailcc.com>
DATA
Subject: Test
Test body
.
QUIT
```

**Method 2: Direct API**
```bash
curl -X POST http://localhost:3000/api/webhook/inbound \
  -H "Content-Type: application/json" \
  -d '{"envelopeFrom":"sender@example.com","envelopeTo":"testuser@tmailcc.com","email":"ZnJvbTogc2VuZGVyQGV4YW1wbGUuY29tDQp0bzogdGVzdHVzZXJAdG1haWxjYy5jb20NCnN1YmplY3Q6IE9UUCBUZXN0DQoNCllvdXIgY29kZSBpcyAxMjM0NTY="}'
```

**Expected Result:**
- Email appears in inbox for testuser@tmailcc.com
- Webhook triggered (if configured)

**Verify:**
- [ ] Email saved to database
- [ ] Real-time notification sent (SSE)
- [ ] Webhook fired (if configured)

---

## 4. Wait for OTP (Long-Poll)

**Endpoint:** `GET /api/v1/emails/:id/otp`

**Headers:**
```
X-API-Key: your-api-key
```

**Options:**

### Option A: SSE (Server-Sent Events)
```bash
curl -N http://localhost:3000/api/v1/emails/{email_id}/otp/stream
```

### Option B: Long-Polling
```bash
curl "http://localhost:3000/api/v1/emails/{email_id}/otp?timeout=60000"
```

**Test Flow:**
1. Start OTP listener
2. Send email containing OTP (e.g., "Your code: 123456")
3. Wait for detection

**Expected Result:**
```json
{
  "email_id": "uuid",
  "otp": "123456",
  "detected_at": "2026-05-23T12:00:05Z"
}
```

**Verify:**
- [ ] OTP correctly extracted
- [ ] Response returned within timeout
- [ ] Multiple OTP patterns tested

---

## 5. Verify Webhook Callback

**Setup Webhook:**
```bash
# Create webhook using API
curl -X POST http://localhost:3000/api/v1/developer/webhooks \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/test",
    "name": "Test Webhook",
    "events": ["email.received", "otp.detected"]
  }'
```

**Webhook Payload (email.received):**
```json
{
  "event": "email.received",
  "timestamp": "2026-05-23T12:00:00Z",
  "data": {
    "id": "uuid",
    "from": "sender@example.com",
    "to": "testuser@tmailcc.com",
    "subject": "Test Subject",
    "received_at": "2026-05-23T12:00:00Z"
  }
}
```

**Webhook Payload (otp.detected):**
```json
{
  "event": "otp.detected",
  "timestamp": "2026-05-23T12:00:00Z",
  "data": {
    "email_id": "uuid",
    "otp": "123456",
    "from": "sender@example.com",
    "detected_at": "2026-05-23T12:00:00Z"
  }
}
```

**Verify:**
- [ ] Webhook received at configured URL
- [ ] HMAC signature valid (header: `X-Webhook-Signature`)
- [ ] Delivery logged in database
- [ ] Retry mechanism works (if endpoint returns 500)

---

## 6. Test Rate Limiting

**Test Configuration:**
- Default: 100 requests per 60 seconds
- Uses sliding window algorithm

**Test Script:**
```bash
#!/bin/bash
API_KEY="your-api-key"
COUNT=0

for i in {1..110}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    http://localhost:3000/api/v1/emails)
  
  if [ "$RESPONSE" != "200" ]; then
    echo "Rate limited at request $i (status: $RESPONSE)"
    break
  fi
  COUNT=$i
done

echo "Completed $COUNT requests successfully"
```

**Expected Results:**
- Requests 1-100: HTTP 200
- Requests 101+: HTTP 429 Too Many Requests

**Response Headers (always returned):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1716464400
```

**Verify:**
- [ ] Rate limit headers present
- [ ] 429 response after limit exceeded
- [ ] Counter resets after window expires

---

## 7. Test Scope Validation

**API Key Scopes:**
| Scope | Access |
|-------|--------|
| `emails:read` | GET endpoints for emails |
| `emails:write` | POST/PUT/DELETE for emails |
| `webhooks:read` | GET webhooks |
| `webhooks:write` | POST/PUT/DELETE webhooks |
| `api-keys:read` | GET API keys |
| `api-keys:write` | POST/PUT/DELETE API keys |

**Test Cases:**

### Case 1: Missing Required Scope
```bash
# API key only has emails:read scope
curl -X POST http://localhost:3000/api/v1/emails \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** HTTP 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "API key lacks required scope: emails:write"
}
```

### Case 2: Expired API Key
```bash
# Create key with past expiration
curl -X POST http://localhost:3000/api/v1/developer/api-keys \
  -H "Authorization: Bearer {jwt}" \
  -d '{"name":"Expired","expires_at":"2026-01-01T00:00:00Z"}'
```

**Expected:** HTTP 401 Unauthorized

### Case 3: Inactive API Key
```bash
# Deactivate key via admin
# Then try to use it
curl http://localhost:3000/api/v1/emails \
  -H "X-API-Key: deactivated-key"
```

**Expected:** HTTP 401 Unauthorized

**Verify:**
- [ ] Missing scope returns 403
- [ ] Expired key returns 401
- [ ] Inactive key returns 401
- [ ] Valid scope allows access

---

## Post-Test Verification

**Database Checks:**
```sql
-- Verify API keys
SELECT id, name, is_active, created_at FROM public.api_keys;

-- Verify usage logs
SELECT * FROM public.api_usage_logs ORDER BY created_at DESC LIMIT 10;

-- Verify webhooks
SELECT id, url, is_active, last_triggered_at FROM public.webhooks;

-- Verify webhook deliveries
SELECT * FROM public.webhook_deliveries ORDER BY created_at DESC LIMIT 10;
```

**Log Files:**
- Check server logs for any errors
- Verify rate limit logging
- Check webhook delivery attempts

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Webhook not firing | Check webhook is_active=true and URL is accessible |
| Rate limit not working | Verify Redis/config for sliding window |
| OTP not detected | Check email text content, try different patterns |
| CORS errors | Set CORS_ORIGIN in .env |
| 401 on valid key | Check API key is_active and not expired |

---

## Test Environment Reset

```bash
# Clear test data
DELETE FROM public.webhook_deliveries WHERE created_at > NOW() - INTERVAL '1 hour';
DELETE FROM public.api_usage_logs WHERE created_at > NOW() - INTERVAL '1 hour';
DELETE FROM public.webhooks WHERE name LIKE 'Test%';
DELETE FROM public.api_keys WHERE name LIKE 'Test%';
```
