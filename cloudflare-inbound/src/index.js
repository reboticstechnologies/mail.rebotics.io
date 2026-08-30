export default {
  async email(message, env, ctx) {
    const raw = await new Response(message.raw).text();

    // This worker forwards the raw RFC822 message to your backend.
    // The backend needs a MIME parser if you want reliable HTML/text extraction.
    const payload = {
      to: message.to,
      from: message.from,
      subject: message.headers.get("subject") || "",
      text: raw,
      html: "",
      messageId: message.headers.get("message-id") || crypto.randomUUID()
    };

    const response = await fetch(env.BACKEND_INBOUND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-secret": env.INBOUND_WEBHOOK_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  },

  async fetch() {
    return new Response("Rebotics Mail inbound worker", { status: 200 });
  }
};
