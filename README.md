# Rebotics Mail Full Stack

This package turns the existing GitHub Pages webmail UI into a real backend architecture.

## Architecture

GitHub Pages (`mail.rebotics.in`)
→ HTTPS API (`api.rebotics.in`)
→ Node.js/Express
→ PostgreSQL
→ Cloudflare Email Service SMTP for outbound mail

Incoming:
Cloudflare Email Routing
→ Cloudflare Worker
→ `POST /api/inbound`
→ PostgreSQL
→ webmail inbox

## Backend setup

1. Install Node.js 22+ and PostgreSQL on a VPS/server.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `DATABASE_URL`, `JWT_SECRET`, `MAIL_DOMAIN`, `SMTP_PASS`, and `INBOUND_WEBHOOK_SECRET`.
4. From `backend/` run:
   `npm install`
   `npm run db:init`
   `npm start`
5. Put Nginx/Caddy in front of the Node app and expose:
   `https://api.rebotics.in`
6. Set `FRONTEND_ORIGIN=https://mail.rebotics.in`.

## Cloudflare outbound mail

Cloudflare Email Service currently supports outbound sending through Workers, REST API, and authenticated SMTP. This backend uses SMTP:

Host: `smtp.mx.cloudflare.net`
Port: `465`
TLS: implicit
Username: `api_token`
Password: Cloudflare API token with Email Sending: Edit

Onboard `rebotics.in` under Cloudflare Email Service > Email Sending and configure the domain's DNS/authentication records.

## Cloudflare inbound mail

1. Deploy `cloudflare-inbound` as a Worker.
2. Set:
   `BACKEND_INBOUND_URL=https://api.rebotics.in/api/inbound`
   `INBOUND_WEBHOOK_SECRET=<same secret as backend>`
3. In Cloudflare Email Service > Email Routing, route the desired `@rebotics.in` addresses to the Worker.
4. The Worker posts incoming messages to the backend.

## Security

- Never commit `.env`.
- Use a long random JWT secret.
- Use a separate random inbound webhook secret.
- Use HTTPS only.
- Restrict CORS to `https://mail.rebotics.in`.
- Add rate limiting/WAF before public launch.
- Add email verification and password reset before opening registration to the public.
- Add a MIME parser for inbound RFC822 messages before treating `raw` as plain text.
- Add attachment storage (object storage) rather than putting large attachments in PostgreSQL.

## Important limitation

Cloudflare Email Routing is primarily routing/processing, not a complete IMAP mailbox service. This architecture stores received messages in PostgreSQL for your custom webmail UI. It does not expose IMAP/POP3 for conventional mail clients such as Outlook/Thunderbird. If you need IMAP/POP3, deploy a real mailbox stack such as Postfix + Dovecot or use a hosted mailbox provider.

## Frontend

Use `frontend/app.js` as the API integration layer for the existing GitHub Pages app. Set:

`API_BASE = "https://api.rebotics.in/api"`

Do not put SMTP/API secrets in GitHub Pages JavaScript.
