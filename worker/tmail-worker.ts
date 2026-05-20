/**
 * TMail Cloudflare Worker
 * Handles incoming emails from Cloudflare Email Routing
 * and forwards them as webhook POST requests to the backend
 */

interface Env {
  WEBHOOK_URL: string;
  WEBHOOK_SECRET?: string;
}

interface EmailMessage {
  from: string;
  to: string;
  raw?: ReadableStream<Uint8Array>;
  headers?: {
    get(name: string): string | null;
  };
}

export default {
  async email(message: EmailMessage, env: Env): Promise<Response> {
    try {
      const envelopeFrom = message.from;
      const envelopeTo = message.to;
      let rawEmailBase64: string;

      if (message.raw) {
        const reader = message.raw.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

        // Combine all chunks into a single Uint8Array
        const combined = new Uint8Array(totalLength);
        let pos = 0;
        for (const chunk of chunks) {
          combined.set(chunk, pos);
          pos += chunk.length;
        }

        // Chunked base64 encoding to avoid call-stack overflow on large emails.
        // String.fromCharCode.apply() crashes above ~65536 arguments.
        const CHUNK = 30000;
        let base64 = '';
        for (let i = 0; i < combined.length; i += CHUNK) {
          const slice = combined.slice(i, Math.min(i + CHUNK, combined.length));
          base64 += String.fromCharCode.apply(null, Array.from(slice) as any);
        }

        rawEmailBase64 = btoa(base64);
      } else {
        rawEmailBase64 = btoa(JSON.stringify({
          from: envelopeFrom,
          to: envelopeTo,
          subject: message.headers?.get('subject') || '',
          date: message.headers?.get('date') || '',
        }));
      }

      const webhookUrl = `${env.WEBHOOK_URL}/api/webhook/inbound`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': env.WEBHOOK_SECRET || '',
          'X-Tmail-Worker': 'tmail-webhook-v1',
        },
        body: JSON.stringify({
          email: rawEmailBase64,
          envelopeFrom,
          envelopeTo,
          receivedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown');
        console.error(`[TMail Worker] Webhook failed: ${response.status} ${errorText}`);
      } else {
        console.log(`[TMail Worker] Email forwarded: ${envelopeFrom} -> ${envelopeTo}`);
      }

      return new Response('OK', { status: 200 });

    } catch (err) {
      console.error('[TMail Worker] Error processing email:', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};
