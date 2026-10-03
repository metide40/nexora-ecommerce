// NEXORA Main JavaScript

// Toast Notification System
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      info: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Mobile Menu
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.mobile-menu');
  
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
      
      // Toggle icon
      const icon = toggle.querySelector('svg');
      if (menu.classList.contains('open')) {
        icon.innerHTML = '<path d="M18 6L6 18M6 6l12 12"/>';
      } else {
        icon.innerHTML = '<path d="M3 12h18M3 6h18M3 18h18"/>';
      }
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

// Sticky Header
function initStickyHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Search Functionality
function initSearch() {
  const searchInputs = document.querySelectorAll('.search-input');
  
  searchInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = input.value.trim();
        if (query) {
          window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  });

  // Search buttons
  document.querySelectorAll('.search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.search-box, .mobile-search')?.querySelector('input');
      if (input && input.value.trim()) {
        window.location.href = `shop.html?search=${encodeURIComponent(input.value.trim())}`;
      }
    });
  });
}

// Render Product Card HTML
function renderProductCard(product) {
  const discount = getDiscountPercent(product);
  const wishlisted = API.isFavorite(product.id);
  
  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__image">
        <a href="product.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </a>
        ${product.badge ? `<span class="badge badge-${product.badge.toLowerCase()} product-card__badge">${product.badge}${discount ? ' -' + discount + '%' : ''}</span>` : ''}
        <button class="product-card__wishlist ${wishlisted ? 'active' : ''}" data-wishlist="${product.id}" aria-label="Save to favorites">
          <svg class="icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <a href="product.html?id=${product.id}">
          <h3 class="product-card__name">${product.name}</h3>
        </a>
        <div class="product-card__rating">
          ${renderStars(product.rating)}
          <span class="rating-text">(${product.reviews})</span>
        </div>
        <div class="product-card__price">
          <span class="current">${formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="original">${formatPrice(product.originalPrice)}</span>` : ''}
        </div>
        <div class="product-card__actions">
          <button class="btn btn-primary btn-sm add-to-cart" data-id="${product.id}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      html += '<svg class="star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    } else if (i - 0.5 <= rating) {
      html += '<svg class="star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" opacity="0.5"/></svg>';
    } else {
      html += '<svg class="star empty" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
  }
  html += '</div>';
  return html;
}

// Global event delegation for add to cart & wishlist
function initProductActions() {
  document.addEventListener('click', (e) => {
    // Add to Cart
    const addBtn = e.target.closest('.add-to-cart');
    if (addBtn) {
      e.preventDefault();
      const id = parseInt(addBtn.dataset.id);
      if (Cart.add(id)) {
        Toast.show('Added to cart!', 'success');
      }
    }

    // Wishlist
    const wishBtn = e.target.closest('[data-wishlist]');
    if (wishBtn) {
      e.preventDefault();
      const id = parseInt(wishBtn.dataset.wishlist);
      API.toggleFavorite(id)
        .then((active) => {
          if (active === null) return; // sent to login
          // keep every heart for this product in sync (it may appear twice on a page)
          document.querySelectorAll(`[data-wishlist="${id}"]`).forEach(b => b.classList.toggle('active', active));
          Toast.show(active ? 'Added to favorites!' : 'Removed from favorites', 'info');
        })
        .catch((err) => Toast.show(err.message, 'error', 4000));
    }
  });
}

// Newsletter Form
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const email = input.value.trim();
    const errorEl = form.querySelector('.form-error');
    const successEl = form.querySelector('.form-success');

    if (errorEl) errorEl.classList.remove('show');
    if (successEl) successEl.style.display = 'none';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a valid email address';
        errorEl.classList.add('show');
      }
      return;
    }

    // Simulate success
    input.value = '';
    if (successEl) {
      successEl.textContent = 'Thanks for subscribing! Check your inbox.';
      successEl.style.display = 'block';
    }
    Toast.show('Successfully subscribed!', 'success');
  });
}

// Countdown Timer (static display with slight animation)
function initCountdown() {
  const items = document.querySelectorAll('.countdown-item__value');
  if (!items.length) return;

  // Set initial values (demo countdown)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 3);
  endDate.setHours(23, 59, 59);

  function update() {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) return;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const values = [days, hours, mins, secs];
    items.forEach((el, i) => {
      if (values[i] !== undefined) {
        el.textContent = String(values[i]).padStart(2, '0');
      }
    });
  }

  update();
  setInterval(update, 1000);
}

// Render Featured Products on Homepage
function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;

  const featured = getFeaturedProducts().slice(0, 8);
  container.innerHTML = featured.map(p => renderProductCard(p)).join('');
}

// Render Categories
function renderCategories() {
  const container = document.getElementById('categories-grid');
  if (!container) return;

  container.innerHTML = categories.map(cat => {
    const href = cat.id === 'deals' ? 'shop.html?deals=1' : `shop.html?category=${cat.id}`;
    return `
    <a href="${href}" class="category-card">
      <img src="${cat.image}" alt="${cat.name}" loading="lazy">
      <div class="category-card__overlay">
        <h3 class="category-card__title">${cat.name}</h3>
        <p class="category-card__desc">${cat.description}</p>
      </div>
    </a>`;
  }).join('');
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const success = document.getElementById('contact-success');

    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Saved in the database; the admin reads it in the Django admin panel
    API.sendContactMessage({
      name: form.querySelector('#contact-name').value.trim(),
      email: form.querySelector('#contact-email').value.trim(),
      message: form.querySelector('#contact-message').value.trim()
    })
      .then(() => {
        form.reset();
        if (success) {
          success.style.display = 'block';
          setTimeout(() => { success.style.display = 'none'; }, 4000);
        }
        Toast.show('Message sent! We will reply soon.', 'success');
      })
      .catch((err) => {
        const msg = err.status === 429
          ? 'You have sent too many messages. Please try again later.'
          : err.message;
        Toast.show(msg, 'error', 5000);
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Send message';
      });
  });
}

// Set active nav link
function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html') || (path === 'index.html' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initStickyHeader();
  initSearch();
  initProductActions();
  initNewsletter();
  initContactForm();
  initCountdown();
  // Home page: load products from the backend, then draw the sections
  if (document.getElementById('featured-products') || document.getElementById('categories-grid')) {
    API.withCatalog(() => {
      renderFeaturedProducts();
      renderCategories();
    }, 'featured-products');
  }
  setActiveNav();
  Cart.updateUI();
});
