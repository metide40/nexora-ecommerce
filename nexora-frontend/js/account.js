// NEXORA account page: Profile, Orders, Favorites, Deals
// Sections are switched with the URL hash (account.html#orders).

const TABS = ['profile', 'orders', 'favorites', 'deals'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ tabs
function showTab() {
  let tab = window.location.hash.slice(1);
  if (!TABS.includes(tab)) tab = 'profile';

  TABS.forEach((t) => { $('panel-' + t).hidden = t !== tab; });
  document.querySelectorAll('.account-nav__item[data-tab]').forEach((a) => {
    const active = a.dataset.tab === tab;
    a.classList.toggle('active', active);
    if (active) {
      a.setAttribute('aria-current', 'page');
      // On phones the menu scrolls sideways: keep the active pill visible
      a.scrollIntoView({ inline: 'center', block: 'nearest' });
    } else {
      a.removeAttribute('aria-current');
    }
  });
}

// ------------------------------------------------------------------ helpers
function emptyState(title, text, buttonHref, buttonText) {
  return `
    <div class="empty-state">
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${buttonHref ? `<a href="${buttonHref}" class="btn btn-primary">${esc(buttonText)}</a>` : ''}
    </div>`;
}

function errorState(err) {
  return `
    <div class="empty-state">
      <h3>Couldn't load this section</h3>
      <p>${esc(err.message)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Try again</button>
    </div>`;
}

// A 401 means the login expired: send the visitor back to login.
function handleError(err, targetId) {
  if (err.status === 401) { API.requireLogin(); return; }
  $(targetId).innerHTML = errorState(err);
}

function clearErrors(form) {
  form.querySelectorAll('.form-input').forEach((i) => i.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach((e) => { e.textContent = ''; e.classList.remove('show'); });
}

function fieldError(inputId, message) {
  const input = $(inputId);
  const error = $(inputId + '-error');
  if (input) input.classList.add('error');
  if (error) { error.textContent = message; error.classList.add('show'); }
}

// ------------------------------------------------------------------ profile
function renderProfile() {
  const user = API.getUser() || {};
  const name = user.name || '';
  $('profile-avatar').textContent = name.trim().charAt(0) || '?';
  $('profile-name').textContent = name;
  $('profile-email').textContent = user.email || '';
  $('profile-joined').textContent = user.joined
    ? 'Member since ' + new Date(user.joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';
  $('profile-name-input').value = name;
  $('profile-email-input').value = user.email || '';
}

function initProfileForms() {
  const profileForm = $('profile-form');
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(profileForm);
    const name = $('profile-name-input').value.trim();
    if (name.length < 2) { fieldError('profile-name-input', 'Please enter your full name'); return; }

    const btn = profileForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    API.updateProfile(name)
      .then(() => {
        renderProfile();
        Toast.show('Profile updated', 'success');
      })
      .catch((err) => {
        if (err.status === 401) { API.requireLogin(); return; }
        if (err.fields && err.fields.name) fieldError('profile-name-input', err.fields.name);
        else Toast.show(err.message, 'error', 5000);
      })
      .finally(() => { btn.disabled = false; });
  });

  const passwordForm = $('password-form');
  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(passwordForm);
    const currentPassword = $('current-password').value;
    const newPassword = $('new-password').value;
    const confirmPassword = $('confirm-new-password').value;

    let valid = true;
    if (!currentPassword) { fieldError('current-password', 'Enter your current password'); valid = false; }
    if (newPassword.length < 6) { fieldError('new-password', 'Password must be at least 6 characters'); valid = false; }
    if (newPassword !== confirmPassword) { fieldError('confirm-new-password', 'Passwords do not match'); valid = false; }
    if (!valid) return;

    const btn = passwordForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    API.changePassword({ currentPassword, newPassword, confirmPassword })
      .then(() => {
        passwordForm.reset();
        Toast.show('Password updated', 'success');
      })
      .catch((err) => {
        if (err.status === 401) { API.requireLogin(); return; }
        const idMap = { currentPassword: 'current-password', newPassword: 'new-password', confirmPassword: 'confirm-new-password' };
        const entries = Object.entries(err.fields || {}).filter(([k]) => idMap[k]);
        if (entries.length) entries.forEach(([k, msg]) => fieldError(idMap[k], msg));
        else Toast.show(err.message, 'error', 5000);
      })
      .finally(() => { btn.disabled = false; });
  });
}

// ------------------------------------------------------------------ orders
function renderOrder(o) {
  const date = new Date(o.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const items = o.items.map((i) => `
    <div class="order-item">
      <img src="${esc(i.image)}" alt="${esc(i.name)}">
      <div class="order-item__info">
        <h5>${esc(i.name)}</h5>
        <span>Qty: ${i.quantity}${i.color ? ' · ' + esc(i.color) : ''}${i.size ? ' · ' + esc(i.size) : ''}</span>
      </div>
      <div style="font-weight:600">${formatPrice(i.price * i.quantity)}</div>
    </div>`).join('');
  return `
    <div class="order-card">
      <div class="order-card__head">
        <div>
          <div class="order-card__num">${esc(o.orderNumber)}</div>
          <div class="order-card__date">${esc(date)}</div>
        </div>
        <span class="order-status ${esc(o.status)}">${esc(o.status)}</span>
      </div>
      ${items}
      <div class="order-card__total"><span>Total</span><span>${formatPrice(o.total)}</span></div>
    </div>`;
}

function renderOrders(orders) {
  $('count-orders').textContent = orders.length || '';
  $('orders-list').innerHTML = orders.length
    ? orders.map(renderOrder).join('')
    : emptyState('No orders yet', 'When you place an order, it will show up here.', 'shop.html', 'Start Shopping');
}

// ------------------------------------------------------------------ favorites + deals
const productGrid = (list) => `<div class="grid grid-3">${list.map(renderProductCard).join('')}</div>`;

function renderFavorites(list) {
  $('count-favorites').textContent = list.length || '';
  $('favorites-grid').innerHTML = list.length
    ? productGrid(list)
    : emptyState('No favorites yet', 'Tap the heart on any product to save it here.', 'shop.html', 'Browse products');
}

function renderDeals() {
  const deals = products
    .filter((p) => p.originalPrice)
    .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
  $('deals-grid').innerHTML = deals.length
    ? productGrid(deals)
    : emptyState('No deals right now', 'Check back soon for new offers.', 'shop.html', 'Browse products');
}

// ------------------------------------------------------------------ start
document.addEventListener('DOMContentLoaded', () => {
  if (!API.requireLogin()) return;

  renderProfile();
  initProfileForms();
  showTab();
  window.addEventListener('hashchange', () => { showTab(); window.scrollTo({ top: 0 }); });

  // Each section loads on its own, so one failure doesn't break the others.
  API.getOrders().then(renderOrders).catch((err) => handleError(err, 'orders-list'));

  const favorites = API.loadFavorites();
  favorites.then(renderFavorites).catch((err) => handleError(err, 'favorites-grid'));

  // Deals need the catalog; hearts on those cards need the favorites loaded too.
  Promise.all([API.loadCatalog(), favorites.catch(() => [])])
    .then(renderDeals)
    .catch((err) => handleError(err, 'deals-grid'));

  // A heart was clicked anywhere on this page: refresh the Favorites section.
  document.addEventListener('favorite:changed', () => {
    API.refreshFavorites().then(renderFavorites).catch((err) => handleError(err, 'favorites-grid'));
  });
});
