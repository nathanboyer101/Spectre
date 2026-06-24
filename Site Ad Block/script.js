// ── Scroll reveal ────────────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── Nav shrink on scroll ─────────────────────────────────────────────────
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // ── Animated counters (trigger when stats enter viewport) ────────────────
    function animateCounter(el) {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1200;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
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
    const statsEl = document.querySelector('.hero-stats');
    if (statsEl) statsObserver.observe(statsEl);

    // ── Theme toggle ─────────────────────────────────────────────────────────
    const themeBtn = document.getElementById('themeBtn');
    themeBtn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-mode');
      themeBtn.textContent = isLight ? '🌙' : '☀️';
      localStorage.setItem('spectre-theme', isLight ? 'light' : 'dark');
    });
    // Restore saved theme
    if (localStorage.getItem('spectre-theme') === 'light') {
      document.body.classList.add('light-mode');
      themeBtn.textContent = '🌙';
    }

    // ── Step hover glow ──────────────────────────────────────────────────────
    document.querySelectorAll('.step').forEach(step => {
      step.addEventListener('mouseenter', () => step.classList.add('hovered'));
      step.addEventListener('mouseleave', () => step.classList.remove('hovered'));
    });

    // ── Smooth scroll for anchor links ───────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // ── Respect reduced-motion preference ───────────────────────────────────
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--anim-duration', '0ms');
    }
