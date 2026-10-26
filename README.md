# presenca.borysta.com

The public website of Presença, the patient management platform with AI by Borysta. One static page in Brazilian Portuguese, a page with all questions and two legal pages: no build step, no framework, no third-party requests, no cookies.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | The page (round 3, 25.10.2026, changed in round 4 on 26.10.2026), built on the structure of a large Brazilian fintech landing page in Presença's colours: white header, navy hero with the sign-up card and the office film up to the right edge, without and with Presença as a switch over three drawn situations, the clinic in a notebook and a phone with six features in fine frames and the payment methods, the platform inside (seven tabs with real screens of the demo clinic) and one example message, who it is for, the demo figures with the counter, the segments as wordmarks, the professional's day on the phone, five questions with the button to all questions, the footer with the contact block and the legal pages, and the login window |
| `duvidas.html` | All questions (the five of the home page and eight more), with the header and footer of the home page |
| `politica-de-privacidade.html`, `termos-de-uso.html` | Privacy policy and terms of use, linked in the footer of every page. Until the reviewed texts arrive they show the notice "Texto em revisão jurídica" and carry `noindex` |
| `assets/site.css` | All styles. Colours and the one radius are tokens at the top, the parts follow in the order of the page, the widths (1180, 960, 720 px) come last |
| `assets/site.js` | The living parts: mobile menu, the menu mark for the section in view, the hero film with its pause button, the pictures that open once, the switch between without and with, the counter, tabs, the agenda before and after, the sign-up card and the login window. The page reads and works without it |
| `assets/fonts/` | Figtree 400 to 800 as woff2, self-hosted (no Google Fonts, no visitor data leaves the site) |
| `assets/img/` | Photographs from the Presença and Borysta pools (Pexels licence), cut and graded by `tools/photos.py` |
| `assets/video/` | The hero film (Pexels 32952038, the same eight-second cut as on the Borysta site) without sound: 1920 × 1080 for wide windows, 960 × 540 for phones and tablets, and its first frame as the still |
| `assets/img/app/` | Screens of the click dummy (`Borysta_App_Presenca-Demo_PT-EN.html`, state of 07.10.2026) with its demo clinic and fictitious data, 1600 × 1000 px as WebP, and `meu-dia.webp`, the role Dentista on a phone (780 × 1688 px) |
| `assets/logo/` | Presença mark (navy and white), Borysta wordmark, favicon |
| `tools/serve.mjs` | Local preview: `node tools/serve.mjs 8766` then open http://127.0.0.1:8766 |
| `tools/photos.py` | Rebuilds `assets/img/` from the picture pools in the Borysta work folder; `python3 tools/photos.py sobre.jpg` rebuilds a single picture, `medica` the hero portrait |
| `tools/cutout.swift` | Frees the hero portrait from its background with Apple's Vision framework (macOS 14 or later); `photos.py` compiles and calls it |
| `tools/encode.swift` | Makes the two film sizes with Apple's AVFoundation: `swiftc -O tools/encode.swift -o /tmp/encode`, then `/tmp/encode <in.mp4> assets/video/hero-1080.mp4 1920 1080 3000000` and `... hero-540.mp4 960 540 900000` |
| `tools/rede.py` | Draws `assets/img/rede.svg`, a network texture the page no longer uses |
| `CNAME`, `robots.txt`, `sitemap.xml` | GitHub Pages domain and the two files search engines ask for |

## The links into the app

"Entrar" and "Criar conta" lead to the app's own screens (`/#/login` and `/#/cadastro`). The app address appears 16 times in `index.html` and 6 times in `duvidas.html` (links, the `action` of the sign-up card and of the login window); search for `dev.presenca.borysta.com` and replace every one with the production address on launch day. Until a production environment exists, the links lead to the development environment, which asks for its shared password.

The login window on this page shows the app's login screen. It is a picture of the real thing, not a sign-in: its fields carry no `name`, nothing typed there is sent or stored, and its button only opens the app's own login page, where the visitor signs in. The same holds for the e-mail field of the sign-up card in the hero: nothing typed there leaves the page, the button only opens the app's own sign-up page. The real sign-in and sign-up stay in the app.

## Deploying

The site is not published from GitHub. Download the `main` branch (Code, Download ZIP) and copy everything except `tools/`, `.claude/`, `README.md` and `CNAME` into the web root of the server; there is nothing to compile. The server must answer range requests (HTTP 206) for the films, otherwise Safari does not play them. `canonical`, `robots.txt` and `sitemap.xml` name `https://presenca.borysta.com/`; change them if the site runs under another address. `CNAME` is only read by GitHub Pages.

## Rules the page follows

- Presença colours as flat fields: navy `#042B54` as ink and dark field, a neutral grey `#F4F4F4` as the alternating ground, green `#39C526` for the main buttons (navy text, 6.2:1) and the counter, blue `#2B88B3` only as the fine frame of the feature fields, at low opacity. One typeface, Figtree.
- The house list of 30 AI tells (vault note "KI-Merkmale im Design", 22.10.2026) applies in full: no gradients, no box shadows, no icons, no pastel fields, no lines of 1 px except the frames of the feature fields (approved for this page, 26.10.2026), no blur, no hover movement (buttons and links only change colour), no tick bullets, no AI symbol, no labels above headings, no step numbers. Buttons are fully round; fields, boxes, tabs and the message bubbles keep 4 px; only the drawn notebook and phones have the corners of a device. Section headings stand centred where the layout asks for it (approved for this page, 25.10.2026).
- Every headline fits two lines at 1440, 768 and 390 px, running text is 16 to 17 px, nothing is smaller than 14 px.
- Motion: the hero film plays muted in a loop and stops with its button ("Pausar", "Continuar"); with `prefers-reduced-motion` or without the script it stays a still. The photographs and screens below open once as they come into view (`data-reveal`), and the counter of the demo clinic counts up once to R$ 8.140 (screen readers get the final value). Texts and buttons stay still. Only `transform`, `opacity` and `clip-path` move; with `prefers-reduced-motion` everything stands at once, and without the script or in print nothing is hidden.
- Content is never hidden when scripts fail: without the script all seven screens and both flows (without and with) stand one below the other, the counter shows its final value, and "Entrar" leads straight to the app.
- Every name, time, clinic and figure on the page comes from the click dummy's demo clinic and is marked "Dados fictícios". No customer names, no testimonials: the one message shown is an example of the demo clinic and says so; the segments stand as words where other pages show customer logos.
- "WhatsApp" is not named until Meta's approval; the page says "mensagens".

## Before launch

- Replace the notice on the two legal pages with the reviewed texts, then drop their `noindex` and add them to `sitemap.xml`.
- Replace the app address (see above) once production exists.
- No longer used, kept until their removal is approved: `assets/img/marca-*.jpg` (six pictures of the first version), `assets/img/medica-*.webp` (the former hero portrait), `assets/img/rede.svg` with `tools/rede.py`, and since round 3 `assets/img/faixa.jpg`, `recepcao.jpg`, `mundo-*.jpg` (five) and `assets/img/app/passo-*.webp` (three).
