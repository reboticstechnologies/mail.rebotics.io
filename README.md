# Rebotics Mail — GoDaddy Node.js + Hosted MySQL

Complete same-origin webmail application for `mail.rebotics.in` using GoDaddy Node.js Hosting and GoDaddy Hosted MySQL.

## Important GoDaddy setup

GoDaddy automatically injects `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for the Hosted MySQL database. Leave those five system-managed secrets alone. Do not add a `DATABASE_URL` variable.

The application initializes its MySQL tables automatically at startup.

## Secrets to add in GoDaddy

Add these application secrets:

- `APP_URL` = `https://mail.rebotics.in`
- `MAIL_DOMAIN` = `rebotics.in`
- `JWT_SECRET` = long random value
- `INBOUND_WEBHOOK_SECRET` = different long random value
- `SMTP_HOST` = `smtp.mx.cloudflare.net`
- `SMTP_PORT` = `465`
- `SMTP_SECURE` = `true`
- `SMTP_USER` = `api_token`
- `SMTP_PASS` = Cloudflare Email Sending API token
- `MAIL_FROM_NAME` = `Rebotics Mail`
- `ALLOW_PUBLIC_REGISTRATION` = `true` initially
- `MAX_ATTACHMENT_MB` = `8`
- `COOKIE_SECURE` = `true`

## Cloudflare outbound mail

Cloudflare Email Service authenticated SMTP uses `smtp.mx.cloudflare.net:465`, implicit TLS, username `api_token`, and a Cloudflare API token with Email Sending: Edit permission. The sending domain must be onboarded in Cloudflare Email Service.

## Cloudflare inbound mail

Deploy `cloudflare-inbound` as a separate Cloudflare Email Worker. Set:
- `REBOTICS_INBOUND_URL=https://mail.rebotics.in/api/inbound`
- `INBOUND_WEBHOOK_SECRET=<same value as GoDaddy>`

Then configure Cloudflare Email Routing to send addresses to the Worker. The Worker parses `message.raw` with `postal-mime` and posts the message to Rebotics Mail.

## Features

- Login / registration
- Inbox
- Starred
- Sent
- Drafts
- Spam and Trash folders
- Search
- Read/unread state
- Star/unstar
- Reply
- Compose and send
- Attachments
- Contacts
- Internal Rebotics mailbox delivery
- Cloudflare inbound email Worker
- Cloudflare SMTP outbound delivery
- MySQL auto-initialization
- HttpOnly JWT cookie authentication
- Helmet security headers
- GoDaddy Node.js 22 compatible

## Deployment

Upload this project ZIP to GoDaddy Node.js Hosting or connect the GitHub repository. GoDaddy Node.js Hosting supports ZIP upload or GitHub and runs Node.js 22. Test in Preview first; only publish after `/health`, login, sending, and inbound tests pass.
