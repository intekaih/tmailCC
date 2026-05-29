import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/send-email
 * Test endpoint: simulates an incoming email by calling the webhook internally.
 * Body: { to: "user@domain.com" }
 * 
 * Generates a random 6-digit verification code and sends it to the specified address.
 * This tests the entire real-time notification flow:
 *   Webhook → DB Insert → Broadcast → Client Notification
 */
export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address. Provide { "to": "user@domain.com" }' }, { status: 400 });
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = new Date().toISOString();
    const messageId = `<test-${Date.now()}@tmailcc-test>`;

    // Build raw email content
    const rawEmail = [
      `From: TMail Test <noreply@tmailcc-test.com>`,
      `To: ${to}`,
      `Subject: [TEST] Mã xác thực của bạn: ${code}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      `Xin chào,`,
      ``,
      `Đây là email test từ TMail Test System.`,
      ``,
      `Mã xác thực của bạn là: ${code}`,
      ``,
      `Verification code: ${code}`,
      ``,
      `Thời gian gửi: ${timestamp}`,
      ``,
      `---`,
      `Email này được tạo tự động bởi /api/test/send-email endpoint.`,
    ].join('\r\n');

    // Base64 encode the email
    const emailBase64 = Buffer.from(rawEmail).toString('base64');

    // Get webhook secret from env
    const webhookSecret = process.env.WEBHOOK_SECRET || 'change_this_to_a_random_webhook_key';

    // Call the webhook endpoint internally
    const baseUrl = request.nextUrl.origin;
    const webhookRes = await fetch(`${baseUrl}/api/webhook/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({
        envelopeFrom: 'noreply@tmailcc-test.com',
        envelopeTo: to,
        email: emailBase64,
      }),
    });

    const webhookData = await webhookRes.json();

    if (!webhookRes.ok) {
      return NextResponse.json({
        error: 'Webhook failed',
        details: webhookData,
        hint: `Đảm bảo địa chỉ "${to}" thuộc domain đã đăng ký trong hệ thống`,
      }, { status: webhookRes.status });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      code,
      emailId: webhookData.emailId,
      timestamp,
    });

  } catch (err: any) {
    console.error('[Test] Send email error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
