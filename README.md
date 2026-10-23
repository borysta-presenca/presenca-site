# presenca.borysta.com

The public website of Presença, the patient management platform with AI by Borysta. One static page in Brazilian Portuguese and two legal pages: no build step, no framework, no third-party requests, no cookies.

## What is here

| Path | What it is |
| --- | --- |
| `index.html` | The page, laid out after the Phlox "Medical" demo in Presença's colours: hero with a quiet office film on the navy field, what Presença does, about with the three moments, nine features, the platform inside (seven tabs with real screens of the demo clinic), why Presença with the demo figures, who it is for, the photo band, the contact form, message examples, the contact bar, how it works in three steps, the footer with the clinic login row and the legal pages, and the login window |
| `politica-de-privacidade.html`, `termos-de-uso.html` | Privacy policy and terms of use, linked in the footer of every page. Until the reviewed texts arrive they show the notice "Texto em revisão jurídica" and carry `noindex` |
| `assets/site.css` | All styles. Colours and the one radius are tokens at the top, the parts follow in the order of the page, the widths (1180, 960, 720, 420 px) come last |
| `assets/site.js` | The living parts: mobile menu, the menu mark for the section in view, the hero film with its pause button, the pictures that open once, tabs, the agenda before and after, the login window, the contact mail. The page reads and works without it |
| `assets/fonts/` | Figtree 400 to 800 as woff2, self-hosted (no Google Fonts, no visitor data leaves the site) |
| `assets/img/` | Photographs from the Presença and Borysta pools (Pexels licence), cut and graded by `tools/photos.py` |
| `assets/video/` | The hero film (Pexels 32952038, the same eight-second cut as on the Borysta site) without sound: 1920 × 1080 for wide windows, 960 × 540 for phones and tablets, and its first frame as the still |
| `assets/img/app/` | Screens of the click dummy (`Borysta_App_Presenca-Demo_PT-EN.html`, state of 07.10.2026) with its demo clinic and fictitious data, 1600 × 1000 px as WebP, three crops for the steps |
| `assets/logo/` | Presença mark (navy and white), Borysta wordmark, favicon |
| `tools/serve.mjs` | Local preview: `node tools/serve.mjs 8766` then open http://127.0.0.1:8766 |
| `tools/photos.py` | Rebuilds `assets/img/` from the picture pools in the Borysta work folder; `python3 tools/photos.py sobre.jpg` rebuilds a single picture, `medica` the hero portrait |
| `tools/cutout.swift` | Frees the hero portrait from its background with Apple's Vision framework (macOS 14 or later); `photos.py` compiles and calls it |
| `tools/encode.swift` | Makes the two film sizes with Apple's AVFoundation: `swiftc -O tools/encode.swift -o /tmp/encode`, then `/tmp/encode <in.mp4> assets/video/hero-1080.mp4 1920 1080 3000000` and `... hero-540.mp4 960 540 900000` |
| `tools/rede.py` | Draws `assets/img/rede.svg`, a network texture the page no longer uses |
| `CNAME`, `robots.txt`, `sitemap.xml` | GitHub Pages domain and the two files search engines ask for |

## The links into the app

"Entrar" and "Criar conta" lead to the app's own screens (`/#/login` and `/#/cadastro`). The app address appears 14 times in `index.html` (links and the `action` of the two login forms); search for `dev.presenca.borysta.com` and replace every one with the production address on launch day. Until a production environment exists, the links lead to the development environment, which asks for its shared password.

The login window on this page shows the app's login screen. It is a picture of the real thing, not a sign-in: its fields carry no `name`, nothing typed there is sent or stored, and its button only opens the app's own login page, where the visitor signs in. The same holds for the e-mail field in the footer, which only fills the window. The real sign-in and sign-up stay in the app.

## Deploying

GitHub Pages from the `main` branch, custom domain `presenca.borysta.com` (the `CNAME` file). DNS: a `CNAME` record `presenca` pointing at `borysta-presenca.github.io`. Any static host works as well; there is nothing to compile.

## Rules the page follows

- Presença colours as flat fields: navy `#042B54` as ink and dark field, a neutral grey `#F4F4F4` behind cards and screens, green `#39C526` for the main buttons (navy text, 6.2:1), blue `#2B88B3` only behind the large white text of the contact bar. One typeface, Figtree.
- The house list of 30 AI tells (vault note "KI-Merkmale im Design", 22.10.2026) applies in full: no gradients, no box shadows, no icons, no pastel fields, no lines of 1 px, no blur, no hover movement (buttons and links only change colour), no tick bullets, no AI symbol, no labels above headings, no step numbers. Only buttons, fields and the message bubbles are rounded, by 4 px.
- Every headline fits two lines at 1440, 768 and 390 px, running text is 16 to 17 px, nothing is smaller than 14 px.
- Motion: the hero film plays muted in a loop and stops with its button ("Pausar", "Continuar"); with `prefers-reduced-motion` or without the script it stays a still. The 13 photographs and screens below open once as they come into view (`data-reveal`). Texts and buttons stay still. Only `transform`, `opacity` and `clip-path` move; with `prefers-reduced-motion` everything stands at once, and without the script or in print nothing is hidden.
- Content is never hidden when scripts fail: without the script all seven screens stand one below the other, and "Entrar" leads straight to the app.
- Every name, time, clinic and figure on the page comes from the click dummy's demo clinic and is marked "Dados fictícios". No customer names, no testimonials.
- "WhatsApp" is not named until Meta's approval; the page says "mensagens".
- The contact form sends nothing to a server: it opens the visitor's own mail program with a ready message to Anna.

## Before launch

- Replace the notice on the two legal pages with the reviewed texts, then drop their `noindex` and add them to `sitemap.xml`.
- Replace the app address (see above) once production exists.
- `assets/img/marca-*.jpg` (six pictures of the first version), `assets/img/medica-*.webp` (the former hero portrait), `assets/img/rede.svg` and `tools/rede.py` are no longer used; they stay until their removal is approved.
