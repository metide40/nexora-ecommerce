// NEXORA Shop Page Logic

let filteredProducts = [...products];
let currentFilters = {
  categories: [],
  minPrice: 0,
  maxPrice: 1000,
  minRating: 0,
  search: '',
  dealsOnly: false
};
let currentSort = 'featured';

function initShop() {
  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const search = params.get('search');
  const deals = params.get('deals');

  if (category && category !== 'deals') {
    currentFilters.categories = [category];
    const checkbox = document.querySelector(`input[name="category"][value="${category}"]`);
    if (checkbox) checkbox.checked = true;
  }

  if (deals === '1' || category === 'deals') {
    currentFilters.dealsOnly = true;
  }

  if (search) {
    currentFilters.search = search.toLowerCase();
    const searchInput = document.querySelector('.shop-search-input');
    if (searchInput) searchInput.value = search;
  }

  // Event listeners
  document.querySelectorAll('input[name="category"]').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  document.querySelectorAll('input[name="rating"]').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  if (minPrice) minPrice.addEventListener('change', applyFilters);
  if (maxPrice) maxPrice.addEventListener('change', applyFilters);

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFilters();
    });
  }

  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }

  // Mobile filter toggle
  const filterToggle = document.getElementById('filter-toggle');
  const sidebar = document.querySelector('.shop-sidebar');
  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  applyFilters();
}

function applyFilters() {
  // Categories
  currentFilters.categories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
    .map(cb => cb.value);

  // Price
  const minInput = document.getElementById('min-price');
  const maxInput = document.getElementById('max-price');
  currentFilters.minPrice = minInput ? parseFloat(minInput.value) || 0 : 0;
  currentFilters.maxPrice = maxInput ? parseFloat(maxInput.value) || 1000 : 1000;

  // Rating
  const ratingCb = document.querySelector('input[name="rating"]:checked');
  currentFilters.minRating = ratingCb ? parseFloat(ratingCb.value) : 0;

  // Filter
  filteredProducts = products.filter(p => {
    // Deals only (products with originalPrice / discount)
    if (currentFilters.dealsOnly && !p.originalPrice) {
      return false;
    }
    // Category
    if (currentFilters.categories.length && !currentFilters.categories.includes(p.category)) {
      return false;
    }
    // Price
    if (p.price < currentFilters.minPrice || p.price > currentFilters.maxPrice) {
      return false;
    }
    // Rating
    if (p.rating < currentFilters.minRating) {
      return false;
    }
    // Search
    if (currentFilters.search) {
      const q = currentFilters.search;
      if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort
  switch (currentSort) {
    case 'price-low':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      filteredProducts.sort((a, b) => b.rating - a.rating);
      break;
    case 'featured':
    default:
      filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }

  renderShopProducts();
}

function renderShopProducts() {
  const container = document.getElementById('shop-products');
  const countEl = document.getElementById('product-count');

  if (countEl) {
    countEl.textContent = `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`;
  }

  if (!container) return;

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search terms.</p>
        <button class="btn btn-primary" onclick="clearFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredProducts.map(p => renderProductCard(p)).join('');
}

function clearFilters() {
  document.querySelectorAll('input[name="category"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="rating"]').forEach(cb => cb.checked = false);
  const minInput = document.getElementById('min-price');
  const maxInput = document.getElementById('max-price');
  if (minInput) minInput.value = '';
  if (maxInput) maxInput.value = '';
  
  currentFilters = { categories: [], minPrice: 0, maxPrice: 1000, minRating: 0, search: '', dealsOnly: false };
  currentSort = 'featured';
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'featured';

  // Clear URL params
  window.history.replaceState({}, '', 'shop.html');
  
  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  API.withCatalog(initShop, 'shop-products');
});
