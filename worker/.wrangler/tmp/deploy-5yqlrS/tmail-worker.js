// tmail-worker.js
var tmail_worker_default = {
  async email(message, env) {
    try {
      const envelopeFrom = message.from;
      const envelopeTo = message.to;
      let rawEmailBase64;
      if (message.raw) {
        const reader = message.raw.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let pos = 0;
        for (const chunk of chunks) {
          combined.set(chunk, pos);
          pos += chunk.length;
        }
        const CHUNK = 3e4;
        let base64 = "";
        for (let i = 0; i < combined.length; i += CHUNK) {
          const slice = combined.slice(i, Math.min(i + CHUNK, combined.length));
          base64 += String.fromCharCode.apply(null, Array.from(slice));
        }
        rawEmailBase64 = btoa(base64);
      } else {
        rawEmailBase64 = btoa(JSON.stringify({
          from: envelopeFrom,
          to: envelopeTo,
          subject: message.headers?.get("subject") || "",
          date: message.headers?.get("date") || ""
        }));
      }
      const webhookUrl = `${env.WEBHOOK_URL}/api/webhook/inbound`;
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": env.WEBHOOK_SECRET || "",
          "X-Tmail-Worker": "tmail-webhook-v1"
        },
        body: JSON.stringify({
          email: rawEmailBase64,
          envelopeFrom,
          envelopeTo,
          receivedAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown");
        console.error(`[TMail Worker] Webhook failed: ${response.status} ${errorText}`);
      } else {
        console.log(`[TMail Worker] Email forwarded: ${envelopeFrom} -> ${envelopeTo}`);
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[TMail Worker] Error processing email:", err);
      return new Response("Internal Error", { status: 500 });
    }
  }
};
export {
  tmail_worker_default as default
};
//# sourceMappingURL=tmail-worker.js.map
