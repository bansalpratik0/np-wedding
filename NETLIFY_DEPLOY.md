# Deploying nishikapratik.com with GitHub and Netlify

## 1. Push this folder to GitHub

Create an empty GitHub repository, for example:

`nishikapratik-wedding`

From this folder, run:

```bash
git init
git add .
git commit -m "Initial wedding website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nishikapratik-wedding.git
git push -u origin main
```

## 2. Import the repository into Netlify

1. Sign in to Netlify.
2. Select **Add new project** → **Import an existing project**.
3. Choose GitHub and select `nishikapratik-wedding`.
4. Netlify should read `netlify.toml` automatically.
5. Leave the build command empty.
6. The publish directory is `.`.
7. Deploy the site.

Every future push to the `main` branch will update the production website.

## 3. Connect nishikapratik.com

1. Open the Netlify project.
2. Go to **Domain management**.
3. Select **Add a domain**.
4. Enter `nishikapratik.com`.
5. Follow the DNS records Netlify displays at your domain registrar.
6. Add `www.nishikapratik.com` as a domain alias if desired.
7. Choose the preferred primary domain so Netlify redirects the other version.

Netlify will provision HTTPS after DNS validation.

## 4. Updating wedding information

Edit `content.js` for:

- Events and dates
- Dress palettes
- Travel guidance
- Accommodation
- FAQs
- Guest-help categories

Then publish updates with:

```bash
git add .
git commit -m "Update wedding details"
git push
```

## RSVP backend

The RSVP uses a Netlify Function at `/.netlify/functions/rsvp` with Netlify Blobs for persistent storage.

Netlify installs the `@netlify/blobs` dependency from `package.json` during deploy. RSVP records persist across deployments. Guests receive private edit links that reopen the same RSVP record.


## Gmail setup for RSVP edit links

The RSVP function sends the guest's private edit link from `nishikapratik@gmail.com` using Gmail SMTP.

1. Enable 2-Step Verification on `nishikapratik@gmail.com`.
2. Create a Google App Password for the website.
3. In Netlify, open **Site configuration → Environment variables**.
4. Add `GMAIL_APP_PASSWORD` with the generated App Password.
5. Redeploy the site.

Never commit the App Password to GitHub.
