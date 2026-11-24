/* Warjo cloud sync (opsional). Tanpa FIREBASE_CONFIG -> mode demo (localStorage saja). */
(() => {
  // gambar rusak -> logo (mis. hotlink yang mati)
  addEventListener("error", (e) => { const t = e.target; if (t && t.tagName === "IMG" && !t.dataset.fb) { t.dataset.fb = 1; t.src = "img/Warjo_Logo.png"; } }, true);
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !window.firebase) return;
  window.WARJO_CLOUD = true;
  firebase.initializeApp(cfg);
  const db = firebase.firestore();
  const ADMIN = /admin(\.html)?$/.test(location.pathname);
  const auth = ADMIN ? firebase.auth() : null;
  const KEYS = { warjo_menu: "menu", warjo_orders: "orders" };
  const rawSet = Storage.prototype.setItem;
  let silent = false;
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const put = (k, v, emit = true) => {
    silent = true; try { rawSet.call(localStorage, k, JSON.stringify(v)); } catch (e) { console.warn(e); } silent = false;
    if (emit) dispatchEvent(new StorageEvent("storage", { key: k }));
  };
  const rid = (k, x) => String(k === "warjo_menu" ? x.id : x._id || x.orderNumber);
  const mapOf = (k, l) => new Map(l.map((x) => [rid(k, x), JSON.stringify(x)]));
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
  const snaps = { warjo_menu: mapOf("warjo_menu", read("warjo_menu")), warjo_orders: mapOf("warjo_orders", read("warjo_orders")) };

  async function push(k) {
    const list = read(k), prev = snaps[k], c = db.collection(KEYS[k]);
    if (!ADMIN && k === "warjo_orders") {            // pelanggan: kirim pesanan baru saja
      let changed = false;
      for (const o of list) if (!o._id && !prev.has(rid(k, o))) { o._id = `${o.orderNumber}-${token()}`; changed = true; await c.doc(o._id).set(o); }
      if (changed) put(k, list, false);
      snaps[k] = mapOf(k, list); watch(); return;
    }
    if (!ADMIN) {                                    // pelanggan: menu -> hanya kurangi stok
      for (const m of list) { const p = prev.get(rid(k, m)); if (p && JSON.parse(p).stock > m.stock) await c.doc(rid(k, m)).update({ stock: m.stock }); }
      snaps[k] = mapOf(k, list); return;
    }
    const b = db.batch(); let n = 0;                 // admin: sinkron penuh (tambah/ubah/hapus)
    list.forEach((x, i) => { if (prev.get(rid(k, x)) !== JSON.stringify(x)) { b.set(c.doc(rid(k, x)), k === "warjo_menu" ? { ...x, _o: i } : x); n++; } });
    const now = new Set(list.map((x) => rid(k, x)));
    prev.forEach((_, id) => { if (!now.has(id)) { b.delete(c.doc(id)); n++; } });
    snaps[k] = mapOf(k, list);
    if (n) await b.commit();
  }
  Storage.prototype.setItem = function (k, v) {
    rawSet.call(this, k, v);
    if (!silent && this === localStorage && KEYS[k]) push(k).catch((e) => console.error("sync", e));
  };

  function startMenu() {
    db.collection("menu").onSnapshot((qs) => {
      if (qs.empty) {                                // database masih kosong -> admin mengisi menu bawaan
        if (ADMIN && auth.currentUser && typeof menuData !== "undefined") {
          const b = db.batch(); menuData.forEach((m, i) => b.set(db.collection("menu").doc(String(m.id)), { ...m, _o: i })); b.commit().catch(console.error);
        }
        return;
      }
      const list = qs.docs.map((d) => d.data()).sort((a, b) => (a._o ?? 0) - (b._o ?? 0)).map(({ _o, ...m }) => m);
      snaps.warjo_menu = mapOf("warjo_menu", list); put("warjo_menu", list);
    }, (e) => console.warn("menu", e));
  }
  const watched = new Set();
  function watch() {                                 // pelanggan: pantau status pesanannya sendiri
    read("warjo_orders").forEach((o) => {
      if (!o._id || o.status >= 4 || watched.has(o._id)) return;
      watched.add(o._id);
      db.collection("orders").doc(o._id).onSnapshot((d) => {
        if (!d.exists) return;
        const list = read("warjo_orders"), i = list.findIndex((x) => x._id === o._id);
        if (i < 0 || list[i].status === d.data().status) return;
        list[i] = { ...list[i], status: d.data().status };
        snaps.warjo_orders = mapOf("warjo_orders", list); put("warjo_orders", list);
      }, () => {});
    });
  }
  if (ADMIN) {
    let on = false;
    auth.onAuthStateChanged((u) => {
      if (!u || on) return; on = true; startMenu();
      db.collection("orders").onSnapshot((qs) => {
        const list = qs.docs.map((d) => ({ ...d.data(), _id: d.id }));
        snaps.warjo_orders = mapOf("warjo_orders", list); put("warjo_orders", list);
      }, (e) => console.warn("orders", e));
    });
  } else {
    addEventListener("load", () => { startMenu(); watch(); });
    addEventListener("storage", (e) => {
      if (e.key === "warjo_orders" && typeof render === "function" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) render();
    });
  }
})();
