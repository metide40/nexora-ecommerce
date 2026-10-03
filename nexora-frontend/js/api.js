// NEXORA API client
// Every call to the Django backend goes through this file.
// Load it AFTER products.js and cart.js, and BEFORE main.js.

const API = (() => {
  // Change this if your backend runs somewhere else (or set window.NEXORA_API_URL).
  const BASE_URL = window.NEXORA_API_URL || 'http://127.0.0.1:8000/api';
  const TOKEN_KEY = 'nexora_token';
  const USER_KEY = 'nexora_user';

  // ------------------------------------------------------------------ errors
  class ApiError extends Error {
    constructor(message, status = 0, fields = {}) {
      super(message);
      this.status = status;   // HTTP status (0 = could not reach the server)
      this.fields = fields;   // per-field messages, e.g. { email: "Already exists" }
    }
  }

  // Turn any error JSON from Django into plain strings.
  function flatten(value) {
    if (Array.isArray(value)) return value.map(flatten).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(flatten).join(' ');
    return String(value);
  }

  function parseErrorBody(data) {
    const fields = {};
    let message = '';
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        if (key === 'detail' || key === 'non_field_errors') message = flatten(value);
        else fields[key] = flatten(value);
      }
      if (!message) message = Object.values(fields)[0] || '';
    } else if (data) {
      message = flatten(data);
    }
    return { message: message || 'Something went wrong. Please try again.', fields };
  }

  // ------------------------------------------------------------------ session
  const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
  const safeDel = (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

  const getToken = () => safeGet(TOKEN_KEY);
  const isLoggedIn = () => !!getToken();

  function getUser() {
    try { return JSON.parse(safeGet(USER_KEY)); } catch { return null; }
  }

  function saveSession({ token, user }) {
    safeSet(TOKEN_KEY, token);
    safeSet(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    safeDel(TOKEN_KEY);
    safeDel(USER_KEY);
  }

  // ------------------------------------------------------------------ core fetch
  async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // Only send the token when the endpoint needs it (a stale token on a
    // public endpoint would be rejected by Django).
    if (auth && getToken()) headers['Authorization'] = 'Token ' + getToken();

    let response;
    try {
      response = await fetch(BASE_URL + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Cannot reach the server. Is the backend running?', 0);
    }

    let data = null;
    if (response.status !== 204) {
      try { data = await response.json(); } catch { data = null; }
    }

    if (!response.ok) {
      // Token expired / invalid -> forget it so the UI shows "logged out"
      if (response.status === 401 && auth) clearSession();
      const { message, fields } = parseErrorBody(data);
      throw new ApiError(message, response.status, fields);
    }
    return data;
  }

  // ------------------------------------------------------------------ catalog
  // The pages were written around the global `products` and `categories`
  // arrays, so we fill those arrays from the database instead of rewriting
  // every page. Loaded once, then cached.
  const DEALS_CATEGORY = {
    id: 'deals',
    name: 'Deals',
    description: 'Limited-time offers up to 40% off',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop',
  };
  const CATEGORY_ORDER = ['electronics', 'fashion', 'home', 'accessories'];

  let catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = Promise.all([request('/products/'), request('/categories/')])
        .then(([prods, cats]) => {
          products.length = 0;
          products.push(...prods);

          cats.sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id));
          categories.length = 0;
          categories.push(...cats, { ...DEALS_CATEGORY, count: prods.filter(p => p.originalPrice).length });
        })
        .catch((err) => {
          catalogPromise = null; // allow a retry on the next call
          throw err;
        });
    }
    return catalogPromise;
  }

  // Load the catalog and run `render`. If the backend is down, show a clear
  // message in `container` instead of an empty page.
  function withCatalog(render, container) {
    return Promise.all([loadCatalog(), loadFavorites().catch(() => {})]).then(render).catch((err) => {
      console.error('[NEXORA] Failed to load products:', err);
      const el = typeof container === 'string' ? document.getElementById(container) : container;
      if (el) {
        el.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <h3>Couldn't load products</h3>
            <p>${err.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Try again</button>
          </div>`;
      }
      if (typeof Toast !== 'undefined') Toast.show(err.message, 'error', 5000);
    });
  }

  // ------------------------------------------------------------------ auth
  async function register({ name, email, password, confirmPassword }) {
    const session = await request('/auth/register/', {
      method: 'POST',
      body: { name, email, password, confirmPassword },
    });
    saveSession(session);
    return session.user;
  }

  async function login({ email, password }) {
    const session = await request('/auth/login/', { method: 'POST', body: { email, password } });
    saveSession(session);
    return session.user;
  }

  async function logout() {
    try { await request('/auth/logout/', { method: 'POST', auth: true }); } catch { /* already invalid */ }
    clearSession();
  }

  // Send the visitor to the login page and come back afterwards.
  function requireLogin() {
    if (isLoggedIn()) return true;
    const here = (window.location.pathname.split('/').pop() || 'index.html') + window.location.search;
    window.location.href = 'login.html?next=' + encodeURIComponent(here);
    return false;
  }

  // Only allow redirects to our own pages (e.g. "checkout.html").
  function safeNext(fallback = 'index.html') {
    const next = new URLSearchParams(window.location.search).get('next');
    // e.g. "checkout.html" or "product.html?id=3" (no slashes or domains: stops open redirects)
    return next && /^[a-z0-9-]+\.html(\?[a-z0-9=&_.%-]*)?$/i.test(next) ? next : fallback;
  }

  // ------------------------------------------------------------------ orders
  const placeOrder = (payload) => request('/orders/', { method: 'POST', body: payload, auth: true });
  const getOrders = () => request('/orders/', { auth: true });
  const getOrder = (orderNumber) => request('/orders/' + encodeURIComponent(orderNumber) + '/', { auth: true });

  // ------------------------------------------------------------------ profile
  async function updateProfile(name) {
    const user = await request('/auth/me/', { method: 'PATCH', body: { name }, auth: true });
    safeSet(USER_KEY, JSON.stringify(user));
    return user;
  }

  async function changePassword({ currentPassword, newPassword, confirmPassword }) {
    // Server revokes the old token and returns a fresh one, so we stay logged in.
    const session = await request('/auth/change-password/', {
      method: 'POST', body: { currentPassword, newPassword, confirmPassword }, auth: true,
    });
    saveSession(session);
  }

  // ------------------------------------------------------------------ favorites
  // Saved in the database for logged-in users. A guest's old browser-only
  // wishlist is merged into the account the first time they log in.
  const LOCAL_WISHLIST_KEY = 'nexora_wishlist';
  let favoriteIds = new Set();
  let favoritesPromise = null;

  async function mergeLocalWishlist() {
    let local = [];
    try { local = JSON.parse(safeGet(LOCAL_WISHLIST_KEY)) || []; } catch { local = []; }
    if (!local.length) return;
    await Promise.all(local.map((id) =>
      request('/favorites/', { method: 'POST', body: { productId: id }, auth: true }).catch(() => {})));
    safeDel(LOCAL_WISHLIST_KEY);
  }

  // Returns the favorite products (full objects). Cached until refreshFavorites().
  function loadFavorites() {
    if (!isLoggedIn()) { favoriteIds = new Set(); return Promise.resolve([]); }
    if (!favoritesPromise) {
      favoritesPromise = mergeLocalWishlist()
        .then(() => request('/favorites/', { auth: true }))
        .then((list) => { favoriteIds = new Set(list.map((p) => p.id)); return list; })
        .catch((err) => { favoritesPromise = null; throw err; });
    }
    return favoritesPromise;
  }

  function refreshFavorites() {
    favoritesPromise = null;
    return loadFavorites();
  }

  const isFavorite = (id) => favoriteIds.has(Number(id));

  // Heart click. Resolves to true/false (new state), or null if the visitor
  // had to be sent to the login page first.
  async function toggleFavorite(id) {
    id = Number(id);
    if (!isLoggedIn()) {
      if (typeof Toast !== 'undefined') Toast.show('Please log in to save favorites', 'info');
      setTimeout(requireLogin, 900);
      return null;
    }
    await loadFavorites();
    let active;
    if (favoriteIds.has(id)) {
      await request('/favorites/' + id + '/', { method: 'DELETE', auth: true });
      favoriteIds.delete(id);
      active = false;
    } else {
      await request('/favorites/', { method: 'POST', body: { productId: id }, auth: true });
      favoriteIds.add(id);
      active = true;
    }
    document.dispatchEvent(new CustomEvent('favorite:changed', { detail: { id, active } }));
    return active;
  }

  // ------------------------------------------------------------------ contact
  const sendContactMessage = ({ name, email, message }) =>
    request('/contact/', { method: 'POST', body: { name, email, message } });

  // ------------------------------------------------------------------ header UI
  // Makes the account icon reflect the login state on every page.
  function renderAuthUI() {
    const user = getUser();
    const loggedIn = isLoggedIn() && user;

    document.querySelectorAll('.header__actions a[href="login.html"], .header__actions a[href="account.html"]').forEach((link) => {
      if (loggedIn) {
        link.href = 'account.html';
        link.setAttribute('aria-label', 'My account');
        link.title = `${user.name} — My account`;
        if (!link.parentElement.querySelector('[data-logout]')) {
          const out = document.createElement('a');
          out.href = '#';
          out.className = 'header__icon-btn';
          out.setAttribute('data-logout', '');
          out.setAttribute('aria-label', 'Log out');
          out.title = 'Log out';
          out.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
          link.insertAdjacentElement('afterend', out);
        }
      }
    });

    // Mobile menu
    document.querySelectorAll('.mobile-menu .nav a[href="login.html"]').forEach((link) => {
      if (loggedIn) {
        link.href = 'account.html';
        link.textContent = 'My Account';
        if (!link.parentElement.querySelector('[data-logout]')) {
          const out = document.createElement('a');
          out.href = '#';
          out.className = 'nav__link';
          out.setAttribute('data-logout', '');
          out.textContent = 'Log out';
          link.insertAdjacentElement('afterend', out);
        }
      }
    });
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-logout]');
    if (!btn) return;
    e.preventDefault();
    await logout();
    if (typeof Toast !== 'undefined') Toast.show('You have been logged out', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 600);
  });

  document.addEventListener('DOMContentLoaded', renderAuthUI);

  return {
    BASE_URL, ApiError,
    loadCatalog, withCatalog,
    register, login, logout, isLoggedIn, getUser, requireLogin, safeNext,
    placeOrder, getOrders, getOrder,
    sendContactMessage,
    updateProfile, changePassword,
    loadFavorites, refreshFavorites, isFavorite, toggleFavorite,
  };
})();
