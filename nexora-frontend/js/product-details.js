// NEXORA Product Details Page

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let quantity = 1;

function initProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    window.location.href = 'shop.html';
    return;
  }

  currentProduct = getProductById(id);
  if (!currentProduct) {
    window.location.href = 'shop.html';
    return;
  }

  renderProduct();
  renderRelated();
}

function renderProduct() {
  const p = currentProduct;

  // Breadcrumb & Title
  document.title = `${p.name} | NEXORA`;
  
  const breadcrumb = document.getElementById('product-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="index.html">Home</a>
      <span class="separator">/</span>
      <a href="shop.html">Shop</a>
      <span class="separator">/</span>
      <a href="shop.html?category=${p.category}">${p.category.charAt(0).toUpperCase() + p.category.slice(1)}</a>
      <span class="separator">/</span>
      <span>${p.name}</span>
    `;
  }

  // Gallery
  const mainImg = document.getElementById('main-image');
  if (mainImg) {
    mainImg.src = p.images[0] || p.image;
    mainImg.alt = p.name;
  }

  const thumbs = document.getElementById('gallery-thumbs');
  if (thumbs) {
    thumbs.innerHTML = (p.images || [p.image]).map((img, i) => `
      <div class="product-gallery__thumb ${i === 0 ? 'active' : ''}" data-src="${img}">
        <img src="${img}" alt="${p.name} view ${i + 1}">
      </div>
    `).join('');

    thumbs.querySelectorAll('.product-gallery__thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        if (mainImg) mainImg.src = thumb.dataset.src;
      });
    });
  }

  // Info
  const nameEl = document.getElementById('product-name');
  if (nameEl) nameEl.textContent = p.name;

  const badgeEl = document.getElementById('product-badge');
  if (badgeEl && p.badge) {
    const discount = getDiscountPercent(p);
    badgeEl.innerHTML = `<span class="badge badge-${p.badge.toLowerCase()}">${p.badge}${discount ? ' -' + discount + '%' : ''}</span>`;
  }

  const ratingEl = document.getElementById('product-rating');
  if (ratingEl) {
    ratingEl.innerHTML = `${renderStars(p.rating)} <span class="rating-text">${p.rating} (${p.reviews} reviews)</span>`;
  }

  const priceEl = document.getElementById('product-price');
  if (priceEl) {
    const discount = getDiscountPercent(p);
    priceEl.innerHTML = `
      <span class="current">${formatPrice(p.price)}</span>
      ${p.originalPrice ? `<span class="original">${formatPrice(p.originalPrice)}</span>` : ''}
      ${discount ? `<span class="discount">Save ${discount}%</span>` : ''}
    `;
  }

  const descEl = document.getElementById('product-desc');
  if (descEl) descEl.textContent = p.description;

  // Colors
  const colorsEl = document.getElementById('color-options');
  if (colorsEl && p.colors) {
    selectedColor = p.colors[0];
    const colorMap = {
      'Black': '#1a1a1a', 'Silver': '#c0c0c0', 'Navy': '#1e3a5f',
      'Rose Gold': '#b76e79', 'Red': '#e53e3e', 'White': '#f7f7f7',
      'Tan': '#d2b48c', 'Burgundy': '#800020', 'Wood': '#8B4513',
      'Blue': '#2563eb', 'Emerald': '#047857', 'Blush': '#fecdd3',
      'Gold': '#d4af37', 'Purple': '#7c3aed', 'Teal': '#0d9488',
      'Gray': '#6b7280', 'Space Gray': '#4a4a4a', 'Floral': '#ec4899',
      'Geometric': '#6366f1', 'Solid': '#374151', 'Stainless': '#a8a29e'
    };
    
    colorsEl.innerHTML = `
      <div class="product-options__label">Color: <span id="selected-color">${selectedColor}</span></div>
      <div class="color-options">
        ${p.colors.map((c, i) => `
          <button class="color-option ${i === 0 ? 'active' : ''}" 
                  data-color="${c}" 
                  style="background: ${colorMap[c] || '#ccc'}; ${c === 'White' ? 'border: 1px solid #ddd;' : ''}"
                  title="${c}"
                  aria-label="${c}">
          </button>
        `).join('')}
      </div>
    `;

    colorsEl.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        colorsEl.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color;
        document.getElementById('selected-color').textContent = selectedColor;
      });
    });
  } else if (colorsEl) {
    colorsEl.style.display = 'none';
  }

  // Sizes
  const sizesEl = document.getElementById('size-options');
  if (sizesEl && p.sizes) {
    selectedSize = p.sizes[Math.floor(p.sizes.length / 2)];
    sizesEl.innerHTML = `
      <div class="product-options__label">Size</div>
      <div class="size-options">
        ${p.sizes.map(s => `
          <button class="size-option ${s === selectedSize ? 'active' : ''}" data-size="${s}">${s}</button>
        `).join('')}
      </div>
    `;

    sizesEl.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        sizesEl.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.dataset.size;
      });
    });
  } else if (sizesEl) {
    sizesEl.style.display = 'none';
  }

  // Quantity
  const qtyInput = document.getElementById('qty-input');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');

  if (qtyInput) {
    qtyInput.value = 1;
    quantity = 1;

    if (qtyMinus) {
      qtyMinus.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          qtyInput.value = quantity;
        }
      });
    }

    if (qtyPlus) {
      qtyPlus.addEventListener('click', () => {
        quantity++;
        qtyInput.value = quantity;
      });
    }

    qtyInput.addEventListener('change', () => {
      quantity = Math.max(1, parseInt(qtyInput.value) || 1);
      qtyInput.value = quantity;
    });
  }

  // Add to cart
  const addBtn = document.getElementById('add-to-cart-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      Cart.add(p.id, quantity, { color: selectedColor, size: selectedSize });
      Toast.show(`${p.name} added to cart!`, 'success');
    });
  }

  // Wishlist
  const wishBtn = document.getElementById('wishlist-btn');
  if (wishBtn) {
    if (API.isFavorite(p.id)) wishBtn.classList.add('active');
    wishBtn.addEventListener('click', () => {
      API.toggleFavorite(p.id)
        .then((active) => {
          if (active === null) return; // sent to login
          wishBtn.classList.toggle('active', active);
          Toast.show(active ? 'Added to favorites!' : 'Removed from favorites', 'info');
        })
        .catch((err) => Toast.show(err.message, 'error', 4000));
    });
  }

  // Specs
  const specsEl = document.getElementById('product-specs');
  if (specsEl && p.specs) {
    specsEl.innerHTML = Object.entries(p.specs).map(([key, val]) => `
      <tr>
        <td>${key}</td>
        <td>${val}</td>
      </tr>
    `).join('');
  }
}

function renderRelated() {
  const container = document.getElementById('related-products');
  if (!container || !currentProduct) return;

  const related = products
    .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
    .slice(0, 4);

  if (related.length === 0) {
    container.closest('.section')?.classList.add('hidden');
    return;
  }

  container.innerHTML = related.map(p => renderProductCard(p)).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  API.withCatalog(initProductDetails, document.querySelector('.product-detail'));
});
