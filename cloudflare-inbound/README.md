# Rebotics Cloudflare inbound Worker

This Worker receives Cloudflare Email Service messages, parses the raw MIME with `postal-mime`, and POSTs structured mail to the GoDaddy Rebotics Mail API. Cloudflare documents `message.raw` and recommends `postal-mime` for parsing Email Workers. 

Set Worker variables:
- `REBOTICS_INBOUND_URL` = `https://mail.rebotics.in/api/inbound`
- `INBOUND_WEBHOOK_SECRET` = same random value used in GoDaddy Secrets

Then configure Cloudflare Email Routing rules for your Rebotics domain to send matching addresses to this Worker.
