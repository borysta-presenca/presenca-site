// presenca.borysta.com, round 3. The page reads and works without this file; the script adds the mobile menu,
// the mark on the menu for the section in view, the hero film, the pictures that open once, the switch between without and with,
// the counter, the tabs, the agenda before and after and the login window. Nothing here talks to a server: the sign-up card and the
// login window only lead to the app, and nothing typed on this page is sent anywhere.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // --- the mobile menu: the button says what it does, Escape and a chosen link close it ---
  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.textContent = open ? 'Fechar' : 'Menu';
    drawer.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => setMenu(drawer.hidden));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setMenu(false); burger.focus(); } });
  matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // --- the menu marks the section in view ---
  const links = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-on', a.hash === `#${e.target.id}`));
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = $(a.hash); if (s) spy.observe(s); });
  }

  // --- the hero film: plays muted in a loop with a button to stop it; a wish for reduced motion keeps it a still ---
  const film = $('[data-hero-video]');
  const pause = $('[data-hero-pause]');
  if (film && pause && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const say = () => { pause.textContent = film.paused ? 'Continuar' : 'Pausar'; };
    film.addEventListener('play', say);
    film.addEventListener('pause', say);
    pause.addEventListener('click', () => (film.paused ? film.play() : film.pause()));
    pause.hidden = false;
    // Safari skips a play() that comes before the film has chosen its source (preload="none"); load() makes it choose first
    film.load();
    film.play().catch(say);
  }

  // --- photographs and screens open once when they come into view; without the observer nothing is hidden ---
  if ('IntersectionObserver' in window) {
    const shown = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); shown.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('[data-reveal]').forEach((el) => shown.observe(el));
    document.documentElement.classList.add('motion');
  }

  // --- without and with: one flow at a time; without the script both stand one below the other ---
  const sw = $('[data-switch]');
  if (sw) {
    const flows = $$('[data-flow]');
    const show = (key) => {
      $$('button', sw).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.show === key)));
      flows.forEach((f) => { f.hidden = f.dataset.flow !== key; });
    };
    $$('button', sw).forEach((b) => b.addEventListener('click', () => show(b.dataset.show)));
    sw.hidden = false;
    show('sem');
  }

  // --- the counter of the demo clinic counts up once when it comes into view; the HTML already holds the final value ---
  const count = $('[data-count]');
  if (count && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const end = Number(count.dataset.count);
    const fmt = (n) => `R$\u00a0${n.toLocaleString('pt-BR')}`;
    const run = () => {
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / 1600, 1);
        count.textContent = fmt(Math.round(end * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    // screen readers get the final value once; the moving number is only for the eye
    const said = document.createElement('span');
    said.className = 'sr';
    said.textContent = count.textContent;
    count.before(said);
    count.setAttribute('aria-hidden', 'true');
    count.textContent = fmt(0);
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { seen.disconnect(); run(); }
    }, { rootMargin: '0px 0px -15% 0px' });
    seen.observe(count);
  }

  // --- tabs: one screen at a time; without the script all screens stand one below the other ---
  const tabs = $('[data-tabs]');
  if (tabs) {
    const list = $('[role="tablist"]', tabs);
    const buttons = $$('[role="tab"]', tabs);
    const panels = $$('[role="tabpanel"]', tabs);
    const select = (i, focus) => {
      buttons.forEach((b, j) => {
        const on = i === j;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) buttons[i].focus();
    };
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select((to + buttons.length) % buttons.length, true);
      });
    });
    list.hidden = false;
    select(0);
  }

  // --- the agenda before and after: cancelled now, recovered by the waiting list ---
  const toggle = $('[data-toggle]');
  if (toggle) {
    const shots = $$('img', $('[data-states]'));
    toggle.hidden = false;
    $$('button', toggle).forEach((b) => b.addEventListener('click', () => {
      $$('button', toggle).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      shots.forEach((img, i) => { img.hidden = String(i) !== b.dataset.show; });
    }));
  }

  // --- the login window: the look of the app's own login; entering always continues in the app ---
  const dialog = $('[data-dialog]');
  if (dialog && typeof dialog.showModal === 'function') {
    const mail = $('#l-mail', dialog);
    const open = (email) => {
      dialog.showModal();
      if (email) mail.value = email;
      // a phone keeps its keyboard closed until the visitor taps a field
      if (matchMedia('(pointer: fine)').matches) (email ? $('#l-pass', dialog) : mail).focus();
    };
    $$('[data-login]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(); }));
    $('[data-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    // nothing typed here is sent anywhere: the app asks for it again on its own, secure page
    $('[data-login-go]', dialog).addEventListener('submit', (e) => { e.preventDefault(); location.href = e.target.action; });
  }

  // --- the sign-up card: the e-mail stays on this page, the visitor continues on the app's own sign-up page ---
  const signup = $('[data-signup]');
  signup?.addEventListener('submit', (e) => { e.preventDefault(); location.href = signup.action; });
})();
