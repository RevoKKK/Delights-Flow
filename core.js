// Delights Flow — Shared Core Engine (Firebase, GIS Auth, Firestore Sync, State, Helpers, Back Navigation, Auto-Update)

export const FIREBASE_CONFIG = window.__firebase_config || {
  apiKey: "AIzaSyAKgqAtXONpTX9h87pm-sUx7MY0JJyEPTE",
  authDomain: "delights-flow.firebaseapp.com",
  projectId: "delights-flow",
  storageBucket: "delights-flow.firebasestorage.app",
  messagingSenderId: "967458395131",
  appId: "1:967458395131:web:9cafabf5ed0a6c3bc0b15e"
};
export const GOOGLE_CLIENT_ID = window.__google_web_client_id || "967458395131-ahj573n9ea4artc7l3dj25gv4k26l92p.apps.googleusercontent.com";

export const SVG = (d, cls = 'w-5 h-5', sw = 2) => `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="${sw}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;

export const UI_ICONS = {
  brand: SVG('M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3', 'w-5 h-5', 2.2),
  grid: SVG('M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'),
  shop: SVG('M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349'),
  chart: SVG('M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6ZM13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z'),
  list: SVG('M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75ZM3.75 12h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z'),
  sliders: SVG('M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75'),
  plus: SVG('M12 4.5v15m7.5-7.5h-15', 'w-7 h-7', 2.6),
  sun: SVG('M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'),
  moon: SVG('M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'),
  eye: SVG('M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z', 'w-4 h-4 sm:w-5 sm:h-5'),
  eyeOff: SVG('M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88', 'w-4 h-4 sm:w-5 sm:h-5')
};

export const W_ICONS = {
  cash: SVG('M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'),
  bank: SVG('M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18'),
  mobile: SVG('M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 18.75h3'),
  card: SVG('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z')
};

export const COLORS = [
  ['emerald','Emerald','#10b981'],['green','Green','#16a34a'],['lime','Lime','#84cc16'],['teal','Teal','#14b8a6'],
  ['cyan','Cyan','#06b6d4'],['sky','Sky','#0ea5e9'],['blue','Blue','#2563eb'],['indigo','Indigo','#6366f1'],
  ['violet','Violet','#8b5cf6'],['purple','Purple','#9333ea'],['fuchsia','Fuchsia','#d946ef'],['pink','Pink','#ec4899'],
  ['rose','Rose','#f43f5e'],['red','Red','#ef4444'],['orange','Orange','#f97316'],['amber','Amber','#f59e0b'],
  ['yellow','Gold','#eab308'],['slate','Slate','#64748b']
].map(([key, label, hex]) => ({ key, label, hex }));
export const COLOR_MAP = Object.fromEntries(COLORS.map((c) => [c.key, c]));
export const DEFAULT_PERSON_COLORS = { person1: 'indigo', person2: 'fuchsia' };

export const STARTER_WALLETS = [
  { id: 'cash', name: 'Cash', iconType: 'cash', colorKey: 'emerald' },
  { id: 'bank', name: 'Bank', iconType: 'bank', colorKey: 'blue' }
];
export const DEFAULT_SHOPS = [
  { id: 'shop1', name: 'Shop 1', colorKey: 'amber', startingCapital: 0, footer: 'Thank you for your purchase!', logoDataUrl: '' }
];
export const EXP_CATS = [
  ['Food & Dining','🍽️'],['Groceries','🛒'],['Transport','🚕'],['Bills & Utilities','⚡'],
  ['Shopping','🛍️'],['Health','💊'],['Family','🏠'],['Entertainment','🎬'],['Other','📌']
].map(([name, icon]) => ({ name, icon }));
export const INC_CATS = [
  ['Salary','💼'],['Business','📈'],['Freelance','💻'],['Gift','🎁'],['Refund','↩️'],['Other','✨']
].map(([name, icon]) => ({ name, icon }));
export const PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#0ea5e9','#8b5cf6','#ef4444','#14b8a6','#f97316','#64748b'];
export const COST_SUBTYPES = ['Stock / Capital', 'Packaging', 'Delivery', 'Ads / Boost', 'Other'];
export const COST_COLORS = ['#f43f5e', '#f59e0b', '#6366f1', '#0ea5e9', '#10b981', '#8b5cf6', '#64748b'];

export const MODAL_IDS = [
  'confirm-modal', 'cod-pay-modal', 'receipt-modal',
  'tx-modal', 'shop-tx-modal', 'wallets-modal', 'settings-modal', 'shop-settings-modal', 'templates-modal'
];

// --- DATE & BASIC HELPERS ---
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const curMonth = () => todayISO().slice(0, 7);

// --- SHARED STATE ---
export const state = {
  user: null, userWorkspaces: [], workspaceId: '', authMode: 'signin',
  currentView: 'overview', analyticsSub: 'money', historySub: 'money',
  darkMode: document.documentElement.classList.contains('dark'), privacyMode: false, activePerson: 'person1',
  workspace: {
    name: 'My Ledger', joinPin: '', wallets: STARTER_WALLETS.map((w) => ({ ...w })), archivedWalletNames: {},
    openingBalances: { cash: 0, bank: 0 }, userNames: { person1: 'Person 1', person2: 'Person 2' },
    userColors: { ...DEFAULT_PERSON_COLORS }, currency: 'Ks',
    customExpenseCategories: [], customIncomeCategories: [], quickTemplates: [],
    shopCategories: DEFAULT_SHOPS.map((c) => ({ ...c })),
    shopProfile: { name: '', footer: 'Thank you for your purchase!', logoDataUrl: '' }
  },
  transactions: [],
  // Money view state
  historyMode: 'list', calendarMonth: curMonth(), calendarSelectedDate: todayISO(), walletFilterActive: false,
  filters: { search: '', month: curMonth(), wallet: 'all', type: 'all', person: 'all', scope: 'all' },
  analyticsMonth: curMonth(), analyticsScope: 'all',
  txDraft: { editId: null, type: 'expense', wallet: 'cash', fromWallet: 'cash', toWallet: 'bank', category: 'Food & Dining', person: 'person1' },
  settingsDraftWallets: [], openColorPickerWalletId: null,
  settingsPersonColorsDraft: { ...DEFAULT_PERSON_COLORS }, openPersonColorPicker: null,
  // Shop view state
  shopFilterActive: false, shopFilters: { search: '', month: curMonth(), category: 'all', type: 'all' },
  shopHistoryMode: 'list', shopCalendarMonth: curMonth(), shopCalendarSelectedDate: todayISO(),
  shopAnalyticsMonth: curMonth(), shopAnalyticsShopId: 'all',
  shopDraft: { editId: null, mode: 'sale', shopCategoryId: 'shop1', costSubType: 'Stock / Capital', wallet: 'cash', items: [{ name: '', qty: 1, price: '' }], splitMode: 'full_paid', existingCodStatus: 'none', existingCodWallet: '', existingCodPaidDate: '' },
  codPayDraft: { txId: null, wallet: 'cash' }, settingsShopsDraft: [], openColorPickerShopId: null, logoUploadTargetIdx: -1, activeReceiptTx: null,
  // Shared UI
  confirmCallback: null,
  charts: { expenseCategory: null, incomeExpense: null, walletDistribution: null, personBreakdown: null, shopTrend: null, shopCats: null, shopCosts: null }
};

// --- FORMATTERS & DOMAIN HELPERS ---
export const isActiveUser = (v) => v === 'person1' || v === 'person2';
export const isValidPerson = (v) => isActiveUser(v) || v === 'shared';
export const getOwner = (t) => (t?.scope === 'shop' || t?.loggedBy === 'shop') ? 'shop' : (isValidPerson(t?.loggedBy) ? t.loggedBy : 'person1');
export const personName = (k) => k === 'shop' ? 'Shop' : k === 'shared' ? 'Shared' : (k === 'person2' ? (state.workspace.userNames?.person2 || 'Person 2') : (state.workspace.userNames?.person1 || 'Person 1'));
export const getPersonColor = (k) => {
  if (k === 'shop') return COLOR_MAP.amber;
  if (k === 'shared') return COLOR_MAP.teal;
  const key = k === 'person2'
    ? (state.workspace.userColors?.person2 || DEFAULT_PERSON_COLORS.person2)
    : (state.workspace.userColors?.person1 || DEFAULT_PERSON_COLORS.person1);
  return COLOR_MAP[key] || COLOR_MAP[k === 'person2' ? 'fuchsia' : 'indigo'];
};
export const fmtNum = (n) => { const x = Number(n) || 0; return `${x < 0 ? '-' : ''}${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 })}`; };
export const fmtMoney = (n, plus = false) => `${plus && Number(n) > 0 ? '+' : ''}${fmtNum(n)} ${state.workspace.currency || 'Ks'}`;
export const fmtDisp = (n, plus = false) => state.privacyMode ? '••••••' : fmtMoney(n, plus);
export const fmtCompact = (n) => { const x = Math.abs(Number(n) || 0); return x >= 1e6 ? `${(x/1e6).toFixed(x>=1e7?0:1).replace(/\.0$/,'')}M` : x >= 1e3 ? `${(x/1e3).toFixed(x>=1e5?0:1).replace(/\.0$/,'')}k` : String(Math.round(x)); };
export const parseAmt = (v) => { const n = parseFloat(String(v || '').replace(/,/g, '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
export const parseSigned = (v) => String(v || '').trim().startsWith('-') ? -parseAmt(v) : parseAmt(v);
export const fmtAmtInput = (el) => {
  const r = el.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!r) return (el.value = '');
  const [i, d] = r.split('.');
  el.value = d !== undefined ? `${Number(i || 0).toLocaleString('en-US')}.${d.slice(0, 2)}` : Number(i || 0).toLocaleString('en-US');
};
export const fmtMonth = (mk) => { if (!mk || mk === 'all') return 'All Time'; const [y, m] = mk.split('-').map(Number); return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : mk; };
export const fmtDateHead = (ds) => {
  if (ds === todayISO()) return 'Today';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (ds === `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`) return 'Yesterday';
  const p = String(ds || '').split('-').map(Number);
  return p.length === 3 ? new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ds;
};

export const getWallets = () => (Array.isArray(state.workspace.wallets) && state.workspace.wallets.length ? state.workspace.wallets : STARTER_WALLETS)
  .map((w) => { const c = COLOR_MAP[w.colorKey] || COLORS[0], it = W_ICONS[w.iconType] ? w.iconType : 'bank'; return { ...w, iconType: it, colorKey: c.key, colorLabel: c.label, hex: c.hex, icon: W_ICONS[it] }; });
export const getWallet = (id) => getWallets().find((w) => w.id === id) || { id: id || 'removed', name: state.workspace.archivedWalletNames?.[id] || id || 'Account', hex: '#64748b', icon: W_ICONS.bank, archived: true };

export const getCats = (type) => {
  const base = type === 'income' ? INC_CATS : EXP_CATS;
  const custom = (type === 'income' ? state.workspace.customIncomeCategories : state.workspace.customExpenseCategories) || [];
  const seen = new Set(base.map((c) => c.name.toLowerCase()));
  return [...base, ...custom.filter((n) => n && !seen.has(n.toLowerCase())).map((name) => ({ name, icon: type === 'income' ? '💵' : '🏷️' }))];
};
export const catIcon = (txOrType, name) => {
  if (typeof txOrType === 'object' && txOrType) return txOrType.scope === 'shop' ? (txOrType.type === 'income' ? '🛍️' : '📦') : catIcon(txOrType.type, txOrType.category);
  if (txOrType === 'transfer') return '🔄';
  return getCats(txOrType).find((c) => c.name === name)?.icon || (txOrType === 'income' ? '💵' : '🏷️');
};

export const getShops = () => {
  const lp = state.workspace.shopProfile || {}, raw = state.workspace.shopCategories?.length ? state.workspace.shopCategories : DEFAULT_SHOPS;
  return raw.map((s, i) => {
    const col = COLOR_MAP[s.colorKey] || COLORS[i % COLORS.length];
    return {
      id: s.id || `shop${i + 1}`, name: s.name || `Shop ${i + 1}`,
      colorKey: col.key, colorLabel: col.label, hex: col.hex, startingCapital: Number(s.startingCapital) || 0,
      footer: s.footer !== undefined ? s.footer : (lp.footer || 'Thank you for your purchase!'),
      logoDataUrl: s.logoDataUrl !== undefined ? s.logoDataUrl : (i === 0 ? (lp.logoDataUrl || '') : '')
    };
  });
};
export const getShop = (id, fallback = '') => {
  const lp = state.workspace.shopProfile || {};
  if (id === 'general') return { id: 'general', name: 'General Shop', hex: '#64748b', colorKey: 'slate', colorLabel: 'Slate', startingCapital: 0, footer: lp.footer || 'Thank you for your purchase!', logoDataUrl: lp.logoDataUrl || '' };
  return getShops().find((s) => s.id === id) || { id: id || 'general', name: fallback || lp.name || 'Shop', hex: '#64748b', colorKey: 'slate', colorLabel: 'Slate', startingCapital: 0, footer: lp.footer || 'Thank you for your purchase!', logoDataUrl: lp.logoDataUrl || '' };
};

// Shop & COD math (shared across Money & Shop)
export const isSaleTx = (t) => (t.shopEntryType || (t.type === 'income' ? 'sale' : 'capital')) === 'sale';
export const orderTot = (t) => t.orderTotal !== undefined ? (Number(t.orderTotal) || 0) : (Number(t.amount) || 0);
export const paidUpfront = (t) => t.paidAmount !== undefined ? (Number(t.paidAmount) || 0) : orderTot(t);
export const codAmtOf = (t) => Number(t.codAmount) || 0;
export const codStatusOf = (t) => { const c = codAmtOf(t); return c <= 0 ? 'none' : (t.codStatus === 'paid' ? 'paid' : 'pending'); };
export const collectedOf = (t) => paidUpfront(t) + (codStatusOf(t) === 'paid' ? codAmtOf(t) : 0);
export const pendingCodOf = (t) => codStatusOf(t) === 'pending' ? codAmtOf(t) : 0;
export const genReceiptNo = (ds) => `DF-${(ds || todayISO()).replace(/-/g, '').slice(2)}-${Math.floor(100 + Math.random() * 900)}`;
export const getShopSplit = (t) => {
  if (!t || t.scope !== 'shop' || t.type !== 'income' || t.paidAmount === undefined) return null;
  const paid = Number(t.paidAmount) || 0, cod = Number(t.codAmount) || 0, codPaid = cod > 0 && t.codStatus === 'paid';
  return { paid, cod, codPaid, codPending: cod > 0 && !codPaid, codWallet: t.codWallet || t.wallet };
};

export const computeBalances = () => {
  const bal = {};
  getWallets().forEach((w) => (bal[w.id] = Number(state.workspace.openingBalances?.[w.id]) || 0));
  state.transactions.forEach((t) => {
    const sp = getShopSplit(t);
    if (sp) {
      if (sp.paid > 0 && bal[t.wallet] !== undefined) bal[t.wallet] += sp.paid;
      if (sp.codPaid && bal[sp.codWallet] !== undefined) bal[sp.codWallet] += sp.cod;
      return;
    }
    const a = Number(t.amount) || 0;
    if (t.type === 'income' && bal[t.wallet] !== undefined) bal[t.wallet] += a;
    else if (t.type === 'expense' && bal[t.wallet] !== undefined) bal[t.wallet] -= a;
    else if (t.type === 'transfer') {
      if (bal[t.fromWallet] !== undefined) bal[t.fromWallet] -= a;
      if (bal[t.toWallet] !== undefined) bal[t.toWallet] += a;
    }
  });
  return bal;
};

export const getAvailableMonths = () => {
  const s = new Set([curMonth()]);
  [state.analyticsMonth, state.filters.month, state.shopAnalyticsMonth, state.shopFilters.month, state.calendarMonth, state.shopCalendarMonth].forEach((m) => { if (m && m !== 'all') s.add(m); });
  state.transactions.forEach((t) => {
    if (t.date?.length >= 7) s.add(t.date.slice(0, 7));
    if (t.codPaidDate?.length >= 7) s.add(t.codPaidDate.slice(0, 7));
  });
  const now = new Date();
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  return Array.from(s).sort((a, b) => b.localeCompare(a));
};
export const matchesScope = (t, sc) => sc === 'all' || (t.scope === 'shop' ? 'shop' : 'personal') === sc;

// --- UI FEEDBACK, SCRIPTS & MODALS ---
export const toast = (msg, v = 'info', action = null) => {
  const cls = { success: 'bg-emerald-600 text-white', error: 'bg-rose-600 text-white', info: 'bg-slate-900 dark:bg-slate-800 text-white' };
  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold shadow-lg transition-all duration-300 flex items-center justify-between gap-3 ${cls[v] || cls.info}`;
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  if (action?.label) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = action.label;
    btn.className = 'px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold shrink-0';
    btn.onclick = () => { el.remove(); action.onClick?.(); };
    el.appendChild(btn);
  }
  $('toast-container')?.appendChild(el);
  if (!action?.sticky) setTimeout(() => { el.classList.add('opacity-0', '-translate-y-2'); setTimeout(() => el.remove(), 300); }, action ? 7000 : 2600);
};

// Modern Clipboard API with verified execCommand fallback (no false "Copied!" toast)
export const copyText = async (text, msg = 'Copied!') => {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast(msg, 'success');
      return true;
    }
  } catch {}
  try {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('Copy command rejected');
    toast(msg, 'success');
    return true;
  } catch {
    toast('Could not copy', 'error');
    return false;
  }
};

// Defer object URL revocation so iOS Safari and slower mobile browsers finish downloading
export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const openConfirm = (title, desc, onOk, okText = 'Confirm') => {
  state.confirmCallback = onOk;
  $('confirm-modal-title').textContent = title;
  $('confirm-modal-desc').textContent = desc;
  $('confirm-ok-btn').textContent = okText;
  $('confirm-modal').classList.remove('hidden');
};

export const hasOpenModal = () => MODAL_IDS.some((id) => { const el = $(id); return el && !el.classList.contains('hidden'); });
export const closeTopModal = () => {
  for (const id of MODAL_IDS) {
    const el = $(id);
    if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); return true; }
  }
  return false;
};

export const killChart = (k) => { if (state.charts[k]) { state.charts[k].destroy(); state.charts[k] = null; } };

let chartPromise = null, gisPromise = null, gisReady = false;
const loadScript = (src) => new Promise((res) => { const s = Object.assign(document.createElement('script'), { src, async: true, onload: () => res(true), onerror: () => res(false) }); document.head.appendChild(s); });
export const ensureChartJs = () => typeof Chart !== 'undefined' ? Promise.resolve(true) : (chartPromise ||= loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js').then((ok) => { if (!ok) chartPromise = null; return ok && typeof Chart !== 'undefined'; }));
export const ensureGis = () => window.google?.accounts?.id ? Promise.resolve(true) : (gisPromise ||= loadScript('https://accounts.google.com/gsi/client').then((ok) => { if (!ok) gisPromise = null; return ok && Boolean(window.google?.accounts?.id); }));

// --- RENDER SCHEDULER & MODULE HOOKS ---
const hooks = { onRender: null, ensureShopLoaded: null };
export function registerHooks(h) { Object.assign(hooks, h); }

let renderRaf = 0;
export function scheduleRender() {
  if (renderRaf) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = 0;
    renderHeaderShell();
    hooks.onRender?.();
  });
}

export function renderHeaderShell() {
  if (!isActiveUser(state.activePerson)) state.activePerson = 'person1';
  const an = personName(state.activePerson), wsName = state.workspace.name || 'My Ledger';
  const apCol = getPersonColor(state.activePerson);
  const isShopMode = state.currentView === 'shop' || (state.currentView === 'analytics' && state.analyticsSub === 'shop') || (state.currentView === 'history' && state.historySub === 'shop');

  const swl = $('sidebar-workspace-label'), mhs = $('mobile-header-subtitle'), mpp = $('mobile-person-pill');
  if (swl) swl.textContent = wsName;
  if (mhs) mhs.textContent = isShopMode ? `${wsName} · Shop` : `${wsName} · ${an}`;
  if (mpp) {
    mpp.textContent = an.length > 8 ? an.slice(0, 7) + '…' : an;
    mpp.style.background = `${apCol.hex}20`;
    mpp.style.color = apCol.hex;
    mpp.style.borderColor = `${apCol.hex}55`;
    mpp.classList.toggle('hidden', isShopMode);
  }

  document.querySelectorAll('.quick-person-btn').forEach((b) => {
    const k = b.dataset.quickPerson, c = getPersonColor(k), active = k === state.activePerson;
    b.innerHTML = `<span class="inline-flex items-center justify-center gap-1.5 max-w-full"><span class="w-2 h-2 rounded-full shrink-0" style="background:${c.hex}"></span><span class="truncate">${esc(personName(k))}</span></span>`;
    b.className = active ? 'quick-person-btn py-2 px-1 rounded-lg bg-white dark:bg-slate-900 shadow-sm truncate font-bold' : 'quick-person-btn py-2 px-1 rounded-lg text-slate-500 truncate';
    b.style.color = active ? c.hex : '';
  });

  // Context-aware mobile FAB color (Emerald for Shop, Indigo for Money)
  const fab = $('mobile-fab-add');
  if (fab) {
    fab.className = isShopMode
      ? 'w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-600/35 flex items-center justify-center active:scale-90 transition-transform ring-4 ring-white dark:ring-slate-900'
      : 'w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-xl shadow-indigo-600/35 flex items-center justify-center active:scale-90 transition-transform ring-4 ring-white dark:ring-slate-900';
    fab.setAttribute('aria-label', isShopMode ? 'Record Shop Sale' : 'Add entry');
  }
}

// --- HISTORY NAVIGATION SYNC (NO EXIT SCREEN; GESTURE-BACKED MODAL & VIEW STACK) ---
let ignoreNextPop = false;
let isPoppingModal = false;
const cleanUrl = () => `${location.pathname}${location.search}`;

function syncViewHistory(view, opts = {}) {
  if (opts.fromPopstate || opts.fromInit) return;
  try {
    const cur = history.state || {};
    if (view === 'overview') {
      if (cur.dfView) {
        ignoreNextPop = true;
        history.back();
      }
    } else if (cur.dfView) {
      history.replaceState({ dfView: view }, '', cleanUrl());
    } else if (!cur.dfModal) {
      history.pushState({ dfView: view }, '', cleanUrl());
    }
  } catch {}
}

export async function switchView(view, opts = {}) {
  if (view !== 'history' || !opts.keepWalletFilter) {
    state.filters.wallet = 'all';
    if (state.walletFilterActive) { state.filters.month = curMonth(); state.walletFilterActive = false; }
  }
  if (view !== 'history' || !opts.keepShopFilter) {
    if (!opts.keepShopFilter && state.shopFilterActive) {
      state.shopFilters.category = 'all'; state.shopFilters.type = 'all'; state.shopFilters.month = curMonth(); state.shopFilterActive = false;
    }
  }
  if (opts.historySub) state.historySub = opts.historySub;
  if (opts.analyticsSub) state.analyticsSub = opts.analyticsSub;

  state.currentView = view;
  syncViewHistory(view, opts);

  ['overview', 'shop', 'history', 'analytics'].forEach((v) => $(`view-${v}`)?.classList.toggle('hidden', v !== view));

  document.querySelectorAll('.nav-btn').forEach((b) => {
    const active = b.dataset.nav === view, isShop = b.dataset.nav === 'shop';
    b.className = active
      ? (isShop
        ? 'nav-btn w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
        : 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300')
      : (isShop
        ? 'nav-btn w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300'
        : 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80');
  });

  document.querySelectorAll('.nav-btn-mobile').forEach((b) => {
    const active = b.dataset.nav === view, isShop = b.dataset.nav === 'shop';
    b.className = active
      ? `nav-btn-mobile flex flex-col items-center py-1.5 gap-1 rounded-xl text-[11px] font-bold ${isShop ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`
      : 'nav-btn-mobile flex flex-col items-center py-1.5 gap-1 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400';
  });

  if (view === 'shop' || (view === 'history' && state.historySub === 'shop') || (view === 'analytics' && state.analyticsSub === 'shop')) {
    await hooks.ensureShopLoaded?.();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  scheduleRender();
}

export const showScreen = (name) => {
  ['loading', 'auth', 'workspace', 'app'].forEach((s) => $(s === 'app' ? 'app-shell' : `${s}-screen`)?.classList.toggle('hidden', s !== name));
  if (name === 'auth') renderGoogleBtn();
};

export const applyTheme = () => {
  document.documentElement.classList.toggle('dark', state.darkMode);
  document.querySelectorAll('.theme-icon-slot').forEach((s) => (s.innerHTML = state.darkMode ? UI_ICONS.sun : UI_ICONS.moon));
  if (state.currentView === 'analytics' && state.workspaceId) scheduleRender();
};

export const applyPrivacy = () => {
  document.querySelectorAll('.privacy-icon-slot').forEach((s) => (s.innerHTML = state.privacyMode ? UI_ICONS.eyeOff : UI_ICONS.eye));
};

export const updateSyncUI = (status) => {
  const eff = navigator.onLine === false ? 'offline' : status;
  document.querySelectorAll('.sync-dot').forEach((d) => {
    d.classList.remove('bg-amber-400', 'bg-emerald-500', 'animate-pulse');
    d.classList.add(eff === 'synced' ? 'bg-emerald-500' : 'bg-amber-400');
    if (eff === 'connecting') d.classList.add('animate-pulse');
  });
  document.querySelectorAll('.sync-text').forEach((el) => (el.textContent = eff === 'synced' ? 'Live Synced' : eff === 'offline' ? 'Offline (Queued)' : 'Connecting...'));
};

// --- SNAPSHOT CACHE (DEBOUNCED & WORKSPACE-ISOLATED) ---
let snapTimer = 0;
let activeSubscribedWsId = '';
let loadedSnapWsId = '';

export function saveSnap(wsId = state.workspaceId) {
  if (!wsId || wsId !== state.workspaceId) return;
  clearTimeout(snapTimer);
  const targetWsId = wsId;
  snapTimer = setTimeout(() => {
    if (targetWsId !== state.workspaceId) return;
    const write = (ws, txs) => {
      localStorage.setItem(`df_snap_${targetWsId}`, JSON.stringify({ workspace: ws, transactions: txs, userWorkspaces: state.userWorkspaces, savedAt: Date.now() }));
      localStorage.setItem('df_user_ws', JSON.stringify(state.userWorkspaces || []));
    };
    try { write(state.workspace, state.transactions.slice(0, 600)); }
    catch {
      try {
        write({
          ...state.workspace,
          shopCategories: (state.workspace.shopCategories || []).map((c) => ({ ...c, logoDataUrl: '' })),
          shopProfile: { ...(state.workspace.shopProfile || {}), logoDataUrl: '' }
        }, state.transactions.slice(0, 200));
      } catch {}
    }
  }, 250);
}

export function loadSnap(wsId) {
  try {
    const snap = JSON.parse(localStorage.getItem(`df_snap_${wsId}`) || 'null');
    if (!snap?.workspace) return false;
    const w = snap.workspace;
    state.workspace = {
      ...state.workspace, ...w,
      wallets: w.wallets?.length ? w.wallets : STARTER_WALLETS.map((x) => ({ ...x })),
      openingBalances: w.openingBalances || {},
      userNames: { person1: w.userNames?.person1 || 'Person 1', person2: w.userNames?.person2 || 'Person 2' },
      userColors: {
        person1: COLOR_MAP[w.userColors?.person1] ? w.userColors.person1 : DEFAULT_PERSON_COLORS.person1,
        person2: COLOR_MAP[w.userColors?.person2] ? w.userColors.person2 : DEFAULT_PERSON_COLORS.person2
      },
      currency: w.currency || 'Ks',
      shopCategories: w.shopCategories?.length ? w.shopCategories : DEFAULT_SHOPS.map((c) => ({ ...c })),
      shopProfile: { name: w.shopProfile?.name || '', footer: w.shopProfile?.footer || 'Thank you for your purchase!', logoDataUrl: w.shopProfile?.logoDataUrl || '' }
    };
    state.transactions = Array.isArray(snap.transactions) ? snap.transactions : [];
    if (Array.isArray(snap.userWorkspaces) && snap.userWorkspaces.length) state.userWorkspaces = snap.userWorkspaces;
    loadedSnapWsId = wsId;
    return true;
  } catch { return false; }
}

export const clearSnaps = () => {
  clearTimeout(snapTimer);
  activeSubscribedWsId = '';
  loadedSnapWsId = '';
  try { Object.keys(localStorage).forEach((k) => { if (k.startsWith('df_snap_') || ['df_active_ws', 'df_last_uid', 'df_user_ws'].includes(k)) localStorage.removeItem(k); }); } catch {}
};

// --- LAZY FIREBASE ENGINE ---
let app = null, db = null, auth = null, fb = null, fbPromise = null;
let unsubUser = null, unsubWs = null, unsubTx = null, deferredInstall = null, resolveAuthReady = null;
const authReadyPromise = new Promise((r) => (resolveAuthReady = r));

export function ensureFirebase() {
  if (fb && auth && db) return Promise.resolve(fb);
  if (fbPromise) return fbPromise;
  fbPromise = Promise.all([
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
  ]).then(([appMod, authMod, fsMod]) => {
    fb = { ...authMod, ...fsMod };
    app = appMod.initializeApp(FIREBASE_CONFIG);
    try { db = fsMod.initializeFirestore(app, { experimentalForceLongPolling: true, localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentSingleTabManager({ forceOwnership: true }) }) }); }
    catch { try { db = fsMod.initializeFirestore(app, { experimentalForceLongPolling: true, localCache: fsMod.memoryLocalCache() }); } catch { db = fsMod.getFirestore(app); } }
    auth = authMod.getAuth(app);
    return fb;
  }).catch((err) => { fbPromise = null; throw err; });
  return fbPromise;
}

export const getFb = () => ({ app, db, auth, fb });

export async function requireAuth() {
  if (state.user && state.workspaceId && db && fb) return true;
  await ensureFirebase();
  await Promise.race([authReadyPromise, new Promise((r) => setTimeout(r, 4000))]);
  if (!state.user || !state.workspaceId) { toast('Still connecting — try again in a moment.', 'info'); throw new Error('Auth not ready'); }
  return true;
}

export const detachListeners = () => {
  clearTimeout(snapTimer);
  unsubUser?.(); unsubWs?.(); unsubTx?.();
  unsubUser = unsubWs = unsubTx = null;
  activeSubscribedWsId = '';
};

// --- OFFLINE-SAFE WRITE SETTLER ---
// Firestore persists mutations locally right away, then waits for server ACK before resolving.
// Racing against a short offline/slow-network window prevents modals from hanging on "Saving...",
// and restores "Live Synced" status as soon as the delayed server ACK finishes.
function settleWrite(promise, errLabel = 'Could not sync changes') {
  let done = false;
  let timedOut = false;
  const tracked = promise.then(
    () => {
      if (timedOut) updateSyncUI('synced');
      done = true;
      return { queued: false };
    },
    (err) => {
      if (done) {
        toast(`${errLabel}: ${err?.code || 'check connection'}`, 'error');
        return { queued: false, error: err };
      }
      done = true;
      throw err;
    }
  );
  const waitMs = navigator.onLine === false ? 80 : 2500;
  return Promise.race([
    tracked,
    new Promise((resolve) => setTimeout(() => {
      if (!done) {
        done = true;
        timedOut = true;
        updateSyncUI('offline');
        resolve({ queued: true });
      }
    }, waitMs))
  ]);
}

// --- CRUD ---
export async function saveUserProfile(extra = {}) {
  try {
    localStorage.setItem('df_dark', state.darkMode ? '1' : '0');
    localStorage.setItem('df_privacy', state.privacyMode ? '1' : '0');
    localStorage.setItem('df_active_person', state.activePerson || 'person1');
    if (state.workspaceId) localStorage.setItem('df_active_ws', state.workspaceId);
    else localStorage.removeItem('df_active_ws');
    if (state.user?.uid) localStorage.setItem('df_last_uid', state.user.uid);
    localStorage.setItem('df_user_ws', JSON.stringify(state.userWorkspaces || []));
  } catch {}
  if (!state.user || !db || !fb) return;
  try {
    await settleWrite(fb.setDoc(fb.doc(db, 'delights_flow_users', state.user.uid), {
      email: state.user.email || '', displayName: state.user.displayName || '',
      activeWorkspaceId: state.workspaceId, workspaces: state.userWorkspaces,
      activePerson: state.activePerson, darkMode: state.darkMode, privacyMode: state.privacyMode,
      updatedAt: Date.now(), ...extra
    }, { merge: true }), 'Could not save profile');
  } catch {}
}

export async function patchWs(patch) {
  await requireAuth();
  await settleWrite(
    fb.updateDoc(fb.doc(db, 'delights_flow_workspaces', state.workspaceId), { ...patch, updatedAt: Date.now() }),
    'Could not save workspace settings'
  );
}

export async function saveTx(payload, editId = null) {
  await requireAuth();
  const col = fb.collection(db, 'delights_flow_workspaces', state.workspaceId, 'transactions');
  if (editId) {
    await settleWrite(
      fb.updateDoc(fb.doc(col, editId), { ...payload, updatedAt: Date.now() }),
      'Could not update entry'
    );
    return { id: editId, ...payload };
  }
  // Pre-generate document ID so receipt modals and local updates work immediately even offline
  const ref = fb.doc(col);
  const fullDoc = { ...payload, createdByUid: state.user.uid, createdAt: Date.now() };
  await settleWrite(fb.setDoc(ref, fullDoc), 'Could not save entry');
  return { id: ref.id, ...fullDoc };
}

export async function batchSaveTxs(items) {
  await requireAuth();
  if (!Array.isArray(items) || !items.length) return 0;
  const col = fb.collection(db, 'delights_flow_workspaces', state.workspaceId, 'transactions');
  const CHUNK = 450;
  let saved = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = fb.writeBatch(db);
    const slice = items.slice(i, i + CHUNK);
    const now = Date.now();
    slice.forEach((item, idx) => {
      const ref = fb.doc(col);
      batch.set(ref, { ...item, createdByUid: state.user.uid, createdAt: item.createdAt || (now + idx) });
    });
    await settleWrite(batch.commit(), 'Could not restore backup entries');
    saved += slice.length;
  }
  return saved;
}

export async function delTx(id) {
  await requireAuth();
  await settleWrite(
    fb.deleteDoc(fb.doc(db, 'delights_flow_workspaces', state.workspaceId, 'transactions', id)),
    'Could not delete entry'
  );
}

// --- AUTH (DIRECT GIS + EMAIL/PASSWORD) & WORKSPACE SYNC ---
export const authErrMsg = (e) => {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Incorrect email or password.';
  if (c.includes('email-already-in-use')) return 'Account already exists. Try Sign In.';
  if (c.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (c.includes('unauthorized-domain')) return 'Add your GitHub domain in Firebase Authorized Domains.';
  return c.includes('popup-closed') ? 'Sign-in cancelled.' : (e?.message || 'Authentication failed.');
};

export async function renderGoogleBtn() {
  const wrap = $('google-gis-btn'), load = $('google-gis-loading'), fallbackBtn = $('google-signin-btn');
  if (!wrap) return;
  const ok = await ensureGis();
  if (ok && GOOGLE_CLIENT_ID) {
    try {
      if (!gisReady) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, auto_select: false, cancel_on_tap_outside: true,
          callback: async (res) => {
            $('auth-error-box')?.classList.add('hidden');
            if (!res?.credential) return;
            try {
              toast('Signing in with Google...', 'info');
              await ensureFirebase();
              await fb.signInWithCredential(auth, fb.GoogleAuthProvider.credential(res.credential));
            } catch (err) {
              const box = $('auth-error-box');
              if (box) { box.textContent = authErrMsg(err); box.classList.remove('hidden'); }
            }
          }
        });
        gisReady = true;
      }
      wrap.innerHTML = '';
      window.google.accounts.id.renderButton(wrap, {
        type: 'standard', theme: state.darkMode ? 'filled_black' : 'outline',
        size: 'large', text: 'continue_with', shape: 'pill',
        width: Math.max(220, Math.min(360, Math.floor(wrap.parentElement?.clientWidth || 320)))
      });
      load?.classList.add('hidden'); fallbackBtn?.classList.add('hidden');
      return;
    } catch {}
  }
  load?.classList.add('hidden'); fallbackBtn?.classList.remove('hidden');
}

export const openOnboarding = (allowBack = false) => {
  $('ws-user-email').textContent = state.user?.email || '';
  $('ws-back-btn').classList.toggle('hidden', !allowBack);
  $('ws-create-pin').value = String(Math.floor(100000 + Math.random() * 900000));
  $('ws-create-error').classList.add('hidden'); $('ws-join-error').classList.add('hidden');
  showScreen('workspace');
};

export const doSignOut = async () => {
  detachListeners(); clearSnaps();
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
  if (auth && fb) await fb.signOut(auth);
  else showScreen('auth');
};

export function subscribeWs(wsId) {
  if (!wsId || !state.user || !db || !fb) return;
  const switching = activeSubscribedWsId !== wsId && loadedSnapWsId !== wsId;
  clearTimeout(snapTimer);
  unsubWs?.(); unsubTx?.();
  state.workspaceId = wsId;

  // Prevent stale rows/filters from a previous workspace leaking into the newly selected ledger
  if (switching) {
    state.transactions = [];
    state.filters.wallet = 'all';
    state.walletFilterActive = false;
    state.shopFilters.category = 'all';
    state.shopFilters.type = 'all';
    state.shopFilterActive = false;
    state.shopAnalyticsShopId = 'all';
    loadSnap(wsId);
  }
  activeSubscribedWsId = wsId;

  try { localStorage.setItem('df_active_ws', wsId); localStorage.setItem('df_last_uid', state.user.uid); } catch {}
  showScreen('app'); updateSyncUI('connecting'); scheduleRender();

  unsubWs = fb.onSnapshot(fb.doc(db, 'delights_flow_workspaces', wsId), (s) => {
    if (state.workspaceId !== wsId) return;
    if (!s.exists()) {
      if (!s.metadata.fromCache) {
        try { localStorage.removeItem('df_active_ws'); localStorage.removeItem(`df_snap_${wsId}`); } catch {}
        state.userWorkspaces = state.userWorkspaces.filter((w) => w.id !== wsId);
        const nextWsId = state.userWorkspaces[0]?.id || '';
        state.workspaceId = nextWsId;
        activeSubscribedWsId = '';
        saveUserProfile({ activeWorkspaceId: nextWsId });
        if (nextWsId) subscribeWs(nextWsId);
        else openOnboarding(false);
      }
      return;
    }
    const d = s.data(), wallets = d.wallets?.length ? d.wallets : STARTER_WALLETS.map((w) => ({ ...w })), ob = { ...(d.openingBalances || {}) };
    wallets.forEach((w) => { if (ob[w.id] === undefined) ob[w.id] = 0; });
    state.workspace = {
      ...state.workspace, ...d, name: d.name || 'My Ledger', joinPin: d.joinPin || '', wallets,
      archivedWalletNames: d.archivedWalletNames || {}, openingBalances: ob,
      userNames: { person1: d.userNames?.person1 || 'Person 1', person2: d.userNames?.person2 || 'Person 2' },
      userColors: {
        person1: COLOR_MAP[d.userColors?.person1] ? d.userColors.person1 : DEFAULT_PERSON_COLORS.person1,
        person2: COLOR_MAP[d.userColors?.person2] ? d.userColors.person2 : DEFAULT_PERSON_COLORS.person2
      },
      currency: d.currency || 'Ks',
      customExpenseCategories: d.customExpenseCategories || [], customIncomeCategories: d.customIncomeCategories || [],
      quickTemplates: d.quickTemplates || [],
      shopCategories: d.shopCategories?.length ? d.shopCategories : DEFAULT_SHOPS.map((c) => ({ ...c })),
      shopProfile: { name: d.shopProfile?.name || '', footer: d.shopProfile?.footer || 'Thank you for your purchase!', logoDataUrl: d.shopProfile?.logoDataUrl || '' }
    };
    const idx = state.userWorkspaces.findIndex((x) => x.id === wsId);
    if (idx >= 0) state.userWorkspaces[idx].name = state.workspace.name; else state.userWorkspaces.push({ id: wsId, name: state.workspace.name });
    saveSnap(wsId); updateSyncUI('synced'); scheduleRender();
  }, (e) => {
    if (e?.code === 'permission-denied') {
      // Remove inaccessible workspace from profile so reloads do not loop back into permission-denied
      try { localStorage.removeItem('df_active_ws'); localStorage.removeItem(`df_snap_${wsId}`); } catch {}
      unsubWs?.(); unsubTx?.(); unsubWs = unsubTx = null;
      state.userWorkspaces = state.userWorkspaces.filter((w) => w.id !== wsId);
      const nextWsId = state.userWorkspaces[0]?.id || '';
      state.workspaceId = nextWsId;
      activeSubscribedWsId = '';
      saveUserProfile({ activeWorkspaceId: nextWsId });
      if (nextWsId) {
        toast('Switched to an available ledger.', 'info');
        subscribeWs(nextWsId);
      } else {
        openOnboarding(false);
      }
      return;
    }
    updateSyncUI('offline');
  });

  unsubTx = fb.onSnapshot(fb.collection(db, 'delights_flow_workspaces', wsId, 'transactions'), (qs) => {
    if (state.workspaceId !== wsId) return;
    const list = []; qs.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
    state.transactions = list;
    saveSnap(wsId); updateSyncUI('synced'); scheduleRender();
  }, () => updateSyncUI('offline'));
}

function bootSignedIn(user) {
  state.user = user;
  const emailEl = $('settings-account-email');
  if (emailEl) emailEl.textContent = user.email || 'Signed in';
  window.__dfSetLoadStatus?.('Loading workspace...');

  let cachedWs = '';
  try {
    const uid = localStorage.getItem('df_last_uid') || '', ws = localStorage.getItem('df_active_ws') || '';
    const sp = localStorage.getItem('df_active_person') || '';
    if (isActiveUser(sp)) state.activePerson = sp;
    if (ws && (!uid || uid === user.uid)) { cachedWs = ws; localStorage.setItem('df_last_uid', user.uid); }
  } catch {}

  if (cachedWs) subscribeWs(cachedWs);
  else fb.getDocFromCache(fb.doc(db, 'delights_flow_users', user.uid)).then((s) => {
    if (state.workspaceId || !s.exists()) return;
    const d = s.data(); state.userWorkspaces = Array.isArray(d.workspaces) ? d.workspaces : [];
    const wsId = d.activeWorkspaceId || state.userWorkspaces[0]?.id || '';
    if (wsId) subscribeWs(wsId);
  }).catch(() => {});

  unsubUser?.();
  let resolved = Boolean(cachedWs);
  const timer = setTimeout(() => {
    if (resolved || state.workspaceId) return;
    window.__dfSetLoadStatus?.('Still connecting...', 'Checking saved ledger...', true);
    fb.getDoc(fb.doc(db, 'delights_flow_users', user.uid)).then((s) => {
      if (resolved || state.workspaceId) return;
      resolved = true;
      const wsId = s.exists() ? (s.data().activeWorkspaceId || s.data().workspaces?.[0]?.id || '') : '';
      wsId ? subscribeWs(wsId) : openOnboarding(false);
    }).catch((e) => { if (!resolved && !state.workspaceId) window.__dfSetLoadStatus?.('Could not load workspace.', e?.message || 'Tap Retry.', true); });
  }, 5000);

  unsubUser = fb.onSnapshot(fb.doc(db, 'delights_flow_users', user.uid), (s) => {
    if (s.exists()) {
      clearTimeout(timer); resolved = true;
      const d = s.data();
      state.userWorkspaces = Array.isArray(d.workspaces) ? d.workspaces : [];
      if (isActiveUser(d.activePerson)) {
        state.activePerson = d.activePerson;
        try { localStorage.setItem('df_active_person', d.activePerson); } catch {}
      }
      if (typeof d.darkMode === 'boolean' && d.darkMode !== state.darkMode) {
        state.darkMode = d.darkMode;
        try { localStorage.setItem('df_dark', d.darkMode ? '1' : '0'); } catch {}
        applyTheme();
      }
      if (typeof d.privacyMode === 'boolean' && d.privacyMode !== state.privacyMode) {
        state.privacyMode = d.privacyMode;
        try { localStorage.setItem('df_privacy', d.privacyMode ? '1' : '0'); } catch {}
        applyPrivacy();
      }
      const wsId = d.activeWorkspaceId || state.userWorkspaces[0]?.id || '';
      if (wsId) { if (wsId !== state.workspaceId || !unsubWs) subscribeWs(wsId); else scheduleRender(); }
      else if (!state.workspaceId) openOnboarding(false);
    } else if (!s.metadata.fromCache) { clearTimeout(timer); resolved = true; if (!state.workspaceId) openOnboarding(false); }
  }, (e) => { clearTimeout(timer); if (!resolved && !state.workspaceId) window.__dfSetLoadStatus?.('Sync error.', e?.message || 'Tap Retry.', true); });
}

export function startFirebaseBackground() {
  let authDone = false;
  const t = setTimeout(() => { if (!authDone && !$('loading-screen')?.classList.contains('hidden')) window.__dfSetLoadStatus?.('Sign-in check is slow.', 'Tap Retry or Sign In.', true); }, 5000);
  ensureFirebase().then(() => {
    fb.onAuthStateChanged(auth, (user) => {
      authDone = true; clearTimeout(t);
      if (user) { resolveAuthReady?.(user); bootSignedIn(user); }
      else { detachListeners(); clearSnaps(); state.user = null; state.workspaceId = ''; state.transactions = []; showScreen('auth'); }
    });
  }).catch((err) => {
    authDone = true; clearTimeout(t);
    if (!$('loading-screen')?.classList.contains('hidden')) window.__dfSetLoadStatus?.('Could not connect to Firebase.', err?.message || 'Tap Retry.', true);
    updateSyncUI('offline');
  });
}

// --- GESTURE-BACKED SPA BACK NAVIGATION (NO EXIT SCREEN) ---
// Each modal open and non-overview view pushes a real user-activated history entry.
// Back closes the top modal first, then returns to Overview; pressing Back on Overview exits natively.
export function setupBackGuard() {
  try {
    if (!history.state?.dfBase && !history.state?.dfView && !history.state?.dfModal) {
      history.replaceState({ dfBase: true }, '', cleanUrl());
    }
  } catch {}

  // Track modal visibility changes to keep history entries synchronized with open modals
  const modalVisible = new Map();
  MODAL_IDS.forEach((id) => {
    const el = $(id);
    if (el) modalVisible.set(id, !el.classList.contains('hidden'));
  });

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      const opened = [];
      const closed = [];
      const seen = new Set();

      mutations.forEach((m) => {
        const id = m.target?.id;
        if (!id || seen.has(id)) return;
        seen.add(id);
        const nowOpen = !m.target.classList.contains('hidden');
        const wasOpen = modalVisible.get(id) || false;
        if (nowOpen === wasOpen) return;
        modalVisible.set(id, nowOpen);
        if (nowOpen) opened.push(id);
        else closed.push(id);
      });

      if (!opened.length && !closed.length) return;
      try {
        const topId = history.state?.dfModal;
        if (opened.length && closed.length && closed.includes(topId)) {
          // Modal swapped directly (e.g. tx-modal -> confirm-modal)
          history.replaceState({ dfModal: opened[opened.length - 1] }, '', cleanUrl());
        } else if (opened.length) {
          opened.forEach((id) => {
            if (history.state?.dfModal !== id) history.pushState({ dfModal: id }, '', cleanUrl());
          });
        } else if (closed.length && !isPoppingModal && closed.includes(topId)) {
          // Modal closed via X / Cancel / Save: pop its history entry so Back stays clean
          ignoreNextPop = true;
          history.back();
        }
      } catch {}
    });

    MODAL_IDS.forEach((id) => {
      const el = $(id);
      if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTopModal();
  });

  window.addEventListener('popstate', () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    if (hasOpenModal()) {
      isPoppingModal = true;
      closeTopModal();
      setTimeout(() => { isPoppingModal = false; }, 0);
      return;
    }
    if (!$('app-shell')?.classList.contains('hidden') && state.currentView !== 'overview') {
      switchView('overview', { fromPopstate: true });
    }
  });
}

// --- AUTO-UPDATE SERVICE WORKER REGISTRATION ---
export function setupServiceWorkerUpdates() {
  if (!('serviceWorker' in navigator) || (location.protocol !== 'https:' && location.hostname !== 'localhost')) return;
  const bootTime = Date.now();
  // Snapshot controller BEFORE register() so first-ever install never triggers a false update reload/toast
  const hadController = Boolean(navigator.serviceWorker.controller);
  let notified = false;

  const triggerUpdate = () => {
    if (notified) return;
    notified = true;
    const lastAuto = Number(sessionStorage.getItem('df_last_auto_reload') || 0);
    if (Date.now() - bootTime < 5000 && !hasOpenModal() && Date.now() - lastAuto > 15000) {
      sessionStorage.setItem('df_last_auto_reload', String(Date.now()));
      location.reload();
      return;
    }
    toast('New update ready', 'info', { label: 'Update Now', sticky: true, onClick: () => location.reload() });
  };

  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'DF_UPDATE_READY') triggerUpdate();
  });

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'activated' && hadController) triggerUpdate();
      });
    });
  }).catch(() => {});
}

// --- CORE EVENT BINDINGS ---
export function bindCoreEvents() {
  const setAuth = (m) => {
    state.authMode = m;
    $('auth-tab-signin').className = m === 'signin' ? 'py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'py-2 rounded-xl text-xs font-bold text-slate-500';
    $('auth-tab-signup').className = m === 'signup' ? 'py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'py-2 rounded-xl text-xs font-bold text-slate-500';
    $('auth-name-wrap').classList.toggle('hidden', m !== 'signup');
    $('auth-forgot-btn').classList.toggle('hidden', m !== 'signin');
    $('auth-submit-btn').textContent = m === 'signup' ? 'Create Account' : 'Sign In';
    $('auth-error-box').classList.add('hidden');
  };
  $('auth-tab-signin').onclick = () => setAuth('signin');
  $('auth-tab-signup').onclick = () => setAuth('signup');
  $('loading-signin-btn').onclick = () => showScreen('auth');
  $('google-signin-btn').onclick = async () => {
    $('auth-error-box').classList.add('hidden');
    try { await ensureFirebase(); await fb.signInWithPopup(auth, new fb.GoogleAuthProvider()); }
    catch (e) { $('auth-error-box').textContent = authErrMsg(e); $('auth-error-box').classList.remove('hidden'); }
  };
  $('auth-email-form').onsubmit = async (e) => {
    e.preventDefault(); const err = $('auth-error-box'), btn = $('auth-submit-btn'); err.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Please wait...';
    try {
      await ensureFirebase();
      const email = $('auth-email').value.trim(), pass = $('auth-password').value, name = $('auth-name').value.trim();
      if (state.authMode === 'signup') { const c = await fb.createUserWithEmailAndPassword(auth, email, pass); if (name) await fb.updateProfile(c.user, { displayName: name }); }
      else await fb.signInWithEmailAndPassword(auth, email, pass);
    } catch (ex) { err.textContent = authErrMsg(ex); err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = state.authMode === 'signup' ? 'Create Account' : 'Sign In'; }
  };
  $('auth-forgot-btn').onclick = async () => {
    const email = $('auth-email').value.trim();
    if (!email) { $('auth-error-box').textContent = 'Enter your email first.'; $('auth-error-box').classList.remove('hidden'); return; }
    try { await ensureFirebase(); await fb.sendPasswordResetEmail(auth, email); toast('Password reset email sent!', 'success'); }
    catch (e) { $('auth-error-box').textContent = authErrMsg(e); $('auth-error-box').classList.remove('hidden'); }
  };

  $('ws-tab-create').onclick = () => { $('ws-create-form').classList.remove('hidden'); $('ws-join-form').classList.add('hidden'); $('ws-tab-create').className = 'py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'; $('ws-tab-join').className = 'py-2 rounded-xl text-xs font-bold text-slate-500'; };
  $('ws-tab-join').onclick = () => { $('ws-join-form').classList.remove('hidden'); $('ws-create-form').classList.add('hidden'); $('ws-tab-join').className = 'py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'; $('ws-tab-create').className = 'py-2 rounded-xl text-xs font-bold text-slate-500'; };
  $('ws-back-btn').onclick = () => showScreen('app');

  $('ws-create-form').onsubmit = async (e) => {
    e.preventDefault(); const err = $('ws-create-error'), btn = $('ws-create-btn'); err.classList.add('hidden');
    const name = $('ws-create-name').value.trim() || 'My Ledger', currency = $('ws-create-currency').value.trim() || 'Ks', pin = $('ws-create-pin').value.trim();
    if (pin.length < 4) { err.textContent = 'Join PIN must be at least 4 characters.'; err.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      await ensureFirebase();
      const wsId = `df-${Math.random().toString(36).slice(2, 10)}`, p1 = state.user.displayName?.split(' ')[0] || 'Person 1';
      await fb.setDoc(fb.doc(db, 'delights_flow_workspaces', wsId), {
        ownerUid: state.user.uid, memberUids: [state.user.uid], joinPin: pin, name, currency,
        wallets: STARTER_WALLETS.map((w) => ({ ...w })), archivedWalletNames: {}, openingBalances: { cash: 0, bank: 0 },
        userNames: { person1: p1, person2: 'Person 2' }, userColors: { ...DEFAULT_PERSON_COLORS },
        customExpenseCategories: [], customIncomeCategories: [], quickTemplates: [],
        shopCategories: DEFAULT_SHOPS.map((c) => ({ ...c })), shopProfile: { name: '', footer: 'Thank you for your purchase!', logoDataUrl: '' },
        createdAt: Date.now(), updatedAt: Date.now()
      });
      state.userWorkspaces.push({ id: wsId, name }); state.workspaceId = wsId;
      await saveUserProfile(); subscribeWs(wsId); toast('Private ledger created!', 'success');
    } catch (ex) { err.textContent = ex?.message || 'Could not create ledger.'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Create Private Ledger'; }
  };

  $('ws-join-form').onsubmit = async (e) => {
    e.preventDefault(); const err = $('ws-join-error'), btn = $('ws-join-btn'); err.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Joining...';
    try {
      await ensureFirebase();
      const wsId = $('ws-join-id').value.trim().toLowerCase(), pin = $('ws-join-pin').value.trim();
      await fb.updateDoc(fb.doc(db, 'delights_flow_workspaces', wsId), { memberUids: fb.arrayUnion(state.user.uid), lastJoinPinAttempt: pin, updatedAt: Date.now() });
      const snap = await fb.getDoc(fb.doc(db, 'delights_flow_workspaces', wsId)), wn = snap.exists() ? (snap.data().name || 'Shared Ledger') : 'Shared Ledger';
      if (!state.userWorkspaces.some((w) => w.id === wsId)) state.userWorkspaces.push({ id: wsId, name: wn });
      state.workspaceId = wsId; await saveUserProfile(); subscribeWs(wsId); toast(`Joined "${wn}"!`, 'success');
    } catch { err.textContent = 'Invalid Workspace ID or Join PIN.'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = 'Join Shared Ledger'; }
  };

  $('ws-signout-btn').onclick = doSignOut;
  $('settings-signout-btn').onclick = () => { $('settings-modal').classList.add('hidden'); doSignOut(); };

  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.nav)));
  const togTheme = () => { state.darkMode = !state.darkMode; applyTheme(); saveUserProfile(); };
  $('desktop-theme-btn').onclick = togTheme; $('mobile-theme-btn').onclick = togTheme;
  const togPriv = () => { state.privacyMode = !state.privacyMode; applyPrivacy(); saveUserProfile(); scheduleRender(); };
  if ($('hero-privacy-btn')) $('hero-privacy-btn').onclick = togPriv;

  document.querySelectorAll('.quick-person-btn').forEach((b) => b.addEventListener('click', () => { state.activePerson = b.dataset.quickPerson; scheduleRender(); saveUserProfile(); }));
  $('mobile-person-pill').onclick = () => { state.activePerson = state.activePerson === 'person1' ? 'person2' : 'person1'; scheduleRender(); saveUserProfile(); };

  $('confirm-cancel-btn').onclick = () => $('confirm-modal').classList.add('hidden');
  $('confirm-ok-btn').onclick = async () => { const cb = state.confirmCallback; $('confirm-modal').classList.add('hidden'); if (cb) await cb(); };

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('pwa-install-card')?.classList.remove('hidden'); });
  $('pwa-install-btn')?.addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('pwa-install-card')?.classList.add('hidden'); });
  window.addEventListener('online', () => updateSyncUI(db && state.user ? 'synced' : 'connecting'));
  window.addEventListener('offline', () => updateSyncUI('offline'));
}