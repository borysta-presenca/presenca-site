// presenca.borysta.com. The page reads without any of this; the script adds the living parts:
// the agenda on the first screen, the pinned inbox, the switches, the row that confirms, the
// changing photograph and the entrances. Nothing here talks to a server.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- entrances: reveal once when a part enters the viewport, never leave content hidden ---
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length) {
    if (!('IntersectionObserver' in window)) targets.forEach((el) => el.classList.add('is-in'));
    else {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
      targets.forEach((el) => io.observe(el));
      addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
      }), 2500));
    }
  }

  // --- the agenda: cancel a slot, the waiting list gets the message, the first to answer takes it ---
  const agenda = document.querySelector('[data-agenda]');
  if (agenda) {
    const rows = agenda.querySelector('[data-rows]');
    const waitEl = agenda.querySelector('[data-wait]');
    const chat = agenda.querySelector('[data-chat]');
    const count = agenda.querySelector('.agenda__count');
    const pointer = agenda.querySelector('.pointer');
    const initial = { rows: rows.innerHTML, wait: waitEl.innerHTML, chat: chat.innerHTML, count: count.textContent };
    let minute = 2;
    const clock = () => `10:${String(minute++).padStart(2, '0')}`;
    const first = (name) => name.split(' ')[0];
    const say = (kind, text) => {
      chat.querySelector('.chat__note')?.remove();
      const p = document.createElement('p');
      p.className = `chat__m ${kind}`;
      p.innerHTML = `${text}<time>${clock()}</time>`;
      chat.appendChild(p);
      chat.scrollTop = chat.scrollHeight;
    };
    const recount = () => {
      const booked = rows.querySelectorAll('.row:not(.row--free)').length;
      const waiting = waitEl.querySelectorAll('li[data-name]').length;
      count.textContent = `${booked} atendimentos · ${waiting} na lista de espera`;
    };
    const timers = [];
    rows.addEventListener('click', (e) => {
      const cancel = e.target.closest('[data-cancel]');
      const approve = e.target.closest('[data-approve]');
      if (cancel) {
        pointer?.remove();
        const row = cancel.closest('.row');
        const time = row.dataset.time;
        const who = row.querySelector('.row__who').textContent;
        row.classList.remove('row--ok', 'row--new');
        row.classList.add('row--free');
        row.querySelector('.row__st').textContent = 'Horário livre';
        row.querySelector('.row__st').className = 'row__st';
        cancel.remove();
        say('in', `${first(who)}: Hoje não vou poder ir.`);
        const next = waitEl.querySelector('li[data-name]');
        recount();
        if (!next) { say('sys', `${time} ficou livre. A lista de espera está vazia.`); return; }
        const name = next.dataset.name, kind = next.dataset.kind;
        timers.push(setTimeout(() => say('out', `Olá, ${first(name)}! Sou o assistente da Clínica Bem-Estar. Abriu um horário hoje às ${time} para ${kind}. Quer ficar com ele? Responda SIM.`), 700));
        timers.push(setTimeout(() => {
          say('in', `${first(name)}: SIM`);
          next.remove();
          if (!waitEl.querySelector('li[data-name]')) waitEl.innerHTML = '<li class="wait--empty">Ninguém esperando.</li>';
          row.innerHTML = `<span class="row__t">${time}</span><span class="row__who">${name}</span><span class="row__what">${kind} · da lista de espera</span><span class="row__st">Aguardando aprovação</span><button type="button" class="row__approve" data-approve>Aprovar</button>`;
          row.classList.remove('row--free');
          row.classList.add('row--new');
          recount();
        }, 2300));
      }
      if (approve) {
        const row = approve.closest('.row');
        row.querySelector('.row__st').textContent = 'Confirmado';
        row.querySelector('.row__st').classList.add('row__st--ok');
        row.classList.remove('row--new');
        row.classList.add('row--ok');
        approve.remove();
        say('sys', `Horário recuperado: ${row.querySelector('.row__who').textContent} às ${row.dataset.time}.`);
      }
    });
    agenda.querySelector('[data-reset]')?.addEventListener('click', () => {
      timers.forEach(clearTimeout);
      rows.innerHTML = initial.rows; waitEl.innerHTML = initial.wait; chat.innerHTML = initial.chat; count.textContent = initial.count; minute = 2;
    });
  }

  // --- the pinned inbox: the statement nearest the centre sets the state of the fragment ---
  const stage = document.querySelector('[data-stage]');
  const steps = [...document.querySelectorAll('[data-step]')];
  if (stage && steps.length) {
    stage.dataset.state = '1';
    steps[0].classList.add('is-active');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) {
          steps.forEach((s) => s.classList.toggle('is-active', s === e.target));
          stage.dataset.state = e.target.dataset.step;
        }
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
      steps.forEach((s) => io.observe(s));
    } else stage.dataset.state = '3';
    stage.querySelector('[data-approve]')?.addEventListener('click', (e) => {
      e.target.hidden = true;
      stage.querySelector('.ok').hidden = false;
    });
  }

  // --- the switches on the bands ---
  document.querySelectorAll('[data-sw]').forEach((sw) => {
    sw.addEventListener('click', () => {
      if (sw.getAttribute('aria-disabled') === 'true') return;
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      sw.closest('[data-band]').classList.toggle('is-on', on);
    });
  });

  // --- the row that confirms ---
  const live = document.querySelector('[data-live]');
  live?.querySelector('[data-confirm]')?.addEventListener('click', () => {
    const row = live.querySelector('[data-live-row]');
    row.classList.remove('is-hover');
    row.classList.add('is-done');
    row.querySelector('.pointer')?.remove();
    live.querySelector('[data-live-acts]').remove();
    live.querySelector('[data-live-chip]').textContent = 'Confirmado';
    live.querySelector('[data-live-note]').textContent = 'Confirmado pela recepção agora';
    live.querySelector('[data-live-state]').textContent = 'Confirmado';
  });

  // --- the sign-up fragment: the choice switches ---
  document.querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
    b.parentElement.querySelectorAll('[data-seg]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  }));

  // --- the changing photograph: four worlds, one framing, light shifting in a room ---
  const fade = document.querySelector('[data-fade]');
  if (fade) {
    const imgs = [...fade.querySelectorAll('img')];
    imgs[0].classList.add('is-on');
    if (!reduced && imgs.length > 1) {
      let i = 0, timer = null;
      const next = () => { imgs[i].classList.remove('is-on'); i = (i + 1) % imgs.length; imgs[i].classList.add('is-on'); };
      const start = () => { if (!timer) timer = setInterval(next, 5500); };
      const stop = () => { clearInterval(timer); timer = null; };
      document.addEventListener('visibilitychange', () => (document.hidden || paused ? stop() : start()));
      let paused = false;
      const pause = fade.querySelector('[data-fade-pause]');
      pause?.addEventListener('click', () => {
        paused = !paused;
        pause.setAttribute('aria-pressed', String(paused));
        pause.textContent = paused ? 'Continuar as fotos' : 'Pausar as fotos';
        paused ? stop() : start();
      });
      start();
    }
  }
})();
