# Cloudflare inbound email worker

This Worker receives Cloudflare Email Service routed mail and POSTs it to the Rebotics Mail backend.

Set Worker variables/secrets:

- `BACKEND_INBOUND_URL` = `https://api.rebotics.in/api/inbound`
- `INBOUND_WEBHOOK_SECRET` = same secret as backend `.env`

Then configure Cloudflare Email Routing to send `@rebotics.in` messages to this Worker.

For production, replace the simple raw-message forwarding with a MIME parser and extract `text`, `html`, attachments, headers, and message-id.
