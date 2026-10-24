// Site-wide motion for Brightstack ("premium & calm", see CLAUDE.md).
// Dependency-free and progressive: with JS off or reduced motion on, every
// page is complete and static. Every loop is rAF-throttled and stops off-screen.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasIO = 'IntersectionObserver' in window;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

revealOnScroll();
playInView();
scrollProgress();
if (finePointer && !reduceMotion) {
  spotlight();
  magnetic();
  parallax();
} else if (!finePointer) {
  touchInView();
}

/**
 * Smooth reveals. [data-reveal] reveals as one piece; each direct child of
 * [data-reveal-stagger] reveals on its own, cascading 80ms apart per batch.
 * Only elements that start below the fold are hidden, so nothing visible is
 * ever blanked, and they reveal the moment they enter view.
 */
function revealOnScroll() {
  const items: HTMLElement[] = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  for (const group of document.querySelectorAll<HTMLElement>('[data-reveal-stagger]')) {
    items.push(...([...group.children] as HTMLElement[]));
  }
  for (const el of items) el.classList.add('reveal-item');
  if (reduceMotion || !hasIO) return;

  const vh = window.innerHeight;
  const pending = items.filter((el) => el.getBoundingClientRect().top > vh);
  if (!pending.length) return;

  const io = new IntersectionObserver((entries) => {
    // Stagger within each batch of elements that arrive together, in DOM order.
    const arriving = entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target as HTMLElement)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    arriving.forEach((el, i) => {
      el.style.setProperty('--i', String(Math.min(i, 6)));
      el.classList.remove('reveal-pending');
      io.unobserve(el);
    });
  });
  for (const el of pending) {
    el.classList.add('reveal-pending');
    io.observe(el);
  }
  window.addEventListener('beforeprint', () => pending.forEach((el) => el.classList.remove('reveal-pending')));
}

/** Looping animations ([data-play-in-view]) only run while on screen. */
function playInView() {
  const els = document.querySelectorAll<HTMLElement>('[data-play-in-view]');
  if (!els.length || reduceMotion) return;
  if (!hasIO) {
    els.forEach((el) => el.classList.add('is-playing'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting)),
    { rootMargin: '80px' },
  );
  els.forEach((el) => io.observe(el));
}

/**
 * [data-scroll-progress]: sets --progress (0..1) as the section scrolls
 * through the viewport and marks its [data-step] children active in order.
 */
function scrollProgress() {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-scroll-progress]')];
  if (!sections.length) return;

  const apply = (el: HTMLElement, p: number) => {
    el.style.setProperty('--progress', p.toFixed(3));
    const steps = el.querySelectorAll<HTMLElement>('[data-step]');
    steps.forEach((s, i) => s.classList.toggle('is-active', p >= (i + 0.35) / steps.length));
  };
  if (reduceMotion || !hasIO) {
    sections.forEach((el) => apply(el, 1));
    return;
  }
  for (const el of sections) el.classList.add('progress-ready');

  const visible = new Set<HTMLElement>();
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const el of visible) {
      const r = el.getBoundingClientRect();
      const start = vh * 0.85; // section top here -> 0
      const end = vh * 0.4; // section bottom here -> 1
      apply(el, clamp((start - r.top) / (r.height + start - end), 0, 1));
    }
  };
  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target as HTMLElement);
      else visible.delete(e.target as HTMLElement);
    }
    request();
  });
  sections.forEach((el) => io.observe(el));
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
}

/** Card border glow follows the pointer (sets --mx/--my on .spotlight). */
function spotlight() {
  let target: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  let raf = 0;
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.spotlight');
      if (!el) return;
      target = el;
      x = e.clientX;
      y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${x - r.left}px`);
        target.style.setProperty('--my', `${y - r.top}px`);
      });
    },
    { passive: true },
  );
}

/** Primary buttons lean gently toward the cursor and spring back. */
function magnetic() {
  for (const btn of document.querySelectorAll<HTMLElement>('.btn--primary, [data-magnetic]')) {
    let raf = 0;
    let lastX = 0;
    let lastY = 0;
    btn.addEventListener('pointermove', (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = btn.getBoundingClientRect();
        const dx = lastX - (r.left + r.width / 2);
        const dy = lastY - (r.top + r.height / 2);
        btn.style.setProperty('--mag-x', `${clamp(dx * 0.18, -8, 8).toFixed(1)}px`);
        btn.style.setProperty('--mag-y', `${clamp(dy * 0.3, -5, 5).toFixed(1)}px`);
      });
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mag-x', '0px');
      btn.style.setProperty('--mag-y', '0px');
    });
  }
}

/**
 * [data-parallax]: eases --px/--py (-1..1) toward the pointer position so
 * layers inside can drift at different depths. Idle when off-screen or still.
 */
function parallax() {
  const root = document.querySelector<HTMLElement>('[data-parallax]');
  if (!root || !hasIO) return;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let raf = 0;
  let inView = false;

  const step = () => {
    raf = 0;
    cx += (tx - cx) * 0.07;
    cy += (ty - cy) * 0.07;
    root.style.setProperty('--px', cx.toFixed(4));
    root.style.setProperty('--py', cy.toFixed(4));
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) loop();
  };
  const loop = () => {
    if (!raf && inView) raf = requestAnimationFrame(step);
  };
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    loop();
  }).observe(root);
  window.addEventListener(
    'pointermove',
    (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      loop();
    },
    { passive: true },
  );
}

/** Touch screens can't hover: light cards up as they scroll into view. */
function touchInView() {
  const cards = document.querySelectorAll<HTMLElement>('.spotlight');
  if (!cards.length || !hasIO) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)),
    { rootMargin: '-35% 0px -35% 0px' },
  );
  cards.forEach((c) => io.observe(c));
}
