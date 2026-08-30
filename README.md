# Rebotics Mail — GitHub Pages

A complete static webmail **frontend/demo** for `mail.rebotics.in`.

## Files

- `index.html` — application shell and UI
- `assets/style.css` — responsive styling and dark mode
- `assets/app.js` — mailbox demo logic using browser localStorage
- `CNAME` — custom GitHub Pages domain
- `README.md` — deployment instructions

## Deploy to GitHub Pages

1. Create a GitHub repository, for example `rebotics-mail`.
2. Upload the files while preserving the folder structure.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then Save.
6. GitHub will publish the site.
7. The included `CNAME` requests the custom domain `mail.rebotics.in`.

## DNS

At your DNS provider, create a CNAME record:

`mail` → `<your-github-username>.github.io`

If your DNS provider already has a conflicting `mail` A/CNAME record, remove or replace it as appropriate.

Then return to **GitHub → Settings → Pages → Custom domain**, enter:

`mail.rebotics.in`

Enable HTTPS after GitHub verifies the domain.

## Important: this is not an email server

GitHub Pages can host the webmail interface, but it cannot provide real SMTP/IMAP mailboxes, email delivery, or server-side authentication.

The current app is a browser-only demo. "Send" stores a message in localStorage and does **not** send an actual email.

For production, connect the frontend to a real backend/API that handles:

- authentication and sessions
- mailbox storage
- SMTP sending
- IMAP/mailbox synchronization
- attachments
- spam filtering
- password reset
- rate limiting and abuse prevention

Never put SMTP passwords, API secret keys, database credentials, or private tokens into GitHub Pages JavaScript.
