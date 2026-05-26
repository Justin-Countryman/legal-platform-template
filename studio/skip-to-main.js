/**
 * Skip-to-Main A11y Widget v3.0
 * Keyboard-only skip link — appears on first Tab, hides on mouse/touch interaction.
 * WCAG 2.1 SC 2.4.1 compliant. No dependencies.
 *
 * Usage: paste into Webflow custom code (before </body>) or any site's <head>/<body>.
 * Expose: window.a11ySkipLink.destroy() / .show() / .hide()
 *
 * Customise colors below — everything else is handled automatically.
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────────
  const CONFIG = {
    text: 'Skip to Main Content',
    // Checked in order — first match wins
    selectors: ['#main', 'main', '[role="main"]', '#content', '.main-content'],
    colors: {
      background: '#2c3e50',
      text: '#ffffff',
      outline: '#3498db',
    },
  };

  // ── State ─────────────────────────────────────────────────────────────────────
  let link = null;
  let styleEl = null;
  let ready = false;
  let firstTabSeen = false; // show only on the very first tab, not on every tab

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function findMain() {
    for (const sel of CONFIG.selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) { /* invalid selector — skip */ }
    }
    // Last resort: container of the first heading
    return document.querySelector('h1, h2')
      ?.closest('div, section, article, main')
      ?? document.body;
  }

  function show() { link?.classList.add('a11y-skip--on'); }
  function hide() { link?.classList.remove('a11y-skip--on'); }

  // ── Activation ────────────────────────────────────────────────────────────────

  function activate(e) {
    e.preventDefault();

    const main = findMain();

    // Ensure the target has an id so the href resolves (also aids screen readers)
    if (!main.id) main.id = 'main-content';

    // Make non-interactive elements focusable, then clean up after blur
    const hadTabIndex = main.hasAttribute('tabindex');
    if (!hadTabIndex) {
      main.setAttribute('tabindex', '-1');
      main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    }

    main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    main.focus({ preventScroll: true });
    hide();
  }

  // ── DOM creation ──────────────────────────────────────────────────────────────

  function injectStyles() {
    styleEl = document.createElement('style');
    styleEl.textContent = `
      .a11y-skip {
        position: fixed;
        top: -100px;
        left: 20px;
        z-index: 999999;
        padding: 12px 20px;
        background: ${CONFIG.colors.background};
        color: ${CONFIG.colors.text};
        font: 600 16px/1.5 system-ui, -apple-system, sans-serif;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,.3);
        text-decoration: none;
        opacity: 0;
        transition: top .25s ease, opacity .25s ease;
        white-space: nowrap;
      }
      .a11y-skip--on,
      .a11y-skip:focus {
        top: 20px;
        opacity: 1;
      }
      .a11y-skip:focus {
        outline: 2px solid ${CONFIG.colors.outline};
        outline-offset: 2px;
      }
      .a11y-skip:hover {
        background: ${CONFIG.colors.outline};
      }
      @media (prefers-reduced-motion: reduce) {
        .a11y-skip { transition: none; }
      }
      @media (forced-colors: active) {
        .a11y-skip { border: 2px solid ButtonText; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  function createLink() {
    if (link) return;
    link = document.createElement('a');
    link.href = '#main-content';
    link.className = 'a11y-skip';
    link.textContent = CONFIG.text;
    link.addEventListener('click', activate);
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') activate(e);
      if (e.key === 'Escape') { hide(); link.blur(); }
    });
    document.body.insertBefore(link, document.body.firstChild);
  }

  // ── Event handlers ────────────────────────────────────────────────────────────

  function onKeydown(e) {
    if (e.key !== 'Tab') return;

    // Shift+Tab away from the skip link — hide and let focus leave naturally
    if (e.shiftKey && document.activeElement === link) {
      hide();
      return;
    }

    // Only intercept the very first forward Tab to create and focus the link.
    // All subsequent tabs (e.g. tabbing through a form) are ignored so the
    // skip link never flashes mid-page.
    if (!firstTabSeen && !e.shiftKey) {
      firstTabSeen = true;
      createLink();
      show();
      e.preventDefault();
      link.focus();
    }
  }

  function onPointer() {
    hide();
    document.removeEventListener('mousedown', onPointer);
    document.removeEventListener('touchstart', onPointer);
  }

  // ── Init / destroy ────────────────────────────────────────────────────────────

  function init() {
    if (ready) return;
    ready = true;
    injectStyles();
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
  }

  function destroy() {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('mousedown', onPointer);
    document.removeEventListener('touchstart', onPointer);
    link?.parentNode?.removeChild(link);
    styleEl?.parentNode?.removeChild(styleEl);
    link = styleEl = null;
    ready = false;
    firstTabSeen = false;
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  window.a11ySkipLink = { destroy, show, hide, version: '3.0' };
})();
