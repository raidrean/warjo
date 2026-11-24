const PIN = "warjo123"; // hanya dipakai MODE DEMO (tanpa Firebase)
const CLOUD = !!window.WARJO_CLOUD;
const K = { menu: "warjo_menu", orders: "warjo_orders", auth: "warjo_admin" };
const STATUS = ["Pesanan diterima", "Sedang diproses", "Sedang dibuat", "Siap diambil", "Selesai"];
const stLabel = (o, s) => (o.mode === "dinein" && s === 3 ? "Siap diantar" : STATUS[s]);
const NEXT = ["Proses", "Mulai buat", "Tandai siap", "Selesaikan"];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = (v) => "Rp" + new Intl.NumberFormat("id-ID").format(v || 0) + ",-";
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { toast("Penyimpanan penuh. Gunakan gambar yang lebih kecil."); return false; }
};
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = "none"), 2200); };

let tab = "orders", orderFilter = "aktif", q = "", cat = "Semua", knownOrders = new Set();

// ---------- login ----------
function gate() {
  const ok = CLOUD ? !!firebase.auth().currentUser : sessionStorage.getItem(K.auth) === "1";
  $("#login").classList.toggle("hidden", ok);
  $("#app").classList.toggle("hidden", !ok);
  if (ok) render();
}
$("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (CLOUD) firebase.auth().signInWithEmailAndPassword($("#email").value.trim(), $("#pin").value).catch(() => ($("#login-err").textContent = "Email atau password salah."));
  else if ($("#pin").value === PIN) { sessionStorage.setItem(K.auth, "1"); gate(); }
  else $("#login-err").textContent = "PIN salah. Coba lagi.";
});
$("#logout").onclick = () => { if (CLOUD) firebase.auth().signOut(); else { sessionStorage.removeItem(K.auth); gate(); } };
document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
  render();
}));

// ---------- orders ----------
function renderOrders() {
  const all = load(K.orders).sort((a, b) => b.createdAt - a.createdAt);
  const today = new Date().toDateString();
  const todays = all.filter((o) => new Date(o.createdAt).toDateString() === today);
  const active = all.filter((o) => o.status < 4);
  const rows = all.filter((o) => (orderFilter === "aktif" ? o.status < 4 : orderFilter === "selesai" ? o.status === 4 : true));
  const fresh = all.filter((o) => !knownOrders.has(o.orderNumber));
  $("#view").innerHTML = `
    <h2>Pesanan</h2><p class="sub">Diperbarui otomatis saat pelanggan memesan.</p>
    <div class="stats">
      <div class="stat"><b>${todays.length}</b><span>Pesanan hari ini</span></div>
      <div class="stat"><b>${rp(todays.reduce((s, o) => s + o.total, 0))}</b><span>Pendapatan hari ini</span></div>
      <div class="stat"><b>${active.length}</b><span>Belum selesai</span></div>
    </div>
    <div class="toolbar"><div class="chips">
      ${["aktif", "selesai", "semua"].map((f) => `<button class="chip ${f === orderFilter ? "on" : ""}" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
    </div></div>
    ${rows.length ? `<div class="orders">${rows.map((o) => orderCard(o, fresh.includes(o) && knownOrders.size)).join("")}</div>`
      : `<div class="empty">Belum ada pesanan ${orderFilter === "aktif" ? "yang aktif" : ""}. Pesanan dari katalog akan muncul di sini.</div>`}`;
  all.forEach((o) => knownOrders.add(o.orderNumber));
  $("#badge-orders").textContent = active.length || "";
  document.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { orderFilter = b.dataset.f; render(); }));
  document.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => setStatus(b.dataset.back, -1)));
  document.querySelectorAll("[data-adv]").forEach((b) => (b.onclick = () => setStatus(b.dataset.adv, 1)));
  document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
    if (confirm("Hapus pesanan " + b.dataset.del + "?")) { save(K.orders, load(K.orders).filter((o) => o.orderNumber !== b.dataset.del)); render(); }
  }));
}
function orderCard(o, isNew) {
  const where = o.mode === "dinein" ? `Makan di tempat · Meja ${esc(o.tableNumber) || "-"}` : `Bawa pulang · ambil ${esc(o.pickupTime)}`;
  return `<article class="order ${isNew ? "new" : ""}">
    <header><h3>#${esc(o.orderNumber)}</h3><span class="st s${o.status}">${esc(stLabel(o, o.status))}</span></header>
    <div class="where">${where}<br>${[o.customer, o.whatsapp].filter(Boolean).map(esc).join(" · ") || "Tanpa nama"} · ${new Date(o.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}${o.payment ? `<br>Bayar: ${esc(o.payment)}` : ""}</div>
    ${o.note ? `<div class="where"><strong>Catatan:</strong> ${esc(o.note)}</div>` : ""}
    <ul>${o.items.map((i) => `<li><span>${i.qty}× ${esc(i.name)}<small>${[i.spicy !== "Tidak Pedas" ? i.spicy : "", ...(i.extras || []), i.note].filter(Boolean).map(esc).join(", ")}</small></span><span>${rp(i.price * i.qty)}</span></li>`).join("")}</ul>
    <footer><strong>${rp(o.total)}</strong><span>
      <button class="btn sm danger" data-del="${esc(o.orderNumber)}">Hapus</button>
      ${o.status > 0 ? `<button class="btn sm" data-back="${esc(o.orderNumber)}">Mundur</button>` : ""}
      ${o.status < 4 ? `<button class="btn sm primary" data-adv="${esc(o.orderNumber)}">${NEXT[o.status]}</button>` : ""}
    </span></footer></article>`;
}
function setStatus(num, d) {
  const list = load(K.orders), o = list.find((x) => x.orderNumber === num);
  if (!o) return;
  o.status = Math.max(0, Math.min(4, o.status + d));
  save(K.orders, list); toast(`#${num}: ${stLabel(o, o.status)}`); render();
}

// ---------- menu ----------
function renderMenu() {
  const menu = load(K.menu);
  if (!menu.length) {
    $("#view").innerHTML = `<h2>Menu</h2><div class="empty">Data menu belum dimuat. <a href="index.html" target="_blank">Buka katalog</a> sekali untuk mengisi menu awal, lalu kembali ke sini.</div>`;
    return;
  }
  const cats = ["Semua", ...new Set(menu.map((m) => m.category))];
  const rows = menu.filter((m) => (cat === "Semua" || m.category === cat) && m.name.toLowerCase().includes(q.toLowerCase()));
  $("#view").innerHTML = `
    <h2>Menu</h2><p class="sub">${menu.length} menu · ${menu.filter((m) => m.stock <= 0).length} habis · perubahan langsung tampil di katalog.</p>
    <div class="toolbar">
      <input id="q" type="search" placeholder="Cari menu..." value="${esc(q)}" />
      <div class="chips">${cats.map((c) => `<button class="chip ${c === cat ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <button class="btn primary" id="add">Tambah menu</button>
    </div>
    ${rows.map((m) => `<div class="mrow ${m.active === false ? "off" : ""}">
      <img src="${esc(m.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='img/Warjo_Logo.png'" />
      <div><strong>${esc(m.name)}</strong><small>${esc(m.category)}${m.badge ? " · " + esc(m.badge) : ""}</small></div>
      <div>${rp(m.price)}</div>
      <label class="sw">Stok <input class="stock ${m.stock <= 5 ? "low" : ""}" type="number" min="0" value="${m.stock}" data-stock="${esc(m.id)}" aria-label="Stok ${esc(m.name)}" /></label>
      <label class="sw"><input type="checkbox" data-active="${esc(m.id)}" ${m.active !== false ? "checked" : ""} /> Tampil</label>
      <span><button class="btn sm" data-edit="${esc(m.id)}">Ubah</button> <button class="btn sm danger" data-rm="${esc(m.id)}">Hapus</button></span>
    </div>`).join("") || `<div class="empty">Tidak ada menu yang cocok.</div>`}`;
  $("#q").oninput = (e) => { q = e.target.value; const p = e.target.selectionStart; renderMenu(); const i = $("#q"); i.focus(); i.setSelectionRange(p, p); };
  document.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => { cat = b.dataset.c; render(); }));
  $("#add").onclick = () => openForm();
  document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openForm(b.dataset.edit)));
  document.querySelectorAll("[data-stock]").forEach((i) => (i.onchange = () => patch(i.dataset.stock, { stock: Math.max(0, +i.value || 0) })));
  document.querySelectorAll("[data-active]").forEach((i) => (i.onchange = () => patch(i.dataset.active, { active: i.checked })));
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const m = menu.find((x) => x.id === b.dataset.rm);
    if (confirm(`Hapus "${m.name}" dari menu?`)) { save(K.menu, menu.filter((x) => x.id !== m.id)); render(); }
  }));
}
function patch(id, change) {
  const menu = load(K.menu), m = menu.find((x) => x.id === id);
  if (!m) return;
  Object.assign(m, change); if (save(K.menu, menu)) toast("Tersimpan"); render();
}
function openForm(id) {
  const m = load(K.menu).find((x) => x.id === id) || { name: "", category: "Makanan", price: 0, stock: 10, image: "", badge: "", promo: false, active: true, description: "", extras: [] };
  const cats = [...new Set(load(K.menu).map((x) => x.category))];
  $("#modal").innerHTML = `<form class="dlg" id="mf"><h3>${id ? "Ubah menu" : "Tambah menu"}</h3><div class="f">
    <label class="wide">Nama<input name="name" value="${esc(m.name)}" required /></label>
    <label>Kategori<input name="category" list="cats" value="${esc(m.category)}" required /><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
    <label>Label<select name="badge"><option value="">Tanpa label</option><option ${m.badge === "Terlaris" ? "selected" : ""}>Terlaris</option><option ${m.badge === "Baru" ? "selected" : ""}>Baru</option></select></label>
    <label>Harga (Rp)<input name="price" type="number" min="0" step="500" value="${m.price}" required /></label>
    <label>Stok<input name="stock" type="number" min="0" value="${m.stock}" required /></label>
    <label class="wide">Foto (alamat gambar atau unggah)<input name="image" value="${m.image.startsWith("data:") ? "" : esc(m.image)}" placeholder="img/nama-file.jpg atau https://..." />
      <input id="file" type="file" accept="image/*" /></label>
    <label class="wide">Deskripsi<textarea name="description" rows="2">${esc(m.description)}</textarea></label>
    <label class="wide">Tambahan (satu per baris: nama | harga)<textarea name="extras" rows="3">${(m.extras || []).map((e) => `${e.label} | ${e.price}`).join("\n")}</textarea></label>
    <label class="chk"><input type="checkbox" name="promo" ${m.promo ? "checked" : ""} /> Masuk promo</label>
    <label class="chk"><input type="checkbox" name="active" ${m.active !== false ? "checked" : ""} /> Tampil di katalog</label>
  </div><footer><button type="button" class="btn" id="cancel">Batal</button><button class="btn primary">Simpan menu</button></footer></form>`;
  $("#modal").classList.add("open");
  let uploaded = m.image.startsWith("data:") ? m.image : "";
  $("#cancel").onclick = () => $("#modal").classList.remove("open");
  $("#file").onchange = (e) => shrink(e.target.files[0], (d) => { uploaded = d; toast("Foto siap disimpan"); });
  $("#mf").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target), menu = load(K.menu);
    const data = {
      name: f.get("name").trim(), category: f.get("category").trim(), badge: f.get("badge"), price: Math.max(0, +f.get("price") || 0), stock: Math.max(0, Math.floor(+f.get("stock") || 0)),
      image: uploaded || f.get("image").trim() || "img/Warjo_Logo.png", description: f.get("description").trim(),
      promo: f.has("promo"), active: f.has("active"),
      extras: f.get("extras").split("\n").map((l) => l.split("|")).filter((p) => p[0].trim()).map((p) => ({ label: p[0].trim(), price: +p[1] || 0 })),
    };
    if (id) Object.assign(menu.find((x) => x.id === id), data);
    else {
      let base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "menu", nid = base, n = 2;
      while (menu.some((x) => x.id === nid)) nid = base + "-" + n++;
      menu.push({ id: nid, tags: [data.category.toLowerCase()], ...data });
    }
    if (save(K.menu, menu)) { $("#modal").classList.remove("open"); toast("Menu tersimpan"); render(); }
  };
}
function shrink(file, done) {
  if (!file) return;
  const img = new Image(), r = new FileReader();
  r.onload = () => (img.src = r.result);
  img.onload = () => {
    const s = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = img.width * s; c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    done(c.toDataURL("image/jpeg", 0.8));
  };
  r.readAsDataURL(file);
}

function render() { tab === "orders" ? renderOrders() : renderMenu(); if (tab !== "orders") $("#badge-orders").textContent = load(K.orders).filter((o) => o.status < 4).length || ""; }
window.addEventListener("storage", (e) => { if ((e.key === K.orders || e.key === K.menu) && !$("#modal").classList.contains("open") && document.activeElement.tagName !== "INPUT") render(); });
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") e.target.classList.remove("open"); });
gate();
if (CLOUD) { $("#email").classList.remove("hidden"); $("#pin").placeholder = "Password"; $("#email").required = true; firebase.auth().onAuthStateChanged(gate); }
