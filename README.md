# presenca.borysta.com

The public website of Presença, the patient management platform with AI by Borysta. One static page in Brazilian Portuguese: no build step, no framework, no third-party requests, no cookies.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | The page, laid out after the Phlox "Medical" demo in Presença's colours: hero with the freed portrait and cards from the platform, what Presença does, about with the three moments, the features carousel, the platform inside (seven tabs with real screens of the demo clinic), why Presença with the counters, who it is for, the photo band, the contact form, message examples, the contact bar, how it works in three steps, the footer with the clinic login row, and the login window |
| `assets/site.css` | All styles. Colours, gradients and shadows are tokens at the top, the parts follow in the order of the page, the widths (1320, 1180, 960, 720, 420 px) come last |
| `assets/site.js` | The living parts: header, mobile menu, entrances, counters, carousels, tabs, the agenda before and after, the login window, the contact mail. The page reads and works without it |
| `assets/fonts/` | Figtree 400 to 800 as woff2, self-hosted (no Google Fonts, no visitor data leaves the site) |
| `assets/img/` | Photographs from the Presença and Borysta pools (Pexels licence), cut and graded by `tools/photos.py`; the network texture `rede.svg` is drawn by `tools/rede.py` |
| `assets/img/app/` | Screens of the click dummy (`Borysta_App_Presenca-Demo_PT-EN.html`, state of 07.10.2026) with its demo clinic and fictitious data, 1600 × 1000 px as WebP, three crops for the steps |
| `assets/logo/` | Presença mark (navy and white), Borysta wordmark, favicon |
| `tools/serve.mjs` | Local preview: `node tools/serve.mjs 8766` then open http://127.0.0.1:8766 |
| `tools/photos.py` | Rebuilds `assets/img/` from the picture pools in the Borysta work folder; `python3 tools/photos.py sobre.jpg` rebuilds a single picture, `medica` the hero portrait |
| `tools/cutout.swift` | Frees the hero portrait from its background with Apple's Vision framework (macOS 14 or later); `photos.py` compiles and calls it |
| `tools/rede.py` | Draws `assets/img/rede.svg`, a fixed seed so the picture stays the same |
| `CNAME`, `robots.txt`, `sitemap.xml` | GitHub Pages domain and the two files search engines ask for |

## The links into the app

"Entrar" and "Criar conta" lead to the app's own screens (`/#/login` and `/#/cadastro`). The app address appears 14 times in `index.html` (links and the `action` of the two login forms); search for `dev.presenca.borysta.com` and replace every one with the production address on launch day. Until a production environment exists, the links lead to the development environment, which asks for its shared password.

The login window on this page shows the app's login screen. It is a picture of the real thing, not a sign-in: its fields carry no `name`, nothing typed there is sent or stored, and its button only opens the app's own login page, where the visitor signs in. The same holds for the e-mail field in the footer, which only fills the window. The real sign-in and sign-up stay in the app.

## Deploying

GitHub Pages from the `main` branch, custom domain `presenca.borysta.com` (the `CNAME` file). DNS: a `CNAME` record `presenca` pointing at `borysta-presenca.github.io`. Any static host works as well; there is nothing to compile.

## Rules the page follows

- Presença colours: navy `#042B54` as ink and dark field, green `#39C526` and blue `#2B88B3` as the brand gradient on buttons, lines and frames, text tiles from navy into a dark blue. Buttons carry navy text so the gradient keeps a contrast of 4.5:1. One typeface, Figtree.
- The template asks for gradients, shadows, rounded cards with icons and small labels above the headings; the taste-skill inspector reports these as FAIL on purpose. Nothing else fails: every headline fits two lines at 1440, 768 and 390 px, running text is 16 px, nothing is smaller than 13 px.
- House rules of 22.10.2026: no tick marks as bullets, no sparkle symbol for AI, cards that are not links stay still under the mouse.
- Motion is transform and opacity only. The hero cards float once on arrival, under five seconds. `prefers-reduced-motion` switches motion off. Content is never hidden when scripts fail: without the script all seven screens stand one below the other.
- Every name, time, clinic and figure on the page comes from the click dummy's demo clinic and is marked "Dados fictícios". No customer names, no testimonials.
- "WhatsApp" is not named until Meta's approval; the page says "mensagens".
- The contact form sends nothing to a server: it opens the visitor's own mail program with a ready message to Anna.

## Before launch

- Privacy policy and terms of use are not linked yet; they go live after legal review.
- Replace the app address (see above) once production exists.
- `assets/img/marca-*.jpg` (six pictures of the first version) are no longer used; they stay until their removal is approved.
