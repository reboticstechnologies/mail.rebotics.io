import PostalMime from 'postal-mime';

export default {
  async email(message, env) {
    const parser = new PostalMime();
    const raw = new Response(message.raw);
    const email = await parser.parse(await raw.arrayBuffer());
    const attachments = (email.attachments || []).slice(0, 8).map(a => ({
      filename: a.filename || 'attachment',
      contentType: a.mimeType || 'application/octet-stream',
      contentId: a.contentId || null,
      content: a.content ? bytesToBase64(a.content) : ''
    }));
    const response = await fetch(env.REBOTICS_INBOUND_URL, {
      method: 'POST',
      headers: {'content-type':'application/json','x-inbound-secret':env.INBOUND_WEBHOOK_SECRET},
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: email.subject || message.headers.get('subject') || '',
        text: email.text || '',
        html: email.html || '',
        messageId: email.messageId || message.headers.get('message-id') || null,
        attachments
      })
    });
    if (!response.ok) throw new Error(`Rebotics API returned ${response.status}`);
  }
};

function bytesToBase64(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer || input);
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}
