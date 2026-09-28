# Nishika & Pratik Wedding Website

Dark, responsive wedding website for **nishikapratik.com**.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- No build system
- No runtime dependencies
- Netlify-ready configuration

## Features

- Responsive desktop and mobile layout
- Night-time visual design
- Wedding countdown
- Event schedule and `.ics` calendar downloads
- Dress mood boards and color palettes
- Travel guidance for India, the United States, Nigeria, and elsewhere
- Accommodation and checkout information
- Searchable FAQs
- Persistent RSVP with private edit links and editable travel details
- Guest Help Centre structure
- Wedding Mode announcement preview
- Social-sharing artwork

## Project structure

```text
.
├── index.html
├── styles.css
├── script.js
├── content.js
├── netlify.toml
├── NETLIFY_DEPLOY.md
├── README.md
└── assets/
    ├── favicon.svg
    ├── monogram.svg
    └── og-card.svg
```

## Edit wedding content

Most editable information is in `content.js`.

Update that file for:

- Event titles, dates, times, and descriptions
- Dress guidance and palettes
- Travel and accommodation information
- FAQs
- Guest-help categories

## Preview locally

From the project folder:

```bash
python3 -m http.server 8080
```

Open:

`http://localhost:8080`

## Deploy

Follow `NETLIFY_DEPLOY.md`.

## RSVP status

The RSVP is live-backed through a Netlify Function and Netlify Blobs.

- One attendance response covers the entire wedding.
- Guests receive a private edit link after submitting.
- Returning through that link reloads the same RSVP for edits.
- Travel, accommodation, dietary requirements, party size, and notes can be updated later.
- RSVP records persist across deploys.
