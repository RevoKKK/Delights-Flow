// core.js

// 1. Constants
export const UI_ICONS = {
  Overview: '📊', Shop: '🏪', Analytics: '📈', History: '📜', Wallet: '💼',
  Expense: '📉', Income: '📈', Transfer: '🔄', Sale: '🛒', Capital: '⚙️', Cost: '🔥',
  P1: '🧑', P2: '👩', Shared: '🤝', Search: '🔍', Filter: '⏳', Settings: '⚙️', Add: '➕', More: '⋮', Close: '❌'
};
export const W_ICONS = ['💼', '🏦', '💳', '💰', '📱', '💵', '🏠', '🚗', 'Piggy', 'Safe'];
export const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#78716c'];
export const COLOR_MAP = { red: COLORS[0], orange: COLORS[1], amber: COLORS[2], green: COLORS[4], blue: COLORS[9], indigo: COLORS[10], purple: COLORS[11], pink: COLORS[14], slate: COLORS[16] };
export const STARTER_WALLETS = [
  { id: 'w1', name: 'Cash', icon: '💵', color: COLORS[4], opening: 0, order: 0 },
  { id: 'w2', name: 'Bank', icon: '🏦', color: COLORS[9], opening: 0, order: 1 }
];
export const DEFAULT_SHOPS = [{ id: 's1', name: 'Shop 1', logoUrl: null, active: true }];
export const EXP_CATS = [
  { id: 'e1', name: 'Food', icon: '🍔' }, { id: 'e2', name: 'Transport', icon: '🚗' }, { id: 'e3', name: 'Utilities', icon: '⚡' },
  { id: 'e4', name: 'Shopping', icon: '🛍️' }, { id: 'e5', name: 'Health', icon: '⚕️' }, { id: 'e6', name: 'Entertainment', icon: '🎬' }
];
export const INC_CATS = [{ id: 'i1', name: 'Salary', icon: '💰' }, { id: 'i2', name: 'Business', icon: '📈' }, { id: 'i3', name: 'Gift', icon: '🎁' }];
export const COST_SUBTYPES = { inventory: 'Inventory', marketing: 'Marketing', other: 'Other' };
export const PALETTE = { brand: '#3b82f6', brand_dark: '#2563eb', shop: '#8b5cf6', shop_dark: '#7c3aed', income: '#22c55e', expense: '#ef4444', transfer: '#64748b' };
export const COST_COLORS = { inventory: '#84cc16', marketing: '#d946ef', other: '#f43f5e' };

// 2. Shared State
export const state = {
  mode: 'money', // 'money' | 'shop'
  moneyView: 'overview',
  shopTab: 'home',
  user: null,
  userProfile: null,
  userWorkspaces: [],
  workspaceId: null,
  workspace: null,
  transactions: [],
  balances: {},
  darkMode: localStorage.getItem('df_dark') === '1' || (!('df_dark' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
  privacyMode: false,
  activePerson: localStorage.getItem('df_ap') || 'p1',
  filters: { mSearch: '', mMonth: 'this_month', mWallet: 'all', mType: 'all', mOwner: 'all', mScope: 'all', sSearch: '', sMonth: 'this_month', sShop: 'all', sType: 'all' },
  drafts: { moneyTx: null, shopTx: null },
  charts: { mOverview: null, sHome: null, mHistory: null, sHistory: null }, // Chart instances
  isOnline: navigator.onLine,
  authChecking: true,
  firebaseLoaded: false,
  gisLoaded: false,
  chartjsLoaded: false,
  unsubWs: null,
  unsubTxs: null
};

// 3. Modules (will be hydrated by app.js / UI logic)
let renderMoneyFn = () => {};
let renderShopFn = () => {};

export function setRenderMoney(fn) { renderMoneyFn = fn; }
export function setRenderShop(fn) { renderShopFn = fn; }

// 4. Firebase Lazy Loader
let fb = {};
export async function ensureFirebase() {
  if (state.firebaseLoaded) return fb;
  try {
    const [app, auth, firestore, storage] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js')
    ]);

    const firebaseApp = app.initializeApp(window.__firebase_config);
    fb.auth = auth.getAuth(firebaseApp);
    fb.db = firestore.getFirestore(firebaseApp);
    fb.storage = storage.getStorage(firebaseApp);
    fb.authMod = auth;
    fb.fsMod = firestore;

    try {
      firestore.initializeFirestore(firebaseApp, {
        localCache: firestore.persistentLocalCache({ tabManager: firestore.persistentSingleTabManager({ forceOwnership: true }) }),
        experimentalAutoDetectLongPolling: true
      });
    } catch (e) {
      console.warn("Persistent cache failed, using memory fallback.", e);
    }
    
    state.firebaseLoaded = true;
    return fb;
  } catch (err) {
    console.error("Firebase load failed:", err);
    throw err;
  }
}

// 5. DOM Elements (cached after DOMContentLoaded)
export const D = {
  loading: null, auth: null, workspace: null, shell: null,
  toast: null, confirm: null, exit: null, sideMActions: null, sideSActions: null,
  navMLinks: null, navSLinks: null, mobNMoney: null, mobNShop: null,
  vMOverview: null, vMHistory: null, vMAnalytics: null,
  vSHome: null, vSHistory: null, vSAnalytics: null
};

export const $ = id => document.getElementById(id);
export const esc = str => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// 6. Helpers
export const fmtNum = (num, dec = 2) => Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtMoney = (num, curr = '$', dec = 2) => state.privacyMode ? '****' : `${num < 0 ? '-' : ''}${curr}${fmtNum(Math.abs(num), dec)}`;
export const fmtDisp = num => state.privacyMode ? '****' : fmtNum(num);
export const fmtCompact = (num, curr = '$') => state.privacyMode ? '****' : `${num < 0 ? '-' : ''}${curr}${Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(num))}`;
export const parseAmt = str => Math.abs(parseFloat(String(str).replace(/,/g, '')) || 0);
export const parseSigned = str => parseFloat(String(str).replace(/,/g, '')) || 0;
export const todayISO = () => new Date().toISOString().split('T')[0];
export const curMonth = () => todayISO().substring(0, 7);
export const fmtMonth = iso => { const d = new Date(iso + '-01T00:00:00'); return d.toLocaleString('default', { month: 'short', year: 'numeric' }); };
export const fmtDateHead = iso => {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date(); today.setHours(12,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

export const getWallets = () => state.workspace?.wallets || STARTER_WALLETS;
export const getWallet = id => getWallets().find(w => w.id === id) || { name: 'Unknown', icon: '❓', color: '#999' };
export const getShops = () => state.workspace?.shops || DEFAULT_SHOPS;
export const getShop = id => getShops().find(s => s.id === id) || { name: 'Unknown', logoUrl: null };
export const getCats = () => ({ e: state.workspace?.expCats || EXP_CATS, i: state.workspace?.incCats || INC_CATS });
export const catIcon = (id, type) => {
  if (type === 'transfer') return UI_ICONS.Transfer;
  if (type === 'shop_sale') return UI_ICONS.Sale;
  if (type === 'shop_cost' || type === 'shop_cap') return UI_ICONS.Cost;
  const cats = getCats()[type === 'expense' ? 'e' : 'i'];
  return cats.find(c => c.id === id)?.icon || '❔';
};
export const personName = id => state.workspace?.names?.[id] || (id === 'p1' ? 'Person 1' : id === 'p2' ? 'Person 2' : 'Shared');
export const getOwner = ap => ap === 'shared' ? 'shared' : ap;
export const getShopSplit = sId => state.workspace?.shopSplits?.[sId] || { p1: 50, p2: 50 };

let renderQueued = false;
export function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    if (state.mode === 'money') renderMoneyFn(); else renderShopFn();
    renderQueued = false;
  });
}

// 7. Balance Math
export function computeBalances() {
  const b = { wallets: {}, p1: { i: 0, e: 0, net: 0 }, p2: { i: 0, e: 0, net: 0 }, shared: { i: 0, e: 0, net: 0 },
              shop: { rev: 0, cap: 0, cost: 0, pendCod: 0, net: 0, sIds: {} } };
  
  getWallets().forEach(w => b.wallets[w.id] = w.opening || 0);
  getShops().forEach(s => b.shop.sIds[s.id] = { rev: 0, cap: 0, cost: 0, pendCod: 0, net: 0 });

  state.transactions.forEach(tx => {
    // Money Tx
    if (tx.type === 'income' || tx.type === 'expense') {
      const amt = tx.amt;
      const own = tx.owner || 'shared';
      if (tx.type === 'income') {
        b.wallets[tx.wId] += amt; b[own].i += amt; b[own].net += amt;
      } else {
        b.wallets[tx.wId] -= amt; b[own].e += amt; b[own].net -= amt;
      }
    } else if (tx.type === 'transfer') {
      b.wallets[tx.wId] -= tx.amt; b.wallets[tx.wTo] += tx.amt;
    } 
    // Shop Tx
    else if (tx.type === 'shop_sale') {
      const sp = getShopSplit(tx.sId);
      b.shop.rev += tx.total; b.shop.net += tx.total;
      if (b.shop.sIds[tx.sId]) { b.shop.sIds[tx.sId].rev += tx.total; b.shop.sIds[tx.sId].net += tx.total; }
      
      if (tx.paidNow > 0 && tx.wId) b.wallets[tx.wId] += tx.paidNow;
      
      if (tx.codAmt > 0) {
        if (tx.codStatus === 'paid' && tx.codWId) {
          b.wallets[tx.codWId] += tx.codAmt;
        } else if (tx.codStatus === 'pending') {
          b.shop.pendCod += tx.codAmt;
          if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].pendCod += tx.codAmt;
        }
      }
      
      // Personal attribution (revenue)
      const p1S = tx.total * (sp.p1 / 100); const p2S = tx.total * (sp.p2 / 100);
      b.p1.i += p1S; b.p1.net += p1S; b.p2.i += p2S; b.p2.net += p2S;

    } else if (tx.type === 'shop_cap' || tx.type === 'shop_cost') {
      const amt = tx.total;
      const sp = getShopSplit(tx.sId);
      const isCap = tx.type === 'shop_cap';
      
      b.shop.net -= amt;
      if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].net -= amt;
      
      if (isCap) {
        b.shop.cap += amt; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].cap += amt;
      } else {
        b.shop.cost += amt; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].cost += amt;
      }

      if (tx.wId) b.wallets[tx.wId] -= amt;

      // Personal attribution (expense)
      const p1E = amt * (sp.p1 / 100); const p2E = amt * (sp.p2 / 100);
      b.p1.e += p1E; b.p1.net -= p1E; b.p2.e += p2E; b.p2.net -= p2E;
    }
  });

  state.balances = b;
}

// 8. Snapshot & Toast
let snapTimer;
export function saveSnap() {
  if (!state.workspaceId) return;
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    try {
      const snap = { ws: state.workspace, txs: state.transactions.slice(0, 200) }; // Cache recent 200 txs
      localStorage.setItem(`df_snap_${state.workspaceId}`, JSON.stringify(snap));
      localStorage.setItem('df_last_uid', state.user?.uid || '');
      localStorage.setItem('df_active_ws', state.workspaceId);
    } catch(e) {}
  }, 800);
}

export function toast(msg, type = 'info') {
  if (!D.toast) D.toast = $('toast-container');
  const t = document.createElement('div');
  t.className = `px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg transform transition-all duration-300 translate-y-4 opacity-0 ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800 dark:bg-gray-200 dark:text-gray-900'}`;
  t.innerText = msg;
  D.toast.appendChild(t);
  requestAnimationFrame(() => { t.classList.remove('translate-y-4', 'opacity-0'); });
  setTimeout(() => {
    t.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

export function copyText(txt, tMsg = 'Copied!') {
  if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(() => toast(tMsg, 'success')).catch(() => toast('Copy failed', 'error')); }
  else { const i = document.createElement('input'); i.value = txt; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); toast(tMsg, 'success'); }
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function openConfirm(title, msg, onConfirm, okText = 'Delete', okClass = 'bg-red-500') {
  if (!D.confirm) return;
  $('confirm-title').innerText = title;
  $('confirm-msg').innerText = msg;
  const okBtn = $('confirm-ok');
  okBtn.className = `flex-1 py-2 text-white font-medium rounded-lg ${okClass}`;
  okBtn.innerText = okText;
  
  const okHandler = () => { onConfirm(); close(); };
  const close = () => { D.confirm.classList.add('hidden'); okBtn.removeEventListener('click', okHandler); $('confirm-cancel').removeEventListener('click', close); };
  
  okBtn.addEventListener('click', okHandler);
  $('confirm-cancel').addEventListener('click', close);
  D.confirm.classList.remove('hidden');
}

export function applyTheme(dark) {
  state.darkMode = dark;
  localStorage.setItem('df_dark', dark ? '1' : '0');
  if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  scheduleRender();
}

export function applyPrivacy(priv) {
  state.privacyMode = priv;
  scheduleRender();
}

// 9. Firestore CRUD
export async function patchWs(patch) {
  if (!state.workspaceId || !state.workspace) return;
  state.workspace = { ...state.workspace, ...patch };
  computeBalances(); scheduleRender(); saveSnap();
  try {
    const { fsMod, db } = await ensureFirebase();
    await fsMod.updateDoc(fsMod.doc(db, 'delights_flow_workspaces', state.workspaceId), patch);
  } catch (e) { console.error("patchWs", e); toast("Sync error", "error"); }
}

export async function saveTx(payload, editId = null) {
  if (!state.workspaceId) return;
  const { fsMod, db } = await ensureFirebase();
  const txsRef = fsMod.collection(db, 'delights_flow_workspaces', state.workspaceId, 'transactions');
  let docRef;
  const now = Date.now();
  
  if (editId) {
    docRef = fsMod.doc(txsRef, editId);
    payload.updatedAt = now;
  } else {
    docRef = fsMod.doc(txsRef);
    payload.id = docRef.id;
    payload.createdAt = now;
    payload.updatedAt = now;
  }
  
  // Optimistic update
  if (editId) {
    const idx = state.transactions.findIndex(t => t.id === editId);
    if (idx > -1) state.transactions[idx] = { ...state.transactions[idx], ...payload };
  } else {
    state.transactions.unshift(payload);
    state.transactions.sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }
  computeBalances(); scheduleRender(); saveSnap();

  try {
    if (editId) await fsMod.updateDoc(docRef, payload);
    else await fsMod.setDoc(docRef, payload);
  } catch (e) { console.error("saveTx", e); toast("Sync error", "error"); }
}

export async function delTx(id) {
  if (!state.workspaceId) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  computeBalances(); scheduleRender(); saveSnap();
  try {
    const { fsMod, db } = await ensureFirebase();
    await fsMod.deleteDoc(fsMod.doc(db, 'delights_flow_workspaces', state.workspaceId, 'transactions', id));
    toast("Deleted", "success");
  } catch (e) { console.error("delTx", e); toast("Delete error", "error"); }
}

export async function saveUserProfile(extra) {
  if (!state.user) return;
  state.userProfile = { ...state.userProfile, ...extra };
  try {
    const { fsMod, db } = await ensureFirebase();
    await fsMod.setDoc(fsMod.doc(db, 'delights_flow_users', state.user.uid), extra, { merge: true });
  } catch (e) { console.error("saveUserProfile", e); }
}

// 10. Navigation & Mode Switcher
export function switchMode(mode, subTab = null, opts = {}) {
  requestAnimationFrame(() => {
    if (mode === 'money') {
      state.mode = 'money';
      if (subTab) state.moneyView = subTab;
      
      D.sideMActions.classList.remove('hidden'); D.sideSActions.classList.add('hidden');
      D.navMLinks.classList.remove('hidden'); D.navSLinks.classList.add('hidden');
      D.mobNMoney.classList.remove('hidden'); D.mobNShop.classList.add('hidden');
      
      ['overview', 'history', 'analytics'].forEach(v => {
        D[`vM${v.charAt(0).toUpperCase()+v.slice(1)}`].classList.toggle('hidden', state.moneyView !== v);
      });
      D.vSHome.classList.add('hidden'); D.vSHistory.classList.add('hidden'); D.vSAnalytics.classList.add('hidden');
      
      document.body.classList.remove('shop-mode-active');
    } else {
      state.mode = 'shop';
      if (subTab) state.shopTab = subTab;
      
      D.sideMActions.classList.add('hidden'); D.sideSActions.classList.remove('hidden');
      D.navMLinks.classList.add('hidden'); D.navSLinks.classList.remove('hidden');
      D.mobNMoney.classList.add('hidden'); D.mobNShop.classList.remove('hidden');
      
      ['home', 'history', 'analytics'].forEach(v => {
        D[`vS${v.charAt(0).toUpperCase()+v.slice(1)}`].classList.toggle('hidden', state.shopTab !== v);
      });
      D.vMOverview.classList.add('hidden'); D.vMHistory.classList.add('hidden'); D.vMAnalytics.classList.add('hidden');
      
      document.body.classList.add('shop-mode-active');
    }

    if (subTab === 'analytics') scheduleRender();
  });

  if (!opts.noHistory) {
    setTimeout(() => {
      history.pushState({ mode: state.mode, view: state.mode === 'money' ? state.moneyView : state.shopTab }, '');
    }, 10);
  }
}
export function openShopTxDeepLink(txId) {
  switchMode('shop', 'home');
  // Logic to actually open the modal will be in shop.js via an event listener or exported function injected later
  window.dispatchEvent(new CustomEvent('df:open-shop-tx', { detail: { txId } }));
}

function handlePopState(e) {
  // 1. Close Modals first
  const openModals = document.querySelectorAll('[id$="-modal"]:not(.hidden)');
  if (openModals.length > 0) {
    openModals.forEach(m => m.classList.add('hidden'));
    return;
  }
  
  // 2. View routing
  if (state.mode === 'shop') {
    if (state.shopTab !== 'home') switchMode('shop', 'home', { noHistory: true });
    else switchMode('money', 'overview', { noHistory: true });
  } else {
    if (state.moneyView !== 'overview') switchMode('money', 'overview', { noHistory: true });
    else if (D.exit) D.exit.classList.remove('hidden');
  }
}

// 11. Auth & Subs (Stubs for full implementation in app.js/core.js boot)
export async function requireAuth() {
  const { auth, authMod } = await ensureFirebase();
  return new Promise(res => {
    const unsub = authMod.onAuthStateChanged(auth, user => {
      unsub();
      state.user = user;
      state.authChecking = false;
      res(user);
    });
  });
}

export async function subscribeWs(wsId) {
  const { fsMod, db } = await ensureFirebase();
  if (state.unsubWs) state.unsubWs();
  if (state.unsubTxs) state.unsubTxs();
  
  state.workspaceId = wsId;
  localStorage.setItem('df_active_ws', wsId);
  
  state.unsubWs = fsMod.onSnapshot(fsMod.doc(db, 'delights_flow_workspaces', wsId), doc => {
    if (doc.exists()) {
      state.workspace = doc.data();
      computeBalances(); scheduleRender(); saveSnap();
    }
  });

  const d = new Date(); d.setMonth(d.getMonth() - 2); // default load 2 months
  const q = fsMod.query(fsMod.collection(db, 'delights_flow_workspaces', wsId, 'transactions'), fsMod.where('date', '>=', d.toISOString().split('T')[0]));
  
  state.unsubTxs = fsMod.onSnapshot(q, snap => {
    const txs = [];
    snap.forEach(doc => txs.push({ ...doc.data(), id: doc.id }));
    txs.sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    state.transactions = txs; // Overwrite memory with server state for recent. 
    computeBalances(); scheduleRender(); saveSnap();
  });
}

// 12. Boot Sequence
document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM
  D.loading = $('loading-screen'); D.auth = $('auth-screen'); D.workspace = $('workspace-screen'); D.shell = $('app-shell');
  D.toast = $('toast-container'); D.confirm = $('confirm-modal'); D.exit = $('exit-modal');
  D.sideMActions = $('side-money-actions'); D.sideSActions = $('side-shop-actions');
  D.navMLinks = $('nav-money-links'); D.navSLinks = $('nav-shop-links');
  D.mobNMoney = $('mobile-nav-money'); D.mobNShop = $('mobile-nav-shop');
  D.vMOverview = $('view-overview'); D.vMHistory = $('view-history'); D.vMAnalytics = $('view-analytics');
  D.vSHome = $('shop-tab-home'); D.vSHistory = $('shop-tab-history'); D.vSAnalytics = $('shop-tab-analytics');

  // URL Hash check
  const hash = window.location.hash;
  if (hash === '#shop') { state.mode = 'shop'; state.shopTab = 'home'; }
  
  // SW
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('popstate', handlePopState);

  // 0ms Boot check
  const lUid = localStorage.getItem('df_last_uid');
  const lWs = localStorage.getItem('df_active_ws');
  if (lUid && lWs) {
    try {
      const snap = JSON.parse(localStorage.getItem(`df_snap_${lWs}`));
      if (snap && snap.ws) {
        state.workspaceId = lWs;
        state.workspace = snap.ws;
        state.transactions = snap.txs || [];
        computeBalances();
        D.loading.classList.add('hidden');
        D.shell.classList.remove('hidden');
        switchMode(state.mode, state.mode === 'money' ? state.moneyView : state.shopTab, { noHistory: true });
        
        // Dynamically import modules now that UI is showing cached data
        import('./money.js').then(m => m.initMoney(state, D));
        import('./shop.js').then(m => m.initShop(state, D));
      }
    } catch(e) {}
  }
  
  if (!D.shell.classList.contains('hidden')) {
    // We booted from cache. Load FB quietly 250ms after frame 1
    requestAnimationFrame(() => setTimeout(() => {
      ensureFirebase().then(async fb => {
        const u = await requireAuth();
        if (u && u.uid === lUid) subscribeWs(lWs); // Valid, sync
        else { localStorage.removeItem('df_last_uid'); window.location.reload(); } // Invalid auth, hard reset
      });
    }, 250));
  } else {
    // Cold boot (no cache or first time)
    if (!lUid) {
      D.loading.classList.add('hidden');
      D.auth.classList.remove('hidden');
      D.auth.classList.add('flex');
    }
    const fb = await ensureFirebase();
    const u = await requireAuth();
    if (!u) {
      D.loading.classList.add('hidden');
      D.auth.classList.remove('hidden'); D.auth.classList.add('flex');
      // Init GIS logic here later
    } else {
      // Fetch user profile and workspaces to decide if Workspace screen is needed
      const docSnap = await fb.fsMod.getDoc(fb.fsMod.doc(fb.db, 'delights_flow_users', u.uid));
      if (docSnap.exists() && docSnap.data().workspaces?.length > 0) {
        const wsId = lWs || docSnap.data().workspaces[0];
        await subscribeWs(wsId);
        D.loading.classList.add('hidden');
        D.shell.classList.remove('hidden');
        switchMode(state.mode, state.mode === 'money' ? state.moneyView : state.shopTab, { noHistory: true });
        import('./money.js').then(m => m.initMoney(state, D));
        import('./shop.js').then(m => m.initShop(state, D));
      } else {
        D.loading.classList.add('hidden');
        D.workspace.classList.remove('hidden'); D.workspace.classList.add('flex');
      }
    }
  }
});
