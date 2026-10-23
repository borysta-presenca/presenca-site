// presenca.borysta.com, round 2. The page reads and works without this file; the script adds the login
// window, the tabs, the carousels, the counters, the entrances and the mail from the contact form.
// Nothing here talks to a server: the login window only leads to the app, and the form only opens the
// visitor's own mail program.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const smooth = reduced ? 'auto' : 'smooth';

  // --- header: shadow once the page moves, the back-to-top button, the mobile drawer ---
  const head = $('[data-head]');
  const totop = $('[data-totop]');
  const onScroll = () => {
    head.classList.toggle('is-stuck', scrollY > 8);
    totop.classList.toggle('is-on', scrollY > 900);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
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

  // --- entrances: reveal once when a part enters the viewport, never leave content hidden ---
  const targets = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced) targets.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
    }), 2500));
  }

  // --- counters: numbers below the fold count up once they are seen ---
  const counters = $$('[data-count]').filter((el) => el.getBoundingClientRect().top > innerHeight);
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    const fmt = new Intl.NumberFormat('pt-BR');
    const show = (el, n) => { el.textContent = fmt.format(n) + (el.dataset.suffix || ''); };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        io.unobserve(e.target);
        const el = e.target, end = Number(el.dataset.count), t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / 1600);
          show(el, Math.round(end * (1 - (1 - p) ** 3)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.6 });
    counters.forEach((el) => { show(el, 0); io.observe(el); });
  }

  // --- carousels: the arrows move the track by one card, and switch off at either end ---
  $$('[data-track]').forEach((track) => {
    const [prev, next] = $$(`[data-arrows="${track.dataset.track}"] button`);
    const step = () => track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    const update = () => {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: smooth }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: smooth }));
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });

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
      buttons[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth });
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
    buttons.forEach((b, j) => { b.setAttribute('aria-selected', String(j === 0)); b.tabIndex = j === 0 ? 0 : -1; panels[j].hidden = j !== 0; });
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
    $('[data-login-form]').addEventListener('submit', (e) => { e.preventDefault(); open($('#f-mail').value.trim()); });
    $('[data-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    // nothing typed here is sent anywhere: the app asks for it again on its own, secure page
    $('[data-login-go]', dialog).addEventListener('submit', (e) => { e.preventDefault(); location.href = e.target.action; });
  }

  // --- the contact form: a ready mail to Anna in the visitor's own mail program ---
  const form = $('[data-mail]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (n) => form.elements[n].value.trim() || '-';
    const body = ['Olá, Anna.', '', 'Quero conhecer a Presença.', '', `Nome: ${v('Nome')}`, `E-mail: ${v('E-mail')}`, `Telefone: ${v('Telefone')}`, `Clínica ou negócio: ${v('Clínica')}`].join('\n');
    location.href = `mailto:anna.santana@borysta.com?subject=${encodeURIComponent('Presença: quero conhecer a plataforma')}&body=${encodeURIComponent(body)}`;
  });
})();
