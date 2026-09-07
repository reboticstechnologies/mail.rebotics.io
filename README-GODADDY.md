# Rebotics Mail — GoDaddy Node.js Hosting

This package is a single-app version of the Rebotics Mail project designed for GoDaddy Node.js Hosting.

## Architecture

Browser
  -> https://mail.rebotics.in
  -> Node.js / Express
  -> GoDaddy Managed MySQL
  -> SMTP provider

Incoming mail:
Cloudflare Email Routing
  -> Cloudflare Worker
  -> POST /api/inbound
  -> MySQL
  -> Rebotics Mail inbox

## Why this version differs from the GitHub backend

The GitHub repository currently uses PostgreSQL and separates the frontend and API. GoDaddy's new Node.js Hosting flow supports Node.js apps and offers managed MySQL, so this build combines the frontend + API into one deployable app and uses MySQL for the database. The application retains the same core concepts: authentication, messages, inbound mail, SMTP sending and webmail folders.

## GoDaddy deployment

1. In GoDaddy, open Web Hosting -> Deluxe -> Setup.
2. Use the Node.js Hosting option.
3. Upload this ZIP or connect the GitHub repository after you commit these files.
4. Let GoDaddy detect Node.js. This project targets Node.js 22+.
5. Add the environment variables from `.env.example` in the GoDaddy environment-variable section.
6. Create/configure the managed MySQL database and put its connection values into:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
7. Set `APP_URL=https://mail.rebotics.in`.
8. Set a long random `JWT_SECRET`.
9. Set SMTP values for your actual outbound provider.
10. Set `INBOUND_WEBHOOK_SECRET` to another long random value.
11. Deploy.
12. Point/connect `mail.rebotics.in` to the published Node.js app.
13. Open `/health` to verify the app and database.

The app automatically creates its MySQL tables on startup.

## SMTP

Do NOT put SMTP passwords in browser JavaScript. Only set them as server-side environment variables.

The app expects:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

## User mailboxes

Create a mailbox account through the registration page, or disable public registration and seed users directly in MySQL.

Example domain:
`amit@rebotics.in`

The app sends mail using the authenticated SMTP account configured on the server. If your SMTP provider requires the From address to match the authenticated account, use that account or configure aliases at the provider.

## Incoming mail

Configure Cloudflare Email Routing to send selected `@rebotics.in` addresses to the included Worker. The Worker posts to:

`https://mail.rebotics.in/api/inbound`

The backend authenticates the Worker using `X-Inbound-Secret`.

## Security before public launch

- Change both secrets in `.env`.
- Keep `.env` out of Git.
- Use HTTPS.
- Restrict SMTP credentials to the server.
- Consider disabling public registration after creating your mailboxes.
- Add a proper MIME parser in the Cloudflare Worker if you need production-grade inbound HTML/attachments.
- For high-volume attachments, move attachment storage to object storage instead of MySQL BLOBs.
- Configure SPF, DKIM and DMARC for `rebotics.in` with your actual sending provider.

## Existing GitHub repository

Base repository:
https://github.com/reboticstechnologies/mail.rebotics.io

The repository's current README describes a PostgreSQL + separate API/frontend architecture. This GoDaddy package is an adapted deployment target for the Deluxe hosting shown in your screenshot.


## v3 configuration diagnostics
The server now validates required runtime variables at startup and uses a MySQL transaction during registration so a token/configuration failure cannot leave a partially created mailbox. GoDaddy Preview must expose `JWT_SECRET` to the running process.
