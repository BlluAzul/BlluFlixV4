/* BLLUFLIX V24 • CINEMA EDITION
   Progressive UI enhancements. All catalogue, account-free storage and player
   functions stay owned by the project's original app.js / player.js scripts. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const isHome = !!document.querySelector('.page-content');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };

  function cinemaToast(message, symbol = '✦') {
    let toast = $('.cinema-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'cinema-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.replaceChildren();
    const ic = document.createElement('span'); ic.className = 'cinema-toast-symbol'; ic.textContent = symbol;
    const text = document.createElement('span'); text.textContent = message;
    toast.append(ic, text);
    toast.classList.add('show');
    clearTimeout(cinemaToast.timeout);
    cinemaToast.timeout = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  window.cinemaToast = cinemaToast;

  function updateCinemaModeButton() {
    const btn = $('#cinema-mode-toggle');
    if (!btn) return;
    const active = document.body.classList.contains('cinema-expanded');
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', active ? 'Desativar modo cinema' : 'Ativar modo cinema');
    btn.setAttribute('title', active ? 'Voltar ao menu completo' : 'Expandir área do catálogo');
    const label = $('.cinema-mode-text', btn);
    if (label) label.textContent = active ? 'Sair do cinema' : 'Modo cinema';
  }
  function initCinemaMode() {
    if (!isHome) return;
    if (storage.get('blluflix_cinema_expanded') === '1') document.body.classList.add('cinema-expanded');
    const header = $('.header');
    if (!header || $('#cinema-mode-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'cinema-mode-toggle'; btn.className = 'cinema-mode-toggle'; btn.type = 'button';
    btn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg><span class="cinema-mode-text">Modo cinema</span>';
    // Sits before search. Existing search-toggle stays functional on mobile.
    const searchToggle = $('#search-toggle');
    if (searchToggle) header.insertBefore(btn, searchToggle);
    else header.appendChild(btn);
    btn.addEventListener('click', () => {
      const active = document.body.classList.toggle('cinema-expanded');
      storage.set('blluflix_cinema_expanded', active ? '1' : '0');
      updateCinemaModeButton();
      cinemaToast(active ? 'Catálogo expandido. Boa sessão!' : 'Menu completo restaurado.', active ? '◧' : '✦');
    });
    updateCinemaModeButton();
    const searchBox = $('.search-box');
    if (searchBox && !$('.search-kbd', searchBox)) {
      const kbd = document.createElement('span');
      kbd.className = 'search-kbd'; kbd.setAttribute('aria-hidden','true'); kbd.textContent = '/';
      searchBox.appendChild(kbd);
    }
  }

  function initSidebarFeature() {
    const sidebar = $('.sidebar');
    if (!sidebar || $('.sidebar-feature', sidebar)) return;
    const feature = document.createElement('div');
    feature.className = 'sidebar-feature';
    feature.innerHTML = '<span class="sidebar-feature-eyebrow">THE MOVIE CLUB</span><strong>A magia da próxima cena.</strong><small>Explore histórias, personagens e universos.</small><div class="feature-line"></div>';
    sidebar.appendChild(feature);
    // Original app may rebuild the sidebar at initialization, so we also add it on page mutations.
  }

  function updateHeroIndicators() {
    const hero = $('.hero');
    if (!hero) return;
    const slides = $$('.hero-slide', hero);
    const active = slides.findIndex(slide => slide.classList.contains('active'));
    if (active < 0) return;
    const num = $('#hero-current-number', hero);
    if (num) num.textContent = String(active + 1).padStart(2, '0');
    $$('.hero-dot', hero).forEach((dot, index) => {
      dot.setAttribute('aria-selected', String(index === active));
      dot.setAttribute('tabindex', index === active ? '0' : '-1');
    });
  }
  window.cinemaStepHero = (direction) => {
    const slides = $$('.hero-slide');
    if (!slides.length || typeof window.goToSlide !== 'function') return;
    const active = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
    window.goToSlide((active + direction + slides.length) % slides.length);
    updateHeroIndicators();
  };

  window.cinemaSurpriseMe = () => {
    // Reuse the same film IDs and navigation functions as the original catalogue.
    if (typeof window.openDetail !== 'function') return;
    const heroMovies = window.AppState?.heroMovies;
    if (heroMovies?.length) {
      const movie = heroMovies[Math.floor(Math.random() * heroMovies.length)];
      if (movie?.id) { window.openDetail('movie', movie.id); return; }
    }
    const cards = $$('.page-content .movie-card[onclick]');
    if (cards.length) cards[Math.floor(Math.random() * cards.length)].click();
    else cinemaToast('Aguarde o catálogo carregar para escolher seu filme.', '⌛');
  };

  function setUpHero(hero) {
    if (hero.dataset.cinemaEnhanced === 'true') return;
    hero.dataset.cinemaEnhanced = 'true';
    // Pause the existing slideshow when someone is reading a synopsis.
    hero.addEventListener('mouseenter', () => {
      if (typeof heroSlideshowInterval !== 'undefined') clearInterval(heroSlideshowInterval);
    });
    hero.addEventListener('mouseleave', () => {
      if (typeof startHeroSlideshow === 'function') startHeroSlideshow();
    });
    // The CSS3D artwork is rendered in CSS, moved only on fine pointers.
    if (finePointer.matches && !reducedMotion.matches) {
      let scheduled = false; let x = 0, y = 0;
      hero.addEventListener('pointermove', (event) => {
        const slide = $('.hero-slide.active', hero);
        if (!slide) return;
        const art = $('.hero-art', slide);
        if (!art) return;
        const r = hero.getBoundingClientRect();
        x = (event.clientX - r.left) / r.width - .5;
        y = (event.clientY - r.top) / r.height - .5;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          const poster = $('.hero-poster-shell', art);
          if (poster) {
            poster.style.setProperty('--rotation-y', (-13 + x * 13).toFixed(2) + 'deg');
            poster.style.setProperty('--rotation-x', (4 - y * 9).toFixed(2) + 'deg');
          }
          scheduled = false;
        });
      }, {passive:true});
      hero.addEventListener('pointerleave', () => {
        $$('.hero-poster-shell', hero).forEach(shell => {
          shell.style.removeProperty('--rotation-y');shell.style.removeProperty('--rotation-x');
        });
      });
    }
    updateHeroIndicators();
  }

  function enhanceCards() {
    $$('.page-content .movie-card, .releases-grid .release-card, .related-section .movie-card').forEach(card => {
      if (card.dataset.cinemaCard === 'true') return;
      card.dataset.cinemaCard = 'true';
      if (card.hasAttribute('onclick')) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        const name = $('.movie-title, .release-title', card)?.textContent?.trim();
        card.setAttribute('aria-label', name ? `Ver detalhes de ${name}` : 'Abrir detalhes');
        card.addEventListener('keydown', event => {
          if (event.target !== card) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); card.click();
          }
        });
      }
    });
  }
  function enhancePage() {
    const hero = $('.hero');
    if (hero) {setUpHero(hero);updateHeroIndicators();}
    enhanceCards();
    if (isHome) initSidebarFeature();
  }

  function initInteractions() {
    // Existing card onclick remains the source of truth for navigation.
    document.addEventListener('click', e => {
      const save = e.target.closest('.save-btn, .save-detail-btn');
      if (!save) return;
      setTimeout(() => {
        cinemaToast(save.classList.contains('saved') ? 'Adicionado à sua lista de salvos.' : 'Removido da sua lista de salvos.', '♡');
      }, 0);
    }, true);

    if (finePointer.matches && !reducedMotion.matches) {
      let activeCard = null; let animation = 0; let pointer = null;
      document.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        const card = event.target.closest('.movie-card');
        if (card === activeCard && pointer && Math.abs(pointer.x-event.clientX)<3 && Math.abs(pointer.y-event.clientY)<3) return;
        if (card !== activeCard && activeCard) {
          const previous = $('.movie-card-inner', activeCard);
          if(previous){previous.style.removeProperty('--tilt-x'); previous.style.removeProperty('--tilt-y');}
        }
        activeCard = card; pointer = { x:event.clientX,y:event.clientY };
        if (!card || animation) return;
        animation = requestAnimationFrame(() => {
          animation=0;
          if (!activeCard || !activeCard.isConnected || !pointer) return;
          const inner = $('.movie-card-inner', activeCard);
          if (!inner) return;
          const r = inner.getBoundingClientRect();
          const px = Math.max(-.5, Math.min(.5, (pointer.x-r.left)/r.width-.5));
          const py = Math.max(-.5, Math.min(.5, (pointer.y-r.top)/r.height-.5));
          inner.style.setProperty('--tilt-x', (px*12).toFixed(2) + 'deg');
          inner.style.setProperty('--tilt-y', (-py*10).toFixed(2) + 'deg');
        });
      }, {passive:true});
      document.addEventListener('pointerout', e => {
        const card = e.target.closest('.movie-card');
        if (!card || card.contains(e.relatedTarget)) return;
        const inner = $('.movie-card-inner', card);
        if (inner) {inner.style.removeProperty('--tilt-x'); inner.style.removeProperty('--tilt-y');}
        if (activeCard === card) activeCard = null;
      }, {passive:true});
    }

    document.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = event.target.tagName;
      const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || event.target.isContentEditable;
      if (isTyping) {
        if (event.key === 'Escape') event.target.blur();
        return;
      }
      if (event.key === '/' && isHome) {
        event.preventDefault();
        const input = $('#search-input');
        if (input) { input.focus(); input.select(); }
      }
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && $('.hero')) {
        // Don't capture arrow keys when other UI controls have focus.
        if (event.target.closest('button, a, [role="slider"], [role="tablist"]')) return;
        event.preventDefault();
        window.cinemaStepHero(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && typeof heroSlideshowInterval !== 'undefined') clearInterval(heroSlideshowInterval);
      else if (!document.hidden && $('.hero') && typeof startHeroSlideshow === 'function') startHeroSlideshow();
    });
  }

  function init() {
    if (document.documentElement.dataset.cinemaReady) return;
    document.documentElement.dataset.cinemaReady = 'true';
    initCinemaMode();
    initSidebarFeature();
    initInteractions();
    enhancePage();
    // The original app replaces page-content.innerHTML during SPA navigation.
    // A single observer restores the polish without touching API or player internals.
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; enhancePage(); });
    });
    const root = $('.page-content') || $('.movie-detail') || $('.calendar-page') || $('.standalone-container');
    if (root) observer.observe(root, {childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    if (isHome) {
      const sidebar = $('.sidebar');
      if (sidebar) {
        const sidebarObserver = new MutationObserver(() => {
          if (!$('.sidebar-feature', sidebar)) initSidebarFeature();
        });
        sidebarObserver.observe(sidebar, {childList:true});
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
