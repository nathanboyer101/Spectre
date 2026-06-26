/* Willi Blocker — script.js */

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      // Don't unobserve — lets re-entrance animations work if needed
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Nav shrink on scroll ──────────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Active nav link on scroll ─────────────────────────────────────────────────
const sections   = document.querySelectorAll('section[id], div[id]');
const navLinks   = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(a => {
        a.classList.toggle('nav-active', a.getAttribute('href') === '#' + id);
      });
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => sectionObserver.observe(s));

// ── Animated counters ─────────────────────────────────────────────────────────
function animateCounter(el) {
  if (el.dataset.animated) return; // don't replay
  el.dataset.animated = '1';
  const target   = parseInt(el.dataset.target, 10);
  const duration = 1200;
  const start    = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-num').forEach(animateCounter);
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

const statsEl = document.getElementById('hero-stats');
if (statsEl) statsObserver.observe(statsEl);

// ── Theme toggle ──────────────────────────────────────────────────────────────
const themeBtn = document.getElementById('themeBtn');

function setTheme(light) {
  document.body.classList.toggle('light-mode', light);
  themeBtn.textContent = light ? '🌙' : '☀️';
  localStorage.setItem('spectre-theme', light ? 'light' : 'dark');
}

themeBtn.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('light-mode'));
});

// Restore saved theme on load (before first paint flash)
if (localStorage.getItem('spectre-theme') === 'light') setTheme(true);

// ── Step hover glow ───────────────────────────────────────────────────────────
document.querySelectorAll('.step').forEach(step => {
  step.addEventListener('mouseenter', () => step.classList.add('hovered'));
  step.addEventListener('mouseleave', () => step.classList.remove('hovered'));
});

// ── Smooth scroll for anchor links ────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const selector = a.getAttribute('href');
    if (selector === '#') return;
    const target = document.querySelector(selector);
    if (!target) return;
    e.preventDefault();
    // Offset for fixed nav height
    const navH   = nav ? nav.offsetHeight : 0;
    const top    = target.getBoundingClientRect().top + window.scrollY - navH - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Ko-fi amount selector (mockup interaction) ────────────────────────────────
document.querySelectorAll('.kofi-amount').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.kofi-amount').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Reduced-motion preference ─────────────────────────────────────────────────
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.setProperty('--anim-duration', '0ms');
}
