/* Willi Blocker — script.js (v2) */

'use strict';

// ── Theme ──────────────────────────────────────────────────────────────────────
const html     = document.documentElement;
const themeBtn = document.getElementById('themeBtn');

function isLight() { return html.getAttribute('data-theme') === 'light'; }

function setTheme(light) {
  html.setAttribute('data-theme', light ? 'light' : 'dark');
  themeBtn.setAttribute('aria-pressed', light ? 'true' : 'false');
  themeBtn.setAttribute('aria-label', light ? 'Passer au mode sombre' : 'Passer au mode clair');
  localStorage.setItem('spectre-theme', light ? 'light' : 'dark');
}

themeBtn.addEventListener('click', () => setTheme(!isLight()));
// Initial aria state (theme already applied via inline script in <head>)
themeBtn.setAttribute('aria-pressed', isLight() ? 'true' : 'false');

// ── Nav shrink ────────────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ── Mobile burger ─────────────────────────────────────────────────────────────
const burger  = document.getElementById('navBurger');
const navMenu = document.getElementById('navMenu');

burger.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') === 'true';
  burger.setAttribute('aria-expanded', String(!open));
  navMenu.classList.toggle('open', !open);
});

// Close on link click
navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    burger.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('open');
  });
});

// ── Active nav link on scroll ─────────────────────────────────────────────────
const sections = document.querySelectorAll('section[id], div[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(a => {
        a.classList.toggle('nav-active', a.getAttribute('href') === '#' + id);
      });
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach(s => sectionObserver.observe(s));

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Animated counters ─────────────────────────────────────────────────────────
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateCounter(el) {
  if (el.dataset.animated) return;
  el.dataset.animated = '1';
  const target   = parseInt(el.dataset.target, 10);
  const duration = 1200;
  const start    = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(easeOutCubic(progress) * target);
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

// ── Smooth scroll for anchor links ───────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const selector = a.getAttribute('href');
    if (!selector || selector === '#') return;
    const target = document.querySelector(selector);
    if (!target) return;
    e.preventDefault();
    const navH = nav ? nav.offsetHeight : 0;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top, behavior: 'smooth' });
    // Move focus for accessibility
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

// ── Ko-fi amount selector ─────────────────────────────────────────────────────
document.querySelectorAll('.kofi-amount').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.kofi-amount').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Step card keyboard / hover glow ──────────────────────────────────────────
document.querySelectorAll('.step').forEach(step => {
  step.setAttribute('tabindex', '0');
  const enter = () => step.classList.add('hovered');
  const leave = () => step.classList.remove('hovered');
  step.addEventListener('mouseenter', enter);
  step.addEventListener('mouseleave', leave);
  step.addEventListener('focus', enter);
  step.addEventListener('blur', leave);
});

// ── Reduced motion ────────────────────────────────────────────────────────────
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.setProperty('--anim', '0');
}
