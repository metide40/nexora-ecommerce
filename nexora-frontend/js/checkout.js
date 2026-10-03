// NEXORA Checkout & Cart Page Logic

function initCartPage() {
  // Refresh saved items with current prices from the database, then draw.
  // If the backend is unreachable, still show the cart from the saved copy.
  API.loadCatalog()
    .then(() => Cart.syncWithCatalog())
    .catch((err) => console.warn('[NEXORA] Cart not refreshed:', err.message))
    .then(renderCart);
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  
  const cart = Cart.get();

  if (cart.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (cartContent) cartContent.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (cartContent) cartContent.classList.remove('hidden');

  if (container) {
    container.innerHTML = cart.map((item, index) => `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item__image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item__info">
          <h4>${item.name}</h4>
          ${item.color ? `<span style="font-size:0.8125rem;color:var(--slate)">Color: ${item.color}</span>` : ''}
          ${item.size ? `<span style="font-size:0.8125rem;color:var(--slate);margin-left:8px">Size: ${item.size}</span>` : ''}
          <div class="price">${formatPrice(item.price)}</div>
          <button class="remove" data-remove="${index}">Remove</button>
        </div>
        <div class="cart-item__qty">
          <div class="qty-selector">
            <button data-qty-minus="${index}">−</button>
            <input type="number" value="${item.quantity}" min="1" data-qty-input="${index}" readonly>
            <button data-qty-plus="${index}">+</button>
          </div>
          <div class="cart-item__total">${formatPrice(item.price * item.quantity)}</div>
        </div>
      </div>
    `).join('');
  }

  updateSummary();
  bindCartEvents();
}

function updateSummary() {
  const subtotal = Cart.getSubtotal();
  const shipping = Cart.getShipping();
  const total = Cart.getTotal();

  const subEl = document.getElementById('summary-subtotal');
  const shipEl = document.getElementById('summary-shipping');
  const totalEl = document.getElementById('summary-total');

  if (subEl) subEl.textContent = formatPrice(subtotal);
  if (shipEl) shipEl.textContent = shipping === 0 ? 'FREE' : formatPrice(shipping);
  if (totalEl) totalEl.textContent = formatPrice(total);
}

function bindCartEvents() {
  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(parseInt(btn.dataset.remove));
      renderCart();
      Toast.show('Item removed from cart', 'info');
    });
  });

  document.querySelectorAll('[data-qty-minus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.qtyMinus);
      const cart = Cart.get();
      Cart.updateQty(idx, cart[idx].quantity - 1);
      renderCart();
    });
  });

  document.querySelectorAll('[data-qty-plus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.qtyPlus);
      const cart = Cart.get();
      Cart.updateQty(idx, cart[idx].quantity + 1);
      renderCart();
    });
  });
}

function initCheckoutPage() {
  // Orders belong to an account, so the shopper must be logged in.
  if (!API.requireLogin()) return;

  API.loadCatalog()
    .then(() => Cart.syncWithCatalog())
    .catch((err) => Toast.show(err.message, 'error', 5000))
    .then(setupCheckout);
}

function setupCheckout() {
  const cart = Cart.get();
  if (cart.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  // Pre-fill what we already know about the user
  const user = API.getUser();
  if (user) {
    const [first, ...rest] = (user.name || '').split(' ');
    const set = (id, value) => { const el = document.getElementById(id); if (el && !el.value) el.value = value || ''; };
    set('email', user.email);
    set('first-name', first);
    set('last-name', rest.join(' '));
  }

  // Render order summary
  const orderItems = document.getElementById('order-items');
  if (orderItems) {
    orderItems.innerHTML = cart.map(item => `
      <div class="order-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="order-item__info">
          <h5>${item.name}</h5>
          <span>Qty: ${item.quantity}${item.color ? ' · ' + item.color : ''}${item.size ? ' · ' + item.size : ''}</span>
        </div>
        <div style="font-weight:600">${formatPrice(item.price * item.quantity)}</div>
      </div>
    `).join('');
  }

  updateSummary();

  // Form submission
  const form = document.getElementById('checkout-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Basic validation
      const required = form.querySelectorAll('[required]');
      let valid = true;

      required.forEach(field => {
        const error = form.querySelector(`#${field.id}-error`);
        if (!field.value.trim()) {
          field.classList.add('error');
          if (error) {
            error.textContent = 'This field is required';
            error.classList.add('show');
          }
          valid = false;
        } else {
          field.classList.remove('error');
          if (error) error.classList.remove('show');
        }
      });

      // Email validation
      const email = form.querySelector('#email');
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.classList.add('error');
        const error = form.querySelector('#email-error');
        if (error) {
          error.textContent = 'Please enter a valid email';
          error.classList.add('show');
        }
        valid = false;
      }

      if (!valid) {
        Toast.show('Please fill in all required fields', 'error');
        return;
      }

      // Send the order to the backend. Note: we send only product ids and
      // quantities. The server looks up the real prices itself.
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Placing order...';

      const val = (id) => form.querySelector('#' + id).value.trim();
      const payload = {
        email: val('email'),
        firstName: val('first-name'),
        lastName: val('last-name'),
        address: val('address'),
        apartment: val('apartment'),
        city: val('city'),
        state: val('state'),
        zip: val('zip'),
        phone: val('phone'),
        items: Cart.get().map(i => ({
          productId: i.id,
          quantity: i.quantity,
          color: i.color,
          size: i.size
        }))
      };

      API.placeOrder(payload)
        .then((order) => {
          Cart.clear();
          window.location.href = 'order-success.html?order=' + encodeURIComponent(order.orderNumber);
        })
        .catch((err) => {
          if (err.status === 401) {
            API.requireLogin();
            return;
          }
          // Show server messages next to the matching field when possible
          const idMap = { firstName: 'first-name', lastName: 'last-name' };
          Object.entries(err.fields || {}).forEach(([key, message]) => {
            const id = idMap[key] || key;
            const input = form.querySelector('#' + id);
            const error = form.querySelector('#' + id + '-error');
            if (input) input.classList.add('error');
            if (error) { error.textContent = message; error.classList.add('show'); }
          });
          Toast.show(err.message, 'error', 5000);
          btn.disabled = false;
          btn.textContent = 'Place Order';
        });
    });
  }
}

// Page detection
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-items') || document.getElementById('cart-empty')) {
    initCartPage();
  }
  if (document.getElementById('checkout-form')) {
    initCheckoutPage();
  }
});
