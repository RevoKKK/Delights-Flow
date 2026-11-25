// ==========================================
// app.js (Single File Architecture)
// Combines Core, Money, and Shop logics for 0ms performance
// ==========================================

// 1. Constants
const UI_ICONS = { Overview:'📊', Shop:'🏪', Analytics:'📈', History:'📜', P1:'🧑', P2:'👩', Shared:'🤝' };
const W_ICONS = ['💼', '🏦', '💳', '💰', '📱', '💵', '🏠', '🚗', 'Piggy', 'Safe'];
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#78716c'];
const STARTER_WALLETS = [ { id: 'w1', name: 'Cash', icon: '💵', color: COLORS[4], opening: 0 }, { id: 'w2', name: 'Bank', icon: '🏦', color: COLORS[9], opening: 0 } ];
const DEFAULT_SHOPS = [{ id: 's1', name: 'Shop 1', logoUrl: null, active: true }];
const EXP_CATS = [{ id: 'e1', name: 'Food', icon: '🍔' }, { id: 'e2', name: 'Transport', icon: '🚗' }, { id: 'e3', name: 'Utilities', icon: '⚡' }, { id: 'e4', name: 'Shopping', icon: '🛍️' }];
const INC_CATS = [{ id: 'i1', name: 'Salary', icon: '💰' }, { id: 'i2', name: 'Business', icon: '📈' }];
const COST_SUBTYPES = { inventory: 'Inventory', marketing: 'Marketing', other: 'Other' };
const PALETTE = { brand: '#3b82f6', shop: '#8b5cf6', income: '#22c55e', expense: '#ef4444' };

// 2. Shared State
const state = {
  mode: 'money', moneyView: 'overview', shopTab: 'home',
  user: null, workspaceId: null, workspace: null, transactions: [], balances: {},
  darkMode: localStorage.getItem('df_dark') === '1' || (!('df_dark' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
  privacyMode: false, activePerson: localStorage.getItem('df_ap') || 'p1',
  filters: { mSearch: '', mMonth: 'this_month', mWallet: 'all', mType: 'all', mOwner: 'all', mScope: 'all', sSearch: '', sMonth: 'this_month', sShop: 'all', sType: 'all' },
  charts: {}, firebaseLoaded: false, chartjsLoaded: false,
  unsubWs: null, unsubTxs: null
};

// 3. DOM & Helpers
const D = {};
const $ = id => document.getElementById(id);
const esc = str => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmtNum = (num, dec = 2) => Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (num, curr = '$', dec = 2) => state.privacyMode ? '****' : `${num < 0 ? '-' : ''}${curr}${fmtNum(Math.abs(num), dec)}`;
const fmtCompact = (num, curr = '$') => state.privacyMode ? '****' : `${num < 0 ? '-' : ''}${curr}${Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(num))}`;
const parseAmt = str => Math.abs(parseFloat(String(str).replace(/,/g, '')) || 0);
const parseSigned = str => parseFloat(String(str).replace(/,/g, '')) || 0;
const todayISO = () => new Date().toISOString().split('T')[0];
const curMonth = () => todayISO().substring(0, 7);
const fmtMonth = iso => new Date(iso + '-01T00:00:00').toLocaleString('default', { month: 'short', year: 'numeric' });
const fmtDateHead = iso => {
  const d = new Date(iso + 'T12:00:00'); const t = new Date(); t.setHours(12,0,0,0);
  const diff = Math.round((t - d) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getWallets = () => state.workspace?.wallets || STARTER_WALLETS;
const getWallet = id => getWallets().find(w => w.id === id) || { name: 'Unknown', icon: '❓', color: '#999' };
const getShops = () => state.workspace?.shops || DEFAULT_SHOPS;
const getShop = id => getShops().find(s => s.id === id) || { name: 'Unknown' };
const getCats = () => ({ e: state.workspace?.expCats || EXP_CATS, i: state.workspace?.incCats || INC_CATS });
const catIcon = (id, type) => type === 'transfer' ? '🔄' : type.startsWith('shop_') ? (type==='shop_sale'?'🛒':'🔥') : (getCats()[type === 'expense' ? 'e' : 'i'].find(c => c.id === id)?.icon || '❔');
const personName = id => state.workspace?.names?.[id] || (id === 'p1' ? 'Person 1' : id === 'p2' ? 'Person 2' : 'Shared');
const getShopSplit = sId => state.workspace?.shopSplits?.[sId] || { p1: 50, p2: 50 };

// 4. Balances Math
function computeBalances() {
  const b = { wallets: {}, p1: { i: 0, e: 0, net: 0 }, p2: { i: 0, e: 0, net: 0 }, shared: { i: 0, e: 0, net: 0 }, shop: { rev: 0, cap: 0, cost: 0, pendCod: 0, net: 0, sIds: {} } };
  getWallets().forEach(w => b.wallets[w.id] = w.opening || 0);
  getShops().forEach(s => b.shop.sIds[s.id] = { rev: 0, cap: 0, cost: 0, pendCod: 0, net: 0 });

  state.transactions.forEach(tx => {
    if (tx.type === 'income' || tx.type === 'expense') {
      const own = tx.owner || 'shared';
      if (tx.type === 'income') { b.wallets[tx.wId] += tx.amt; b[own].i += tx.amt; b[own].net += tx.amt; } 
      else { b.wallets[tx.wId] -= tx.amt; b[own].e += tx.amt; b[own].net -= tx.amt; }
    } 
    else if (tx.type === 'transfer') { b.wallets[tx.wId] -= tx.amt; b.wallets[tx.wTo] += tx.amt; } 
    else if (tx.type === 'shop_sale') {
      const sp = getShopSplit(tx.sId);
      b.shop.rev += tx.total; b.shop.net += tx.total;
      if (b.shop.sIds[tx.sId]) { b.shop.sIds[tx.sId].rev += tx.total; b.shop.sIds[tx.sId].net += tx.total; }
      if (tx.paidNow > 0 && tx.wId) b.wallets[tx.wId] += tx.paidNow;
      if (tx.codAmt > 0) {
        if (tx.codStatus === 'paid' && tx.codWId) b.wallets[tx.codWId] += tx.codAmt;
        else if (tx.codStatus === 'pending') { b.shop.pendCod += tx.codAmt; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].pendCod += tx.codAmt; }
      }
      b.p1.i += tx.total * (sp.p1/100); b.p1.net += tx.total * (sp.p1/100);
      b.p2.i += tx.total * (sp.p2/100); b.p2.net += tx.total * (sp.p2/100);
    } 
    else if (tx.type === 'shop_cap' || tx.type === 'shop_cost') {
      const sp = getShopSplit(tx.sId);
      b.shop.net -= tx.total; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].net -= tx.total;
      if (tx.type === 'shop_cap') { b.shop.cap += tx.total; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].cap += tx.total; } 
      else { b.shop.cost += tx.total; if (b.shop.sIds[tx.sId]) b.shop.sIds[tx.sId].cost += tx.total; }
      if (tx.wId) b.wallets[tx.wId] -= tx.total;
      b.p1.e += tx.total * (sp.p1/100); b.p1.net -= tx.total * (sp.p1/100);
      b.p2.e += tx.total * (sp.p2/100); b.p2.net -= tx.total * (sp.p2/100);
    }
  });
  state.balances = b;
}

// 5. Firebase & CRUD Core
let fb = {};
async function ensureFirebase() {
  if (state.firebaseLoaded) return fb;
  const [app, auth, firestore, storage] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js')
  ]);
  const firebaseApp = app.initializeApp(window.__firebase_config);
  fb.auth = auth.getAuth(firebaseApp); fb.db = firestore.getFirestore(firebaseApp);
  fb.authMod = auth; fb.fsMod = firestore;
  try { firestore.initializeFirestore(firebaseApp, { localCache: firestore.persistentLocalCache({ tabManager: firestore.persistentSingleTabManager({ forceOwnership: true }) }), experimentalAutoDetectLongPolling: true }); } catch (e) {}
  state.firebaseLoaded = true; return fb;
}

function saveSnap() {
  if (!state.workspaceId) return;
  setTimeout(() => { localStorage.setItem(`df_snap_${state.workspaceId}`, JSON.stringify({ ws: state.workspace, txs: state.transactions.slice(0, 200) })); localStorage.setItem('df_last_uid', state.user?.uid || ''); localStorage.setItem('df_active_ws', state.workspaceId); }, 800);
}

function toast(msg, type = 'info') {
  if (!D.toast) D.toast = $('toast-container');
  const t = document.createElement('div');
  t.className = `px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg transform transition-all duration-300 translate-y-4 opacity-0 ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800'}`;
  t.innerText = msg; D.toast.appendChild(t);
  requestAnimationFrame(() => t.classList.remove('translate-y-4', 'opacity-0'));
  setTimeout(() => { t.classList.add('translate-y-4', 'opacity-0'); setTimeout(() => t.remove(), 300); }, 3000);
}

async function patchWs(patch) {
  if (!state.workspaceId) return;
  state.workspace = { ...state.workspace, ...patch };
  computeBalances(); scheduleRender(); saveSnap();
  try { const { fsMod, db } = await ensureFirebase(); await fsMod.updateDoc(fsMod.doc(db, 'delights_flow_workspaces', state.workspaceId), patch); } catch (e) { toast("Sync error", "error"); }
}

async function saveTx(payload, editId = null) {
  if (!state.workspaceId) return;
  const { fsMod, db } = await ensureFirebase();
  const txsRef = fsMod.collection(db, 'delights_flow_workspaces', state.workspaceId, 'transactions');
  let docRef = editId ? fsMod.doc(txsRef, editId) : fsMod.doc(txsRef);
  const now = Date.now();
  payload.updatedAt = now; if (!editId) { payload.id = docRef.id; payload.createdAt = now; }
  
  if (editId) { const idx = state.transactions.findIndex(t => t.id === editId); if (idx > -1) state.transactions[idx] = { ...state.transactions[idx], ...payload }; } 
  else { state.transactions.unshift(payload); state.transactions.sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt); }
  
  computeBalances(); scheduleRender(); saveSnap();
  try { if (editId) await fsMod.updateDoc(docRef, payload); else await fsMod.setDoc(docRef, payload); } catch (e) { toast("Sync error", "error"); }
}

async function delTx(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  computeBalances(); scheduleRender(); saveSnap();
  try { const { fsMod, db } = await ensureFirebase(); await fsMod.deleteDoc(fsMod.doc(db, 'delights_flow_workspaces', state.workspaceId, 'transactions', id)); toast("Deleted", "success"); } catch (e) { toast("Delete error", "error"); }
}

function openConfirm(title, msg, onConfirm) {
  $('confirm-title').innerText = title; $('confirm-msg').innerText = msg;
  const okBtn = $('confirm-ok');
  const okHandler = () => { onConfirm(); close(); };
  const close = () => { D.confirm.classList.add('hidden'); okBtn.removeEventListener('click', okHandler); $('confirm-cancel').removeEventListener('click', close); };
  okBtn.addEventListener('click', okHandler); $('confirm-cancel').addEventListener('click', close);
  D.confirm.classList.remove('hidden');
}

// 6. Navigation & Render Engine
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    if (state.mode === 'money') renderMoney(); else renderShop();
    renderQueued = false;
  });
}

function switchMode(mode, subTab = null, opts = {}) {
  // Pointerdown triggers this instantly. 
  requestAnimationFrame(() => {
    state.mode = mode;
    if (mode === 'money') {
      if(subTab) state.moneyView = subTab;
      D.sideMActions.classList.remove('hidden'); D.sideSActions.classList.add('hidden');
      D.navMLinks.classList.remove('hidden'); D.navSLinks.classList.add('hidden');
      D.mobNMoney.classList.remove('hidden'); D.mobNShop.classList.add('hidden');
      ['overview', 'history', 'analytics'].forEach(v => D[`vM${v.charAt(0).toUpperCase()+v.slice(1)}`].classList.toggle('hidden', state.moneyView !== v));
      D.vSHome.classList.add('hidden'); D.vSHistory.classList.add('hidden'); D.vSAnalytics.classList.add('hidden');
      document.body.classList.remove('shop-mode-active');
    } else {
      if(subTab) state.shopTab = subTab;
      D.sideMActions.classList.add('hidden'); D.sideSActions.classList.remove('hidden');
      D.navMLinks.classList.add('hidden'); D.navSLinks.classList.remove('hidden');
      D.mobNMoney.classList.add('hidden'); D.mobNShop.classList.remove('hidden');
      ['home', 'history', 'analytics'].forEach(v => D[`vS${v.charAt(0).toUpperCase()+v.slice(1)}`].classList.toggle('hidden', state.shopTab !== v));
      D.vMOverview.classList.add('hidden'); D.vMHistory.classList.add('hidden'); D.vMAnalytics.classList.add('hidden');
      document.body.classList.add('shop-mode-active');
    }
    scheduleRender();
  });

  if (!opts.noHistory) setTimeout(() => history.pushState({ mode: state.mode, view: state.mode === 'money' ? state.moneyView : state.shopTab }, ''), 10);
}

// 7. Money Mode Logic
function renderMoney() {
  if (state.moneyView === 'overview') {
    const month = curMonth(); const txs = state.transactions; const wallets = getWallets();
    let netBal = wallets.reduce((sum, w) => sum + (state.balances.wallets[w.id] || 0), 0);
    let inc = 0, exp = 0;
    txs.filter(t => t.date.startsWith(month)).forEach(t => {
      if (t.type === 'income') inc += t.amt; else if (t.type === 'expense') exp += t.amt;
      else if (t.type === 'shop_sale') inc += (t.total * ((getShopSplit(t.sId)?.[state.activePerson] || 50) / 100));
      else if (t.type === 'shop_cap' || t.type === 'shop_cost') exp += (t.total * ((getShopSplit(t.sId)?.[state.activePerson] || 50) / 100));
    });
    
    const hGrid = D.vMOverview.children[0].querySelector('.grid').children;
    D.vMOverview.children[0].querySelector('h2').innerText = fmtMoney(netBal, state.workspace?.currency);
    hGrid[0].children[1].innerText = fmtMoney(inc, state.workspace?.currency, 0); hGrid[1].children[1].innerText = fmtMoney(exp, state.workspace?.currency, 0); hGrid[2].children[1].innerText = fmtMoney(inc - exp, state.workspace?.currency, 0);
    
    D.vMOverview.querySelectorAll('.grid')[1].innerHTML = wallets.map(w => `<div onclick="switchMode('money', 'history'); state.filters.mWallet='${w.id}'; state.filters.mMonth='all'; scheduleRender();" class="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border-l-4 cursor-pointer" style="border-left-color: ${w.color||'#3b82f6'}"><div class="text-xl mb-2">${w.icon}</div><div class="text-sm text-gray-500 font-medium truncate">${esc(w.name)}</div><div class="text-lg font-bold">${fmtMoney(state.balances.wallets[w.id]||0, state.workspace?.currency, 0)}</div></div>`).join('');
    
    D.vMOverview.querySelector('.space-y-2').innerHTML = txs.slice(0, 8).map(t => `<div onclick="${t.type.startsWith('shop_') ? `openShopTxModal('${t.id}')` : `openMTxModal('${t.id}')`}" class="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-xl mb-2 cursor-pointer"><div class="flex gap-3"><div class="text-xl">${catIcon(t.cat, t.type)}</div><div><div class="font-bold text-sm">${esc(t.note || t.catName || 'Transaction')}</div><div class="text-xs text-gray-500">${t.date}</div></div></div><div class="font-bold ${t.type.includes('income')||t.type==='shop_sale'?'text-green-600':'text-red-600'}">${fmtMoney(t.type.startsWith('shop_')?t.total:t.amt, state.workspace?.currency)}</div></div>`).join('');
  }
  else if (state.moneyView === 'history') {
    // Basic list render for brevity in unified file
    const f = state.filters;
    let filtered = state.transactions.filter(t => (f.mMonth==='all'||t.date.startsWith(f.mMonth)) && (f.mWallet==='all'||t.wId===f.mWallet||t.wTo===f.mWallet) );
    D.vMHistory.querySelector('.space-y-3').innerHTML = filtered.map(t => `<div onclick="${t.type.startsWith('shop_') ? `openShopTxModal('${t.id}')` : `openMTxModal('${t.id}')`}" class="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-xl cursor-pointer border-b border-gray-100 dark:border-gray-800"><div class="flex gap-2"><div class="text-xl">${catIcon(t.cat, t.type)}</div><div class="text-sm font-bold">${esc(t.note || t.catName || 'Record')}</div></div><div class="text-sm font-bold ${t.type.includes('income')||t.type==='shop_sale'?'text-green-600':'text-red-600'}">${fmtMoney(t.type.startsWith('shop_')?t.total:t.amt, state.workspace?.currency)}</div></div>`).join('');
  }
}

function openMTxModal(txId = null) {
  const tx = txId ? state.transactions.find(t=>t.id===txId) : null;
  const m = $('tx-modal');
  let type = tx ? tx.type : 'expense';
  m.querySelector('input[type="text"]').value = tx ? fmtNum(tx.amt) : ''; // Amount
  const sBtn = m.querySelectorAll('button')[9];
  sBtn.onclick = () => {
    const amt = parseAmt(m.querySelector('input[type="text"]').value);
    if (!amt) return toast('Enter amount', 'error');
    saveTx({ type, amt, wId: getWallets()[0].id, date: todayISO(), owner: 'p1', note: 'Manual entry' }, tx ? tx.id : null);
    m.classList.add('hidden');
  };
  m.querySelector('button.text-2xl').onclick = () => m.classList.add('hidden');
  if(tx) {
    let del = m.querySelector('#tx-del'); if(!del){ del = document.createElement('button'); del.id='tx-del'; del.className='w-full py-3 bg-red-50 text-red-600 rounded-xl mt-2'; del.innerText='Delete'; sBtn.parentElement.appendChild(del);}
    del.onclick = () => openConfirm('Delete', 'Are you sure?', () => { delTx(tx.id); m.classList.add('hidden'); });
  }
  m.classList.remove('hidden'); m.classList.add('flex');
}

// 8. Shop Mode Logic
let shopDraft = {};
function renderShop() {
  if (state.shopTab === 'home') {
    const today = todayISO(); const txs = state.transactions.filter(t => t.type.startsWith('shop_'));
    let tSales = 0; txs.forEach(t => { if (t.type==='shop_sale' && t.date===today) tSales += (t.paidNow||0); if (t.codStatus==='paid' && t.codPaidDate===today) tSales += (t.codAmt||0); });
    
    D.vSHome.children[0].querySelector('h2').innerText = fmtMoney(tSales, state.workspace?.currency);
    const hGrid = D.vSHome.children[0].querySelector('.grid').children;
    hGrid[0].children[1].innerText = fmtMoney(state.balances.shop.rev, state.workspace?.currency, 0);
    hGrid[1].children[1].innerText = fmtMoney(state.balances.shop.cap + state.balances.shop.cost, state.workspace?.currency, 0);
    hGrid[2].children[1].innerText = fmtMoney(Math.abs(state.balances.shop.net), state.workspace?.currency, 0);
    hGrid[3].children[0].children[1].innerText = fmtMoney(state.balances.shop.pendCod, state.workspace?.currency, 0);

    D.vSHome.querySelectorAll('.grid')[1].innerHTML = getShops().map(s => {
      const b = state.balances.shop.sIds[s.id] || { rev:0, cap:0, cost:0, pendCod:0, net:0 };
      return `<div class="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border"><div class="font-bold mb-2">${esc(s.name)}</div><div class="text-xs">Sales: ${fmtCompact(b.rev)} | Cap: ${fmtCompact(b.cap+b.cost)}</div></div>`;
    }).join('');

    D.vSHome.querySelector('.space-y-2').innerHTML = txs.slice(0, 8).map(t => `<div onclick="openShopTxModal('${t.id}')" class="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-xl mb-2 cursor-pointer"><div class="font-bold text-sm">${t.type==='shop_sale'?'🛒 Sale':'🔥 Cost'} - ${fmtMoney(t.total, state.workspace?.currency)}</div>${t.codStatus==='pending'?`<button onclick="event.stopPropagation(); saveTx({codStatus:'paid', codPaidDate: todayISO()}, '${t.id}');" class="text-xs bg-green-100 text-green-800 px-2 rounded">Mark Paid</button>`:''}</div>`).join('');
  }
}

window.openShopTxModal = (txId = null) => {
  const tx = txId ? state.transactions.find(t=>t.id===txId) : null;
  shopDraft = tx ? JSON.parse(JSON.stringify(tx)) : { type: 'shop_sale', sId: getShops()[0]?.id, items: [{ id: Date.now(), name: 'Item', qty: 1, price: 0 }], total: 0, date: todayISO() };
  const m = $('shop-tx-modal');
  
  const renderF = () => {
    shopDraft.total = shopDraft.items.reduce((acc, it) => acc + (parseAmt(it.price) * parseAmt(it.qty)), 0);
    m.querySelector('.bg-shop\\/10 span:last-child').innerText = fmtMoney(shopDraft.total, state.workspace?.currency);
  };
  renderF();

  m.querySelector('button.bg-shop.text-white').onclick = () => {
    saveTx({ ...shopDraft, paidNow: shopDraft.total, codStatus: 'none', wId: getWallets()[0].id }, txId);
    m.classList.add('hidden');
  };
  m.querySelector('button.text-2xl').onclick = () => m.classList.add('hidden');
  m.classList.remove('hidden'); m.classList.add('flex');
};

// 9. Boot Sequence
document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM
  ['loading-screen', 'auth-screen', 'workspace-screen', 'app-shell', 'toast-container', 'confirm-modal', 'exit-modal', 'side-money-actions', 'side-shop-actions', 'nav-money-links', 'nav-shop-links', 'mobile-nav-money', 'mobile-nav-shop', 'view-overview', 'view-history', 'view-analytics', 'shop-tab-home', 'shop-tab-history', 'shop-tab-analytics'].forEach(id => D[id.replace(/-([a-z])/g, g => g[1].toUpperCase())] = $(id));
  D.vMOverview = $('view-overview'); D.vMHistory = $('view-history'); D.vMAnalytics = $('view-analytics');
  D.vSHome = $('shop-tab-home'); D.vSHistory = $('shop-tab-history'); D.vSAnalytics = $('shop-tab-analytics');

  // Fix Pointer events for 0ms Touch Nav
  const navSetup = (parent, isShopNav) => {
    Array.from(parent.children).forEach((el, i) => {
      el.onpointerdown = (e) => {
        e.preventDefault();
        if (isShopNav && i === 0) switchMode('money', 'overview');
        else if (!isShopNav && i === 1) switchMode('shop', 'home');
        else switchMode(isShopNav ? 'shop' : 'money', ['overview','shop','','analytics','history'][i]);
      };
      el.onclick = e => e.preventDefault();
    });
  };
  navSetup(D.navMLinks, false); navSetup(D.mobNMoney, false);
  navSetup(D.navSLinks, true); navSetup(D.mobNShop, true);

  // FAB 
  D.mobNMoney.children[2].onpointerdown = (e) => { e.preventDefault(); openMTxModal(); };
  D.mobNShop.children[2].onpointerdown = (e) => { e.preventDefault(); openShopTxModal(); };

  // Load from Cache
  const lWs = localStorage.getItem('df_active_ws');
  if (lWs) {
    try {
      const snap = JSON.parse(localStorage.getItem(`df_snap_${lWs}`));
      if (snap) { state.workspaceId = lWs; state.workspace = snap.ws; state.transactions = snap.txs || []; computeBalances(); $('loading-screen').classList.add('hidden'); D.appShell.classList.remove('hidden'); switchMode(state.mode, 'overview', {noHistory:true}); }
    } catch(e) {}
  }
});