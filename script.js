/* =====================================================================
   KONFIGURASI — edit di sini
   ===================================================================== */
const MENU_VERSION = 2;          // naikkan angka ini kalau kamu mengubah menuData di atas (menu tersimpan akan di-reset)
const SERVICE_FEE = 2000;
const TABLE_COUNT = 14;
// Promo persen untuk satu menu. Ganti "until" kalau promo diperpanjang (format YYYY-MM-DD).
const PROMO = { itemId: "nasi-goreng", percent: 30, until: "2026-12-31" };
// Kode voucher yang bisa dipakai pelanggan di halaman checkout.
const VOUCHERS = { WARJO5: { flat: 5000, label: "Potongan Rp5.000" } };
const STATUS_LABELS = ["Pesanan diterima", "Sedang diproses", "Sedang dibuat", "Siap diambil", "Selesai"];
const SPICY_CATEGORIES = ["Makanan", "Mie", "Snack"];
const VIEWS = ["home", "menu", "promo", "orders", "account", "favorite", "history", "cart", "checkout", "payment", "success", "tracking"];
const HIDE_FLOATING_CART_ON = ["cart", "checkout", "payment", "success"];

/* =====================================================================
   Util
   ===================================================================== */
const SEED_MENU = JSON.parse(JSON.stringify(menuData));

const LS = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const IMG_FALLBACK = `onerror="this.onerror=null;this.src='img/Warjo_Logo.png'"`;

function formatCurrency(value) {
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)},-`;
}

/* =====================================================================
   Menu (dibagi dengan admin.html lewat localStorage)
   ===================================================================== */
function refreshMenu() {
  let list = LS.get("warjo_menu", null);
  if (!Array.isArray(list) || !list.length || LS.get("warjo_menu_v", 0) !== MENU_VERSION) {
    list = JSON.parse(JSON.stringify(SEED_MENU));
    LS.set("warjo_menu", list);
    LS.set("warjo_menu_v", MENU_VERSION);
  }
  menuData.splice(0, menuData.length, ...list.filter((i) => i.active !== false));
}
refreshMenu();

const extrasOf = (item) => (item && Array.isArray(item.extras) ? item.extras : []);
const getItemById = (id) => menuData.find((item) => item.id === id);

/* =====================================================================
   State
   ===================================================================== */
const persisted = LS.get("warjo_state", {}) || {};
const state = {
  currentView: "home",
  activeCategory: "all",
  searchTerm: "",
  modeSelectionSeen: false,
  orderMode: persisted.orderMode === "takeaway" ? "takeaway" : "dinein",
  tableNumber: persisted.tableNumber || "",
  customerName: persisted.customerName || "",
  whatsapp: persisted.whatsapp || "",
  pickupTime: persisted.pickupTime || "",
  payment: persisted.payment || "QRIS",
  orderNote: "",
  voucher: persisted.voucher || "",
  cart: Array.isArray(persisted.cart) ? persisted.cart : [],
  favorites: Array.isArray(persisted.favorites) ? persisted.favorites : [],
  currentOrderNumber: persisted.currentOrderNumber || "",
  justOrdered: false,
  modal: null,
  trackingStep: -1,
  trackingTimer: null
};

function persist() {
  LS.set("warjo_state", {
    orderMode: state.orderMode, tableNumber: state.tableNumber, customerName: state.customerName,
    whatsapp: state.whatsapp, pickupTime: state.pickupTime, payment: state.payment, voucher: state.voucher,
    cart: state.cart, favorites: state.favorites, currentOrderNumber: state.currentOrderNumber
  });
}

const mainView = document.getElementById("main-view");
const modalRoot = document.getElementById("modal-root");
const toastContainer = document.getElementById("toast-container");
const headerSearch = document.getElementById("header-search");
const tableIndicator = document.getElementById("table-indicator");

/* =====================================================================
   Keranjang & harga
   ===================================================================== */
function pruneCart() {
  const used = {};
  state.cart = state.cart
    .filter((e) => e && getItemById(e.itemId) && e.quantity > 0)
    .map((e) => {
      const item = getItemById(e.itemId);
      const valid = new Set(extrasOf(item).map((x) => x.label));
      e.key = e.key || uid();
      e.extras = (e.extras || []).filter((l) => valid.has(l));
      e.spicy = e.spicy || "Tidak Pedas";
      e.note = e.note || "";
      const room = Math.max(0, item.stock - (used[e.itemId] || 0));
      e.quantity = Math.min(e.quantity, room);
      used[e.itemId] = (used[e.itemId] || 0) + e.quantity;
      return e;
    })
    .filter((e) => e.quantity > 0);
}

function getCartItems() {
  return state.cart.map((entry) => ({ ...entry, item: getItemById(entry.itemId) })).filter((e) => e.item);
}
const getCartCount = () => state.cart.reduce((sum, e) => sum + e.quantity, 0);
const itemQtyInCart = (itemId) => state.cart.filter((e) => e.itemId === itemId).reduce((s, e) => s + e.quantity, 0);

function entryUnitPrice(entry) {
  const item = entry.item || getItemById(entry.itemId);
  const extrasTotal = (entry.extras || []).reduce((sum, label) => sum + (extrasOf(item).find((x) => x.label === label)?.price || 0), 0);
  return item.price + extrasTotal;
}
const getSubtotal = () => getCartItems().reduce((sum, e) => sum + entryUnitPrice(e) * e.quantity, 0);

function promoActive() {
  if (!PROMO) return false;
  const end = new Date(`${PROMO.until}T23:59:59`);
  return !isNaN(end) && Date.now() <= end.getTime() && !!getItemById(PROMO.itemId);
}
function getPromoDiscount() {
  if (!promoActive()) return 0;
  return getCartItems()
    .filter((e) => e.itemId === PROMO.itemId)
    .reduce((sum, e) => sum + Math.round((e.item.price * PROMO.percent) / 100) * e.quantity, 0);
}
function getVoucherDiscount() {
  const v = VOUCHERS[state.voucher];
  if (!v) return 0;
  return Math.max(0, Math.min(v.flat, getSubtotal() - getPromoDiscount()));
}
const getServiceFee = () => (state.cart.length ? SERVICE_FEE : 0);
const getTotal = () => Math.max(0, getSubtotal() - getPromoDiscount() - getVoucherDiscount()) + getServiceFee();

function totalsHTML(totalLabel) {
  const promo = getPromoDiscount();
  const voucher = getVoucherDiscount();
  return `
    <div class="meta-row"><span>Subtotal</span><strong>${formatCurrency(getSubtotal())}</strong></div>
    ${promo ? `<div class="meta-row"><span>Promo ${PROMO.percent}%</span><strong>- ${formatCurrency(promo)}</strong></div>` : ""}
    ${voucher ? `<div class="meta-row"><span>Voucher ${esc(state.voucher)}</span><strong>- ${formatCurrency(voucher)}</strong></div>` : ""}
    <div class="meta-row"><span>Biaya Layanan</span><strong>${formatCurrency(getServiceFee())}</strong></div>
    <div class="summary-total"><span>${totalLabel}</span><span>${formatCurrency(getTotal())}</span></div>
  `;
}

/** Tambah baris ke keranjang. Mengembalikan true kalau berhasil. */
function addLine(itemId, quantity, extras = [], spicy = "Tidak Pedas", note = "", clamp = false) {
  const item = getItemById(itemId);
  if (!item || item.stock <= 0) return false;
  const room = item.stock - itemQtyInCart(itemId);
  if (room <= 0) return false;
  if (quantity > room) {
    if (!clamp) return false;
    quantity = room;
  }
  const sig = JSON.stringify(extras.slice().sort());
  const existing = state.cart.find((e) => e.itemId === itemId && e.spicy === spicy && e.note === note && JSON.stringify(e.extras.slice().sort()) === sig);
  if (existing) existing.quantity += quantity;
  else state.cart.push({ key: uid(), itemId, quantity, extras: extras.slice(), spicy, note });
  return true;
}

function addToCart(itemId, quantity = 1, extras = [], spicy = "Tidak Pedas", note = "") {
  const item = getItemById(itemId);
  if (!item) return false;
  if (!addLine(itemId, quantity, extras, spicy, note)) {
    showToast(item.stock <= 0 ? `${item.name} sedang habis` : `Stok ${item.name} tinggal ${item.stock}`);
    return false;
  }
  showToast(`${item.name} ditambahkan ke keranjang`);
  render();
  return true;
}

/** Tombol +/- di kartu menu (menjumlah semua varian item itu). */
function changeItemQty(itemId, delta) {
  if (delta > 0) {
    const plain = state.cart.find((e) => e.itemId === itemId && !e.extras.length && e.spicy === "Tidak Pedas" && !e.note);
    if (plain) {
      const item = getItemById(itemId);
      if (itemQtyInCart(itemId) >= item.stock) return showToast(`Stok ${item.name} tinggal ${item.stock}`);
      plain.quantity += 1;
      return render();
    }
    return void addToCart(itemId, 1);
  }
  const lines = state.cart.filter((e) => e.itemId === itemId);
  const last = lines[lines.length - 1];
  if (!last) return;
  last.quantity -= 1;
  if (last.quantity <= 0) state.cart = state.cart.filter((e) => e !== last);
  render();
}

/** Tombol +/- di halaman keranjang (per baris). */
function changeEntryQty(key, delta) {
  const entry = state.cart.find((e) => e.key === key);
  if (!entry) return;
  const item = getItemById(entry.itemId);
  if (delta > 0 && itemQtyInCart(entry.itemId) >= item.stock) return showToast(`Stok ${item.name} tinggal ${item.stock}`);
  entry.quantity += delta;
  if (entry.quantity <= 0) state.cart = state.cart.filter((e) => e !== entry);
  render();
}

function toggleFavorite(itemId) {
  state.favorites = state.favorites.includes(itemId) ? state.favorites.filter((id) => id !== itemId) : [...state.favorites, itemId];
  render();
}

/* =====================================================================
   Toast
   ===================================================================== */
function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast show";
  el.textContent = message;
  toastContainer.replaceChildren(el);
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toastContainer.replaceChildren(), 2400);
}

/* =====================================================================
   Navigasi (hash routing supaya tombol Back berfungsi)
   ===================================================================== */
function viewFromHash() {
  const v = location.hash.replace(/^#\/?/, "");
  return VIEWS.includes(v) ? v : "home";
}
function navigate(view) {
  if (!VIEWS.includes(view)) view = "home";
  if (location.hash === `#${view}`) applyView(view);
  else location.hash = view;
}
function navHighlight(view) {
  if (["favorite", "history"].includes(view)) return "account";
  if (["checkout", "payment", "success", "tracking"].includes(view)) return "orders";
  return view;
}
function applyView(view) {
  pruneCart();
  if ((view === "checkout" || view === "payment") && !state.cart.length) view = "cart";
  if (view === "success" && !state.justOrdered) view = "home";
  if (location.hash !== `#${view}` && !(view === "home" && !location.hash)) history.replaceState(null, "", `#${view}`);
  if (view !== "tracking") stopTrackingPoll();
  closeModal();
  state.currentView = view;
  document.querySelectorAll(".nav-link").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === navHighlight(view)));
  window.scrollTo(0, 0);
  render();
  if (view === "tracking") startTrackingPoll();
  if (!state.modeSelectionSeen && view === "home") openOrderModeModal();
}
window.addEventListener("hashchange", () => applyView(viewFromHash()));

/* =====================================================================
   Header
   ===================================================================== */
function renderHeaderSearch() {
  if (document.activeElement !== headerSearch) headerSearch.value = state.searchTerm;
  if (tableIndicator) {
    const hasTable = state.orderMode === "dinein" && state.tableNumber;
    tableIndicator.textContent = hasTable ? `Meja ${state.tableNumber}` : "";
    tableIndicator.classList.toggle("hidden", !hasTable);
  }
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

/* =====================================================================
   Filter & kartu menu
   ===================================================================== */
const BASE_CATEGORIES = ["Makanan", "Mie", "Snack", "Minuman", "Dessert"];

function renderCategoryChips() {
  const categories = [
    { key: "all", label: "Semua Menu" },
    { key: "best-seller", label: "↗ Best Seller" },
    { key: "heavy-food", label: "Makanan Berat" },
    { key: "light-food", label: "Makanan Ringan" },
    { key: "Minuman", label: "Minuman" },
    { key: "Dessert", label: "Dessert" }
  ];
  // kategori baru dari admin ikut muncul sebagai chip
  [...new Set(menuData.map((i) => i.category))].filter((c) => c && !BASE_CATEGORIES.includes(c)).forEach((c) => categories.push({ key: c, label: c }));
  if (!categories.some((c) => c.key === state.activeCategory)) state.activeCategory = "all";

  return categories.map((c) => `
    <button class="category-pill ${state.activeCategory === c.key ? "active" : ""}" data-category="${esc(c.key)}">${esc(c.label)}</button>
  `).join("");
}

function getFilteredMenu() {
  const search = state.searchTerm.trim().toLowerCase();
  return menuData.filter((item) => {
    const matchingCategory = state.activeCategory === "all" ||
      (state.activeCategory === "best-seller" && item.badge === "Terlaris") ||
      (state.activeCategory === "heavy-food" && ["Makanan", "Mie"].includes(item.category)) ||
      (state.activeCategory === "light-food" && item.category === "Snack") ||
      item.category === state.activeCategory;
    const searchMatch = !search || [item.name, item.category, item.description, ...(item.tags || [])].join(" ").toLowerCase().includes(search);
    return matchingCategory && searchMatch;
  });
}

function renderCard(item) {
  const qty = itemQtyInCart(item.id);
  const favorite = state.favorites.includes(item.id);
  const promoOn = item.promo || (promoActive() && item.id === PROMO.itemId);
  const out = item.stock <= 0;
  const lowStock = !out && item.stock <= 5;

  return `
    <article class="menu-card">
      <div class="menu-image-wrap" data-item-id="${esc(item.id)}">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" ${IMG_FALLBACK} />
        ${out ? '<div class="card-status out-of-stock">HABIS</div>' : ""}
        <button class="favorite-btn ${favorite ? "active" : ""}" data-favorite="${esc(item.id)}" aria-label="Favorit ${esc(item.name)}">❤</button>
      </div>
      <div class="menu-card-body">
        <div class="menu-meta">
          <h3 class="menu-title">${esc(item.name)}</h3>
          <span class="price">${formatCurrency(item.price)}</span>
        </div>
        <div class="badges">
          ${item.badge ? `<span class="badge best-seller">🔥 ${esc(item.badge)}</span>` : ""}
          ${promoOn ? '<span class="badge promo">⚡ Promo</span>' : ""}
          ${lowStock ? `<span class="badge">Sisa ${item.stock}</span>` : ""}
        </div>
        <div class="menu-card-footer">
          ${out ? '<button class="hold-btn" disabled>Habis</button>' : qty > 0 ? `
            <div class="qty-controls">
              <button class="qty-btn" data-qty="decrease" data-item-id="${esc(item.id)}" aria-label="Kurangi">−</button>
              <span class="qty-value">${qty}</span>
              <button class="qty-btn" data-qty="increase" data-item-id="${esc(item.id)}" aria-label="Tambah">+</button>
            </div>
          ` : `<button class="add-btn" data-add="${esc(item.id)}" aria-label="Tambah ${esc(item.name)}">+</button>`}
        </div>
      </div>
    </article>
  `;
}

const gridHTML = (list) => (list.length ? list.map(renderCard).join("") : renderEmptyState("menu"));

function renderEmptyState(type) {
  if (type === "menu") {
    return `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>Menu tidak ditemukan</h3>
        <p>Coba kata kunci lain seperti nasi, minuman, atau mie.</p>
      </div>`;
  }
  if (type === "history") {
    return `
      <div class="empty-state">
        <div class="emoji">🧾</div>
        <h3>Belum ada riwayat pesanan</h3>
        <p>Pesanan yang kamu buat akan muncul di sini.</p>
        <button class="primary-btn" data-view="menu">Lihat Menu</button>
      </div>`;
  }
  if (type === "tracking") {
    return `
      <div class="empty-state">
        <div class="emoji">📦</div>
        <h3>Belum ada pesanan aktif</h3>
        <p>Pesan dulu, nanti statusnya bisa dilacak di sini.</p>
        <button class="primary-btn" data-view="menu">Lihat Menu</button>
      </div>`;
  }
  return `
    <div class="empty-state">
      <div class="emoji">❤️</div>
      <h3>Belum ada menu favorit</h3>
      <p>Simpan menu yang sering kamu pesan.</p>
    </div>`;
}

/* =====================================================================
   Halaman
   ===================================================================== */
function renderHome() {
  const on = promoActive();
  const promoItem = on ? getItemById(PROMO.itemId) : null;
  mainView.innerHTML = `
    <div class="page home-page">
      <section class="home-intro">
        <h1>${getTimeGreeting()}, Mau Pesan Apa?</h1>
      </section>

      <section class="feature-grid">
        <article class="feature-card dark">
          <div class="feature-copy">
            <span class="feature-kicker">PELAYANAN TERBAIK</span>
            <h2>24/7</h2>
          </div>
        </article>
        ${on ? `
        <article class="feature-card light" data-view="promo" style="cursor:pointer">
          <div class="feature-copy">
            <span class="feature-kicker">PROMO DISKON ${esc(promoItem.name.toUpperCase())}</span>
            <h2>${PROMO.percent}%</h2>
          </div>
        </article>` : ""}
      </section>

      <section class="home-filters">
        <div class="category-row">${renderCategoryChips()}</div>
      </section>

      <section class="full-section">
        <div class="grid-menu">${gridHTML(getFilteredMenu())}</div>
      </section>
    </div>`;
}

function renderMenu() {
  mainView.innerHTML = `
    <div class="page">
      <section class="full-section">
        <div class="section-head"><h2>Semua Menu</h2></div>
        <div class="search-box">
          <span>🔍</span>
          <input id="search-input-menu" type="text" value="${esc(state.searchTerm)}" placeholder="Cari makanan atau minuman..." />
        </div>
        <div class="category-row">${renderCategoryChips()}</div>
        <div class="grid-menu">${gridHTML(getFilteredMenu())}</div>
      </section>
    </div>`;
}

function renderPromo() {
  const on = promoActive();
  const item = on ? getItemById(PROMO.itemId) : null;
  const others = menuData.filter((i) => i.promo && i.stock > 0 && !(item && i.id === item.id));
  const until = on ? new Date(`${PROMO.until}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";

  mainView.innerHTML = `
    <div class="page">
      <section class="summary-card">
        <h3>🔥 Promo Hari Ini</h3>
        ${on ? `
        <div class="promo-card" style="margin-top: 10px;">
          <div class="promo-media">
            <img class="promo-thumb" src="${esc(item.image)}" alt="Promo ${esc(item.name)}" ${IMG_FALLBACK} />
            <div>
              <h3>Promo Diskon ${esc(item.name)}</h3>
              <h4>Diskon ${PROMO.percent}%</h4>
              <div class="promo-price">
                <span class="old-price">${formatCurrency(item.price)}</span>
                <span class="price-tag">${formatCurrency(Math.round(item.price * (100 - PROMO.percent) / 100))}</span>
              </div>
              <p style="margin: 10px 0 0; color: var(--muted);">Berlaku sampai ${until}</p>
              <div class="hero-actions" style="margin-top: 14px;">
                ${item.stock > 0 ? `<button class="primary-btn" data-quick-add="${esc(item.id)}">Pesan Sekarang</button>` : `<button class="hold-btn" disabled>Habis</button>`}
              </div>
            </div>
          </div>
        </div>` : `<p style="color: var(--muted);">Belum ada promo aktif saat ini. Cek lagi nanti ya!</p>`}
      </section>

      <section class="summary-card" style="margin-top: 16px;">
        <h3>🎟️ Voucher</h3>
        ${Object.entries(VOUCHERS).map(([code, v]) => `
          <div class="meta-row"><span><strong>${esc(code)}</strong></span><span>${esc(v.label)}</span></div>`).join("") || '<p style="color: var(--muted);">Belum ada voucher.</p>'}
        <p style="margin: 8px 0 0; color: var(--muted);">Masukkan kode di halaman Checkout.</p>
      </section>

      ${others.length ? `
      <section class="full-section" style="margin-top: 16px;">
        <div class="section-head"><h2>Menu Promo Lainnya</h2></div>
        <div class="grid-menu">${others.map(renderCard).join("")}</div>
      </section>` : ""}
    </div>`;
}

/* ----- form mode pesanan (dipakai di halaman Pesanan & Checkout) ----- */
function orderFieldsHTML() {
  const dine = state.orderMode === "dinein";
  const tables = Array.from({ length: TABLE_COUNT }, (_, i) => String(i + 1));
  return `
    <div class="mode-grid">
      <button class="mode-btn ${dine ? "active" : ""}" data-order-mode="dinein">
        <span>🍽️</span><strong>Makan di Tempat</strong><small>Diantar ke meja</small>
      </button>
      <button class="mode-btn ${!dine ? "active" : ""}" data-order-mode="takeaway">
        <span>🥡</span><strong>Bawa Pulang</strong><small>Ambil sendiri</small>
      </button>
    </div>
    <div class="field-group">
      ${dine ? `
        <label>
          <span>Nomor Meja</span>
          <select id="table-number-input">
            <option value="">Pilih Meja</option>
            ${tables.map((n) => `<option value="${n}" ${n === String(state.tableNumber) ? "selected" : ""}>Meja ${n}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Nama (opsional)</span>
          <input id="customer-name-input" type="text" autocomplete="name" value="${esc(state.customerName)}" placeholder="Nama kamu" />
        </label>
      ` : `
        <label>
          <span>Nama</span>
          <input id="customer-name-input" type="text" autocomplete="name" value="${esc(state.customerName)}" placeholder="Nama kamu" />
        </label>
        <label>
          <span>Nomor WhatsApp</span>
          <input id="customer-whatsapp-input" type="tel" inputmode="tel" autocomplete="tel" value="${esc(state.whatsapp)}" placeholder="08123456789" />
        </label>
        <label>
          <span>Estimasi pengambilan</span>
          <input id="pickup-time-input" type="time" value="${esc(state.pickupTime)}" />
        </label>
      `}
    </div>`;
}

function renderOrders() {
  const active = getTrackedOrder();
  const hasActive = active && active.status < 4;
  mainView.innerHTML = `
    <div class="page">
      ${hasActive ? `
      <section class="summary-card" style="margin-bottom: 16px;">
        <h3>Pesanan Aktif #${esc(active.orderNumber)}</h3>
        <p style="margin: 6px 0 12px; color: var(--muted);">${esc(statusLabel(active, active.status))}</p>
        <button class="primary-btn" data-view="tracking">Lacak Pesanan</button>
      </section>` : ""}
      <section class="summary-card">
        <h3>Pesanan Saya</h3>
        <div class="order-mode-box">
          ${orderFieldsHTML()}
          <div class="hero-actions">
            <button class="primary-btn" data-view="cart">Lanjut ke Keranjang</button>
          </div>
        </div>
      </section>
    </div>`;
}

function renderAccount() {
  mainView.innerHTML = `
    <div class="page">
      <section class="account-box">
        <h3>Akun Saya</h3>
        <div class="field-group">
          <label><span>Nama</span><input id="profile-name-input" type="text" value="${esc(state.customerName)}" placeholder="Nama kamu" /></label>
          <label><span>Nomor WhatsApp</span><input id="profile-wa-input" type="tel" value="${esc(state.whatsapp)}" placeholder="08123456789" /></label>
          <small class="field-help">Tersimpan otomatis di perangkat ini dan dipakai saat checkout.</small>
        </div>
      </section>

      <section class="account-box">
        <h3>Menu Akun</h3>
        <div class="account-list">
          <button class="account-item" data-view="favorite"><span class="icon">❤️</span><span>Favorit</span></button>
          <button class="account-item" data-view="history"><span class="icon">🧾</span><span>Riwayat Pesanan</span></button>
          <button class="account-item" data-view="promo"><span class="icon">🎟️</span><span>Voucher</span></button>
          <button class="account-item" data-soon="Poin Hadiah"><span class="icon">⭐</span><span>Poin Hadiah</span></button>
          <button class="account-item" data-soon="Pengaturan"><span class="icon">⚙️</span><span>Pengaturan</span></button>
        </div>
      </section>
    </div>`;
}

function renderFavorite() {
  const favItems = menuData.filter((item) => state.favorites.includes(item.id));
  mainView.innerHTML = `
    <div class="page">
      ${favItems.length ? `
        <section class="fav-card">
          <h3>Favorit Saya</h3>
          <div class="favorite-list">
            ${favItems.map((item) => `
              <div class="favorite-item">
                <div class="meta">
                  <strong>${esc(item.name)}</strong>
                  <small>${formatCurrency(item.price)}</small>
                </div>
                ${item.stock > 0 ? `<button class="small-btn" data-add="${esc(item.id)}">Tambah</button>` : `<button class="small-btn" disabled>Habis</button>`}
              </div>`).join("")}
          </div>
        </section>` : renderEmptyState("favorite")}
    </div>`;
}

/* ----- riwayat ----- */
function getHistory() {
  const live = LS.get("warjo_orders", []);
  return (LS.get("warjo_history", []) || []).map((h) => {
    const l = live.find((o) => o.orderNumber === h.orderNumber);
    return l ? { ...h, status: l.status } : h;
  });
}
const statusLabel = (order, step) => (order.mode === "dinein" && step === 3 ? "Siap diantar" : STATUS_LABELS[step] || STATUS_LABELS[0]);

function renderHistory() {
  const list = getHistory();
  mainView.innerHTML = `
    <div class="page">
      ${list.length ? `
      <section class="history-card">
        <h3>Riwayat Pesanan</h3>
        <div class="history-items">
          ${list.map((order) => `
            <div class="history-item">
              <div class="meta">
                <strong>#${esc(order.orderNumber)}</strong>
                <small>${new Date(order.createdAt).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                <small>${order.items.map((i) => `${esc(i.name)} x${i.qty}`).join(", ")}</small>
                <strong>${formatCurrency(order.total)}</strong>
              </div>
              <div style="display:grid; gap:8px; justify-items:end;">
                <span class="tag ${order.status === 4 ? "" : "pending"}">${esc(statusLabel(order, order.status))}</span>
                <button class="small-btn" data-reorder="${esc(order.orderNumber)}">Pesan Lagi</button>
              </div>
            </div>`).join("")}
        </div>
      </section>` : renderEmptyState("history")}
    </div>`;
}

function reorder(orderNumber) {
  const order = getHistory().find((o) => o.orderNumber === orderNumber);
  if (!order) return;
  let added = 0;
  order.items.forEach((i) => { if (addLine(i.id, i.qty, i.extras || [], i.spicy || "Tidak Pedas", i.note || "", true)) added++; });
  if (!added) return showToast("Menu di pesanan ini sedang tidak tersedia.");
  if (added < order.items.length) showToast("Sebagian menu sedang habis dan dilewati.");
  navigate("cart");
}

/* ----- keranjang ----- */
function renderCart() {
  const cartItems = getCartItems();
  if (!cartItems.length) {
    mainView.innerHTML = `
      <div class="page">
        <section class="empty-state">
          <div class="emoji">🛒</div>
          <h3>Keranjang masih kosong</h3>
          <p>Yuk pilih makanan favoritmu.</p>
          <button class="primary-btn" data-view="menu">Lihat Menu</button>
        </section>
      </div>`;
    return;
  }

  mainView.innerHTML = `
    <div class="page">
      <section class="checkout-card">
        <h3>Keranjang</h3>
        <div class="cart-list">
          ${cartItems.map((entry) => `
            <div class="cart-item">
              <img src="${esc(entry.item.image)}" alt="${esc(entry.item.name)}" ${IMG_FALLBACK} />
              <div>
                <h4>${esc(entry.item.name)}</h4>
                <div class="cart-item-price">${formatCurrency(entryUnitPrice(entry))}</div>
                <div class="badges" style="margin-top: 6px;">
                  ${entry.spicy !== "Tidak Pedas" && SPICY_CATEGORIES.includes(entry.item.category) ? `<span class="badge">${esc(entry.spicy)}</span>` : ""}
                  ${entry.extras.map((x) => `<span class="badge">${esc(x)}</span>`).join("")}
                </div>
                ${entry.note ? `<small style="color: var(--muted);">Catatan: ${esc(entry.note)}</small>` : ""}
              </div>
              <div class="cart-item-controls">
                <div class="qty-controls">
                  <button class="qty-btn" data-qty="decrease" data-key="${esc(entry.key)}" aria-label="Kurangi">−</button>
                  <span class="qty-value">${entry.quantity}</span>
                  <button class="qty-btn" data-qty="increase" data-key="${esc(entry.key)}" aria-label="Tambah">+</button>
                </div>
              </div>
            </div>`).join("")}
        </div>

        <div class="total-box" style="margin-top: 18px;">${totalsHTML("Total")}</div>

        <div class="hero-actions" style="margin-top: 18px;">
          <button class="primary-btn" data-view="checkout">Lanjut ke Checkout</button>
        </div>
      </section>
    </div>`;
}

function renderCheckout() {
  const methods = ["QRIS", "Tunai", "Dompet Digital", "Kartu Debit"];
  const voucherApplied = !!VOUCHERS[state.voucher];
  mainView.innerHTML = `
    <div class="page">
      <section class="checkout-grid">
        <div class="checkout-card">
          <h3>Checkout</h3>
          <div class="order-mode-box">
            ${orderFieldsHTML()}

            <div class="cart-list" style="margin-top: 14px;">
              ${getCartItems().map((entry) => `
                <div class="cart-item">
                  <img src="${esc(entry.item.image)}" alt="${esc(entry.item.name)}" ${IMG_FALLBACK} />
                  <div>
                    <h4>${esc(entry.item.name)}</h4>
                    <div class="cart-item-price">${entry.quantity}x ${formatCurrency(entryUnitPrice(entry))}</div>
                  </div>
                  <strong>${formatCurrency(entryUnitPrice(entry) * entry.quantity)}</strong>
                </div>`).join("")}
            </div>

            <div class="field-group">
              <div>
                <label for="order-note-input">Catatan Pesanan</label>
                <textarea id="order-note-input" placeholder="Tulis catatan untuk restoran...">${esc(state.orderNote)}</textarea>
              </div>
              <div>
                <label for="voucher-input">Voucher</label>
                <div class="voucher-row">
                  <input id="voucher-input" type="text" placeholder="Masukkan kode voucher" value="${esc(state.voucher)}" ${voucherApplied ? "readonly" : ""} />
                  ${voucherApplied ? `<button class="small-btn" data-voucher-remove>Hapus</button>` : `<button class="small-btn" data-voucher-apply>Gunakan</button>`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="checkout-card">
          <h3>Pembayaran</h3>
          <div class="payment-options">
            ${methods.map((m) => `
              <label class="radio-option"><input type="radio" name="payment-method" value="${m}" ${state.payment === m ? "checked" : ""} /> <span>${m}</span></label>`).join("")}
          </div>

          <div class="total-box" style="margin-top: 18px;">${totalsHTML("Total Pembayaran")}</div>

          <div class="hero-actions" style="margin-top: 18px;">
            <button class="primary-btn" style="width: 100%;" data-payment="start">Pesan Sekarang</button>
          </div>
        </aside>
      </section>
    </div>`;
}

function validateOrder() {
  if (!getCartItems().length) { showToast("Keranjang masih kosong."); return false; }
  if (state.orderMode === "dinein") {
    const n = Number(state.tableNumber);
    if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) { showToast("Pilih nomor meja dulu."); return false; }
  } else {
    if (!state.customerName.trim()) { showToast("Isi nama untuk pesanan bawa pulang."); return false; }
    if (!/^(\+62|62|0)8\d{7,12}$/.test(state.whatsapp.replace(/[\s-]/g, ""))) { showToast("Nomor WhatsApp belum valid (contoh: 08123456789)."); return false; }
    if (!state.pickupTime) { showToast("Pilih jam pengambilan."); return false; }
  }
  return true;
}

function renderPayment() {
  const digital = state.payment === "QRIS" || state.payment === "Dompet Digital";
  mainView.innerHTML = `
    <div class="page payment-screen">
      <div class="qr-panel">
        <div>
          <h2 style="margin: 0 0 6px; letter-spacing: -0.05em;">${digital ? `Bayar dengan ${esc(state.payment)}` : `Bayar di Kasir (${esc(state.payment)})`}</h2>
          <p style="margin: 0; color: var(--muted);">Total: <strong>${formatCurrency(getTotal())}</strong></p>
        </div>
        ${digital ? `
          <div class="qr-code" aria-label="QR code pembayaran"></div>
          <div class="payment-status"><strong>Status</strong> Menunggu pembayaran...</div>
          <button class="primary-btn" data-payment="success">Konfirmasi Pembayaran</button>
        ` : `
          <div class="payment-status"><strong>Info</strong> Pembayaran dilakukan di kasir ${state.orderMode === "dinein" ? "setelah pesanan diantar" : "saat pesanan diambil"}.</div>
          <button class="primary-btn" data-payment="success">Kirim Pesanan</button>
        `}
        <button class="secondary-btn" data-view="checkout">Kembali</button>
      </div>
    </div>`;
}

function renderSuccess() {
  const order = getTrackedOrder() || {};
  mainView.innerHTML = `
    <div class="page order-success">
      <div class="success-card">
        <div class="emoji">🎉</div>
        <h2>Pesanan Berhasil!</h2>
        <div class="order-code">Nomor Pesanan: <strong>#${esc(order.orderNumber)}</strong></div>
        <div style="margin-top: 8px; color: var(--muted);">${order.mode === "dinein" ? `Makan di Tempat · Meja ${esc(order.tableNumber)}` : "Bawa Pulang"}</div>
        <div style="margin-top: 12px; font-size: 1.15rem; font-weight: 800;">Total: ${formatCurrency(order.total || 0)}</div>
        <div style="margin-top: 6px; color: var(--muted);">Estimasi: <strong>${esc(order.estimate || "10–15 menit")}</strong></div>
        <div class="success-actions">
          <button class="primary-btn" data-view="tracking">Lihat Status Pesanan</button>
          <button class="secondary-btn" data-view="home">Kembali ke Menu</button>
        </div>
      </div>
    </div>`;
}

/* ----- pelacakan ----- */
function getTrackedOrder() {
  if (!state.currentOrderNumber) return null;
  const live = LS.get("warjo_orders", []).find((o) => o.orderNumber === state.currentOrderNumber);
  if (live) return live;
  return (LS.get("warjo_history", []) || []).find((o) => o.orderNumber === state.currentOrderNumber) || null;
}

function renderTracking() {
  const order = getTrackedOrder();
  if (!order) { mainView.innerHTML = `<div class="page">${renderEmptyState("tracking")}</div>`; return; }
  const step = Math.max(0, Math.min(4, order.status || 0));
  state.trackingStep = step;
  const done = step === 4;

  mainView.innerHTML = `
    <div class="page">
      <section class="order-tracking-card">
        <h3>Pesanan #${esc(order.orderNumber)}</h3>
        <div class="order-tracker">
          ${STATUS_LABELS.map((_, index) => `
            <div class="status-step ${index < step || done ? "completed" : index === step ? "active" : ""}">
              <span class="dot"></span>
              <span>${esc(statusLabel(order, index))}</span>
            </div>`).join("")}
        </div>
        <div style="margin-top: 18px; color: var(--muted);">
          ${done ? "<strong>Pesanan selesai. Terima kasih!</strong>" : `<strong>Estimasi selesai ${esc(order.estimate || "10–15 menit")}</strong>`}
          <p style="margin: 8px 0 0;">${order.mode === "dinein" ? `Pesanan akan diantar ke Meja ${esc(order.tableNumber)}` : "Pesanan siap diambil di kasir"}</p>
        </div>
        <ul style="margin: 16px 0 0; padding-left: 18px; color: var(--muted);">
          ${order.items.map((i) => `<li>${i.qty}× ${esc(i.name)}</li>`).join("")}
        </ul>
      </section>
    </div>`;
}

function startTrackingPoll() {
  stopTrackingPoll();
  state.trackingTimer = setInterval(() => {
    if (state.currentView !== "tracking") return stopTrackingPoll();
    const o = getTrackedOrder();
    if (o && o.status !== state.trackingStep) renderTracking();
  }, 3000);
}
function stopTrackingPoll() {
  clearInterval(state.trackingTimer);
  state.trackingTimer = null;
}

/* =====================================================================
   Kirim pesanan
   ===================================================================== */
function submitOrder() {
  refreshMenu();
  pruneCart();
  const lines = getCartItems();
  if (!lines.length) { showToast("Keranjang kosong atau stok sudah habis."); return false; }

  const orders = LS.get("warjo_orders", []);
  let orderNumber;
  do { orderNumber = `WJ-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`; }
  while (orders.some((o) => o.orderNumber === orderNumber));

  const items = lines.map((e) => ({
    id: e.itemId, name: e.item.name, qty: e.quantity, spicy: e.spicy, note: e.note, extras: e.extras, price: entryUnitPrice(e)
  }));
  const order = {
    orderNumber, mode: state.orderMode,
    tableNumber: state.orderMode === "dinein" ? state.tableNumber : "",
    customer: state.customerName.trim(), whatsapp: state.whatsapp.trim(),
    pickupTime: state.orderMode === "takeaway" ? state.pickupTime : "",
    payment: state.payment, note: state.orderNote.trim(),
    items, subtotal: getSubtotal(), discount: getPromoDiscount() + getVoucherDiscount(), fee: getServiceFee(),
    total: getTotal(), estimate: "10–15 menit", status: 0, createdAt: Date.now()
  };

  // kurangi stok di data tersimpan (sumber kebenaran bersama admin)
  const stored = LS.get("warjo_menu", []);
  items.forEach((i) => {
    const m = stored.find((x) => x.id === i.id);
    if (m) m.stock = Math.max(0, m.stock - i.qty);
  });
  orders.push(order);
  const history = [order, ...(LS.get("warjo_history", []) || [])].slice(0, 20);
  if (!LS.set("warjo_orders", orders) || !LS.set("warjo_menu", stored) || !LS.set("warjo_history", history)) {
    showToast("Gagal menyimpan pesanan. Pastikan penyimpanan browser tidak penuh/private.");
    return false;
  }

  refreshMenu();
  state.currentOrderNumber = orderNumber;
  state.justOrdered = true;
  state.cart = [];
  state.voucher = "";
  state.orderNote = "";
  persist();
  return true;
}

/* =====================================================================
   Modal detail menu
   ===================================================================== */
function openItemModal(itemId) {
  const item = getItemById(itemId);
  if (!item || item.stock <= 0) return;
  state.modal = { id: itemId, qty: 1 };
  const showSpicy = SPICY_CATEGORIES.includes(item.category);
  const extras = extrasOf(item);

  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" data-dismiss="true">
      <div class="detail-modal-content">
        <div class="modal-header">
          <span></span>
          <button class="close-btn" data-close-modal="true" aria-label="Tutup">✕</button>
        </div>
        <div class="modal-content">
          <div class="modal-media"><img src="${esc(item.image)}" alt="${esc(item.name)}" ${IMG_FALLBACK} /></div>

          <div class="modal-title-row">
            <h3>${esc(item.name)}</h3>
            <span class="meta-badge">${esc(item.badge || item.category)}</span>
          </div>

          <div class="detail-copy">${esc(item.description)}</div>
          <div class="meta-row"><span>Harga</span><strong>${formatCurrency(item.price)}</strong></div>

          ${showSpicy ? `
          <div class="option-group">
            <h4>Level Pedas</h4>
            <div class="option-list">
              ${["Tidak Pedas", "Sedang", "Pedas", "Sangat Pedas"].map((level, i) => `
                <label class="option-item">
                  <span>${level}</span>
                  <input type="radio" name="spicy-level" value="${level}" ${i === 0 ? "checked" : ""} />
                </label>`).join("")}
            </div>
          </div>` : ""}

          ${extras.length ? `
          <div class="option-group">
            <h4>Extra</h4>
            <div class="option-list">
              ${extras.map((extra) => `
                <label class="option-item">
                  <span>${esc(extra.label)} +${formatCurrency(extra.price)}</span>
                  <input type="checkbox" data-extra="${esc(extra.label)}" />
                </label>`).join("")}
            </div>
          </div>` : ""}

          <div class="option-group">
            <h4>Catatan</h4>
            <textarea id="modal-note" placeholder="Contoh: jangan pakai bawang"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <div class="qty-controls">
            <button class="qty-btn" data-modal-qty="decrease" aria-label="Kurangi">−</button>
            <span class="qty-value" id="modal-qty-value">1</span>
            <button class="qty-btn" data-modal-qty="increase" aria-label="Tambah">+</button>
          </div>
          <div class="modal-total"><strong id="modal-total">${formatCurrency(item.price)}</strong></div>
          <button class="primary-btn" data-add-modal="true">Tambah ke Keranjang</button>
        </div>
      </div>
    </div>`;
}

function selectedModalExtras() {
  return Array.from(document.querySelectorAll("#modal-root [data-extra]:checked")).map((i) => i.dataset.extra);
}
function updateModalTotal() {
  if (!state.modal) return;
  const item = getItemById(state.modal.id);
  const extrasSum = selectedModalExtras().reduce((s, l) => s + (extrasOf(item).find((x) => x.label === l)?.price || 0), 0);
  document.getElementById("modal-qty-value").textContent = state.modal.qty;
  document.getElementById("modal-total").textContent = formatCurrency((item.price + extrasSum) * state.modal.qty);
}

function closeModal() {
  state.modal = null;
  modalRoot.innerHTML = "";
}

/* =====================================================================
   Modal pilih mode pemesanan (muncul saat pertama buka)
   ===================================================================== */
function openOrderModeModal() { renderOrderModeModal(); }

function renderOrderModeModal(selectedMode = "") {
  const isDineIn = selectedMode === "dinein";
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="detail-modal-content order-mode-modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 style="margin: 0;">Pilih Mode Pemesanan</h3>
          <button class="close-btn" data-close-mode="true" aria-label="Tutup">✕</button>
        </div>
        <div class="modal-content">
          <p style="margin: 0; color: var(--muted);">Bagaimana Anda ingin memesan hari ini?</p>
          <div class="mode-grid">
            <button class="mode-btn ${isDineIn ? "active" : ""}" data-mode-choice="dinein">
              <span>🍽️</span><strong>Makan di Tempat</strong><small>Makan di tempat</small>
            </button>
            <button class="mode-btn ${selectedMode === "takeaway" ? "active" : ""}" data-mode-choice="takeaway">
              <span>🥡</span><strong>Bawa Pulang</strong><small>Ambil sendiri</small>
            </button>
          </div>
          ${isDineIn ? `
            <div class="field-group mode-details">
              <img class="modal-brand-logo" src="img/Warjo_Logo.png" alt="Logo WARJO" />
              <label for="modal-table-number">Nomor Meja</label>
              <input id="modal-table-number" type="number" min="1" max="${TABLE_COUNT}" inputmode="numeric" value="${esc(state.tableNumber)}" placeholder="Masukkan nomor meja (1-${TABLE_COUNT})" />
              <small class="field-help">Masukkan nomor meja agar pesanan diantar dengan tepat.</small>
              <button class="primary-btn" data-confirm-dinein>Mulai Memesan</button>
            </div>
          ` : selectedMode === "takeaway" ? `
            <div class="field-group mode-details">
              <p class="field-help">Pesanan akan disiapkan untuk diambil di kasir.</p>
              <button class="primary-btn" data-confirm-takeaway>Mulai Memesan</button>
            </div>
          ` : ""}
        </div>
      </div>
    </div>`;
}

function dismissModeModal() {
  state.modeSelectionSeen = true;
  closeModal();
  render();
}

/* =====================================================================
   Render utama
   ===================================================================== */
function render() {
  renderHeaderSearch();
  switch (state.currentView) {
    case "menu": renderMenu(); break;
    case "promo": renderPromo(); break;
    case "orders": renderOrders(); break;
    case "account": renderAccount(); break;
    case "favorite": renderFavorite(); break;
    case "history": renderHistory(); break;
    case "cart": renderCart(); break;
    case "checkout": renderCheckout(); break;
    case "payment": renderPayment(); break;
    case "success": renderSuccess(); break;
    case "tracking": renderTracking(); break;
    default: renderHome();
  }
  updateCartBadges();
  persist();
}

const floatingCart = document.createElement("div");
floatingCart.className = "floating-cart hidden";
document.body.appendChild(floatingCart);

function updateCartBadges() {
  const count = getCartCount();
  document.querySelectorAll(".cart-count-badge").forEach((badge) => (badge.textContent = count));
  const show = count > 0 && !HIDE_FLOATING_CART_ON.includes(state.currentView);
  floatingCart.classList.toggle("hidden", !show);
  if (show) {
    floatingCart.innerHTML = `
      <div class="floating-cart-info">
        <span>🛒</span>
        <div><strong>${count} item</strong><small>${formatCurrency(getTotal())}</small></div>
      </div>
      <button class="primary-btn" data-view="cart">Lihat Keranjang →</button>`;
  }
}

/* =====================================================================
   Event (delegasi — satu listener untuk semua, tidak menumpuk saat render ulang)
   ===================================================================== */
function onSearch(value) {
  state.searchTerm = value;
  if (state.currentView !== "menu") { navigate("menu"); return; }
  const menuInput = document.getElementById("search-input-menu");
  if (menuInput && document.activeElement !== menuInput) menuInput.value = value;
  if (document.activeElement !== headerSearch) headerSearch.value = value;
  const grid = mainView.querySelector(".grid-menu");
  if (grid) grid.innerHTML = gridHTML(getFilteredMenu());
}

document.addEventListener("click", (e) => {
  const t = e.target;
  const hit = (sel) => t.closest(sel);
  let el;

  if ((el = hit("[data-favorite]"))) return toggleFavorite(el.dataset.favorite);

  // modal detail
  if ((el = hit("[data-close-modal]"))) return closeModal();
  if (t.classList && t.classList.contains("modal-backdrop") && t.dataset.dismiss) return closeModal();
  if ((el = hit("[data-modal-qty]")) && state.modal) {
    const item = getItemById(state.modal.id);
    const room = item.stock - itemQtyInCart(item.id);
    if (el.dataset.modalQty === "increase") {
      if (state.modal.qty >= room) return showToast(`Stok ${item.name} tinggal ${item.stock}`);
      state.modal.qty += 1;
    } else state.modal.qty = Math.max(1, state.modal.qty - 1);
    return updateModalTotal();
  }
  if (hit("[data-add-modal]") && state.modal) {
    const spicy = document.querySelector('#modal-root input[name="spicy-level"]:checked')?.value || "Tidak Pedas";
    const note = (document.getElementById("modal-note")?.value || "").trim();
    if (addToCart(state.modal.id, state.modal.qty, selectedModalExtras(), spicy, note)) closeModal();
    return;
  }

  // modal mode pemesanan
  if ((el = hit("[data-mode-choice]"))) return renderOrderModeModal(el.dataset.modeChoice);
  if (hit("[data-confirm-dinein]")) {
    const n = document.getElementById("modal-table-number").value;
    if (!n || !Number.isInteger(Number(n)) || Number(n) < 1 || Number(n) > TABLE_COUNT) return showToast(`Masukkan nomor meja 1-${TABLE_COUNT}.`);
    state.orderMode = "dinein";
    state.tableNumber = String(Number(n));
    return dismissModeModal();
  }
  if (hit("[data-confirm-takeaway]")) { state.orderMode = "takeaway"; return dismissModeModal(); }
  if (hit("[data-close-mode]")) return dismissModeModal();

  // navigasi & filter
  if ((el = hit("[data-view]"))) return navigate(el.dataset.view);
  if ((el = hit("[data-category]"))) { state.activeCategory = el.dataset.category; return render(); }
  if ((el = hit("[data-soon]"))) return showToast(`${el.dataset.soon} segera hadir`);

  // tambah / kurang
  if ((el = hit("[data-add]"))) return openItemModal(el.dataset.add);
  if ((el = hit(".menu-image-wrap[data-item-id]"))) return openItemModal(el.dataset.itemId);
  if ((el = hit("[data-quick-add]"))) return void addToCart(el.dataset.quickAdd, 1);
  if ((el = hit("[data-qty]"))) {
    const delta = el.dataset.qty === "increase" ? 1 : -1;
    return el.dataset.key ? changeEntryQty(el.dataset.key, delta) : changeItemQty(el.dataset.itemId, delta);
  }

  // checkout
  if ((el = hit("[data-order-mode]"))) { state.orderMode = el.dataset.orderMode; return render(); }
  if (hit("[data-voucher-apply]")) {
    const code = document.getElementById("voucher-input").value.trim().toUpperCase();
    if (!VOUCHERS[code]) return showToast("Kode voucher tidak valid.");
    state.voucher = code;
    showToast(`Voucher ${code} dipakai`);
    return render();
  }
  if (hit("[data-voucher-remove]")) { state.voucher = ""; return render(); }
  if ((el = hit("[data-payment]"))) {
    if (el.dataset.payment === "start") { if (validateOrder()) navigate("payment"); return; }
    if (el.dataset.payment === "success") { if (validateOrder() && submitOrder()) navigate("success"); return; }
  }
  if ((el = hit("[data-reorder]"))) return reorder(el.dataset.reorder);
});

document.addEventListener("input", (e) => {
  const t = e.target;
  switch (t.id) {
    case "header-search":
    case "search-input-menu": return onSearch(t.value);
    case "customer-name-input":
    case "profile-name-input": state.customerName = t.value; break;
    case "customer-whatsapp-input":
    case "profile-wa-input": state.whatsapp = t.value; break;
    case "pickup-time-input": state.pickupTime = t.value; break;
    case "order-note-input": state.orderNote = t.value; return;
    default: return;
  }
  persist();
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "table-number-input") { state.tableNumber = t.value; persist(); renderHeaderSearch(); }
  else if (t.name === "payment-method") { state.payment = t.value; persist(); }
  else if (t.matches && (t.matches("[data-extra]") || t.matches('input[name="spicy-level"]'))) updateModalTotal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalRoot.querySelector(".modal-backdrop[data-dismiss]")) closeModal();
});

// Admin mengubah menu / status pesanan di tab lain → katalog ikut update
window.addEventListener("storage", (e) => {
  if (e.key === "warjo_menu") {
    refreshMenu();
    pruneCart();
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (!modalRoot.innerHTML && !typing) render();
    else if (state.currentView === "menu") {
      const grid = mainView.querySelector(".grid-menu");
      if (grid) grid.innerHTML = gridHTML(getFilteredMenu());
    }
  }
});

/* ===== start ===== */
pruneCart();
applyView(viewFromHash());
