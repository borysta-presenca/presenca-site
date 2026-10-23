// presenca.borysta.com, round 2b. The page reads and works without this file; the script adds the mobile menu,
// the mark on the menu for the section in view, the pictures that open once, the tabs, the agenda before and after,
// the login window and the mail from the contact form. Nothing here talks to a server: the login window only leads to the app, and the
// form only opens the visitor's own mail program.
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

  // --- photographs and screens open once when they come into view; without the observer nothing is hidden ---
  if ('IntersectionObserver' in window) {
    const shown = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); shown.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('[data-reveal]').forEach((el) => shown.observe(el));
    document.documentElement.classList.add('motion');
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
