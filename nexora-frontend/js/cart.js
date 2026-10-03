// NEXORA Cart Management
const Cart = {
  KEY: 'nexora_cart',
  WISHLIST_KEY: 'nexora_wishlist',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  save(cart) {
    localStorage.setItem(this.KEY, JSON.stringify(cart));
    this.updateUI();
  },

  add(productId, quantity = 1, options = {}) {
    const cart = this.get();
    const product = getProductById(productId);
    if (!product) return false;

    const existing = cart.find(item => 
      item.id === productId && 
      item.color === (options.color || null) && 
      item.size === (options.size || null)
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: quantity,
        color: options.color || null,
        size: options.size || null
      });
    }

    this.save(cart);
    return true;
  },

  remove(index) {
    const cart = this.get();
    cart.splice(index, 1);
    this.save(cart);
  },

  updateQty(index, quantity) {
    const cart = this.get();
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
    this.save(cart);
  },

  // Refresh saved cart items from the database so old prices/names never show,
  // and drop products that no longer exist. Call after the catalog has loaded.
  syncWithCatalog() {
    const cart = this.get();
    let changed = false;
    const synced = cart.filter(item => {
      const p = getProductById(item.id);
      if (!p) { changed = true; return false; }
      if (p.price !== item.price || p.name !== item.name || p.image !== item.image) {
        item.price = p.price;
        item.name = p.name;
        item.image = p.image;
        changed = true;
      }
      return true;
    });
    if (changed) this.save(synced);
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.updateUI();
  },

  getCount() {
    return this.get().reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.get().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getShipping() {
    const subtotal = this.getSubtotal();
    return subtotal >= 75 ? 0 : 9.99;
  },

  getTotal() {
    return this.getSubtotal() + this.getShipping();
  },

  updateUI() {
    const count = this.getCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  // Wishlist
  getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(this.WISHLIST_KEY)) || [];
    } catch {
      return [];
    }
  },

  toggleWishlist(productId) {
    let list = this.getWishlist();
    const idx = list.indexOf(productId);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(productId);
    }
    localStorage.setItem(this.WISHLIST_KEY, JSON.stringify(list));
    return list.includes(productId);
  },

  isWishlisted(productId) {
    return this.getWishlist().includes(productId);
  }
};

// Initialize cart UI on load
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateUI();
});
