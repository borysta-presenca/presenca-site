# presenca.borysta.com

The public website of Presença, the appointment book with messages and an assistant, by Borysta. One static page in Brazilian Portuguese: no build step, no framework, no third-party requests, no cookies.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | The page: hero with the working agenda, what Presença is, how it works (pinned inbox), six capabilities with switches, one appointment in three states, who it is for, the sign-up fragment, footer |
| `assets/site.css` | All styles. Colours and type are tokens at the top; one alignment line at 27% of the width carries the page |
| `assets/site.js` | The living parts: agenda demo, pinned inbox, switches, confirming row, crossfade, entrances. The page reads without it |
| `assets/fonts/` | Figtree 400 to 800 as woff2, self-hosted (no Google Fonts, no visitor data leaves the site) |
| `assets/img/` | Photographs from the Presença pool (Pexels licence), cut and graded by `tools/photos.py` |
| `assets/logo/` | Presença mark (navy and white), Borysta wordmark, favicon |
| `tools/serve.mjs` | Local preview: `node tools/serve.mjs 8766` then open http://127.0.0.1:8766 |
| `tools/photos.py` | Rebuilds `assets/img/` from the picture pool in the Borysta work folder |
| `CNAME`, `robots.txt`, `sitemap.xml` | GitHub Pages domain and the two files search engines ask for |

## The links into the app

"Entrar" and "Criar conta" point at the app's own screens (`/#/login` and `/#/cadastro`). The app address appears in four `href` attributes in `index.html`; search for `dev.presenca.borysta.com` and replace it with the production address on launch day. Until a production environment exists, the links lead to the development environment, which asks for its shared password.

## Deploying

GitHub Pages from the `main` branch, custom domain `presenca.borysta.com` (the `CNAME` file). DNS: a `CNAME` record `presenca` pointing at `borysta-presenca.github.io`. Any static host works as well; there is nothing to compile.

## Rules the page follows

- Presença colours only: navy `#042B54` as ink and dark field, green `#39C526` as the accent (the primary action, the switches, the confirmed dot), ice `#DEEEF8` and pearl `#F6FBFE` as grounds, white for the product fragments. One typeface, Figtree.
- Product fragments carry `data-ui`: inside them the product's own borders and radii apply. Outside them: no gradients, no shadows at rest, no hairlines, no icons.
- Every headline fits two lines at 1440, 768 and 390 px. Running text is 16 px in full ink.
- Motion is transform and opacity only; `prefers-reduced-motion` switches it off. Content is never hidden when scripts fail.
- All names, times and clinics on the page are fictitious. No customer names, no figures, no testimonials.
- "WhatsApp" is not named until Meta's approval; the page says "mensagens".

## Before launch

- The privacy policy is not linked yet; it goes live after legal review.
- Replace the app address (see above) once production exists.
