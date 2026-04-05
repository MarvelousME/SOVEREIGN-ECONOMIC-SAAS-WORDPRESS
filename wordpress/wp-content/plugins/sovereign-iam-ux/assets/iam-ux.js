(function () {
  'use strict';

  var cfg = typeof sovereignIamUx === 'undefined' ? null : sovereignIamUx;
  if (!cfg) return;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var root = qs('[data-sov-iam-modal]');
  var backdrop = qs('[data-sov-iam-close].sov-iam-modal__backdrop');
  var closeBtns = qsa('[data-sov-iam-close]');
  var tabs = qsa('[data-sov-iam-tab]');
  var panels = qsa('[data-sov-iam-panel]');
  var linkLogin = qs('#sov-iam-link-login');
  var linkRegister = qs('#sov-iam-link-register');
  var noteLogin = qs('[data-sov-iam-note-login]');
  var noteRegister = qs('[data-sov-iam-note-register]');
  var lastFocus = null;

  function setLinks() {
    if (linkLogin) {
      linkLogin.href = cfg.loginUrl || '#';
      if (cfg.i18n) {
        var loginLabel = cfg.keycloak ? cfg.i18n.continueKeycloak : cfg.i18n.continueWpLogin;
        if (loginLabel) {
          linkLogin.textContent = loginLabel;
        }
      }
    }
    if (linkRegister && cfg.registerUrl) {
      linkRegister.href = cfg.registerUrl;
      if (cfg.i18n && cfg.i18n.continueRegister) {
        linkRegister.textContent = cfg.i18n.continueRegister;
      }
    }
    if (noteLogin) {
      noteLogin.textContent = cfg.keycloak ? cfg.i18n.keycloakNote : cfg.i18n.wpNote;
    }
    if (noteRegister) {
      noteRegister.textContent = cfg.keycloak ? cfg.i18n.keycloakNote : cfg.i18n.wpNote;
    }
  }

  function setTab(name) {
    tabs.forEach(function (t) {
      var active = t.getAttribute('data-sov-iam-tab') === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.tabIndex = active ? 0 : -1;
    });
    panels.forEach(function (p) {
      var match = p.getAttribute('data-sov-iam-panel') === name;
      p.classList.toggle('is-hidden', !match);
      if (match) {
        p.removeAttribute('hidden');
      } else {
        p.setAttribute('hidden', 'hidden');
      }
    });
  }

  function openModal(tab) {
    if (!root) return;
    var t = tab || 'login';
    if (t === 'register' && cfg.showRegisterTab === false) {
      t = 'login';
    }
    lastFocus = document.activeElement;
    root.removeAttribute('hidden');
    document.body.classList.add('sov-iam-modal-open');
    setTab(t);
    var dialog = qs('.sov-iam-modal', root);
    if (dialog) {
      dialog.focus();
    }
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    if (!root) return;
    root.setAttribute('hidden', 'hidden');
    document.body.classList.remove('sov-iam-modal-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key !== 'Tab' || !root) return;
    var dialog = qs('.sov-iam-modal', root);
    if (!dialog) return;
    var focusables = qsa(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      dialog
    ).filter(function (el) {
      return el.offsetParent !== null || dialog.contains(el);
    });
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  setLinks();

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-sov-iam-open]');
    if (!opener || opener.closest('[data-sov-iam-modal]')) return;
    e.preventDefault();
    var tab = opener.getAttribute('data-sov-iam-open') || 'login';
    if (tab === 'register' && cfg.showRegisterTab === false) {
      tab = 'login';
    }
    openModal(tab);
  });

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setTab(tab.getAttribute('data-sov-iam-tab') || 'login');
    });
  });

  var tablist = qs('.sov-iam-modal__tabs');
  if (tablist) {
    tablist.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (tabs.length < 2) return;
      e.preventDefault();
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) i = 0;
      var next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      setTab(tabs[next].getAttribute('data-sov-iam-tab') || 'login');
    });
  }

  closeBtns.forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get('sov_auth') === '1') {
      openModal('login');
      if (window.history && window.history.replaceState) {
        params.delete('sov_auth');
        var q = params.toString();
        var path = window.location.pathname + (q ? '?' + q : '') + window.location.hash;
        window.history.replaceState({}, '', path);
      }
    }
  });
})();
