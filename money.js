// money.js
import { 
  UI_ICONS, W_ICONS, COLORS, COLOR_MAP, STARTER_WALLETS, EXP_CATS, INC_CATS, PALETTE,
  setRenderMoney, ensureFirebase, patchWs, saveTx, delTx, saveUserProfile, switchMode, openShopTxDeepLink,
  subscribeWs, computeBalances, saveSnap, toast, copyText, downloadBlob, openConfirm, applyTheme, applyPrivacy,
  $, esc, fmtNum, fmtMoney, fmtDisp, fmtCompact, parseAmt, parseSigned, fmtMonth, fmtDateHead, todayISO, curMonth,
  getWallets, getWallet, getCats, catIcon, personName, getOwner, scheduleRender 
} from './core.js';

let st = null;
let D = null;
let calMode = false;

export function initMoney(sharedState, domElements) {
  st = sharedState;
  D = domElements;
  setRenderMoney(renderMoney);

  // Nav Handlers
  const navs = [
    { el: $('nav-money-links').children[0], v: 'overview' },
    { el: $('nav-money-links').children[1], v: 'shop', shop: true },
    { el: $('nav-money-links').children[2], v: 'analytics' },
    { el: $('nav-money-links').children[3], v: 'history' },
    { el: $('nav-money-links').children[4], v: 'settings' },
    { el: D.mobNMoney.children[0], v: 'overview' },
    { el: D.mobNMoney.children[1], v: 'shop', shop: true },
    { el: D.mobNMoney.children[3], v: 'analytics' },
    { el: D.mobNMoney.children[4], v: 'history' },
  ];

  navs.forEach(n => {
    n.el.onclick = (e) => {
      e.preventDefault();
      if (n.shop) { switchMode('shop', 'home'); return; }
      if (n.v === 'settings') { openSettings(); return; }
      if (n.v === 'history') { 
        st.filters.mWallet = 'all'; st.filters.mMonth = curMonth(); 
      }
      st.moneyView = n.v;
      switchMode('money', n.v);
    };
  });

  // Floating Action Button & Sidebar Action
  const openTx = () => openTxModal();
  D.mobNMoney.children[2].onclick = openTx;
  D.sideMActions.children[0].onclick = openTx;

  // Header Actions
  const hBtns = document.querySelector('header').children[1].children;
  hBtns[0].onclick = () => { applyPrivacy(!st.privacyMode); };
  hBtns[1].onclick = () => { applyTheme(!st.darkMode); };
  hBtns[2].onclick = openSettings;

  // History Toggles & Filters
  const hToggles = D.vMHistory.querySelector('.flex.gap-2').children;
  hToggles[0].onclick = () => { calMode = false; scheduleRender(); };
  hToggles[1].onclick = () => { calMode = true; scheduleRender(); };
  
  const hFilters = D.vMHistory.querySelectorAll('select, input');
  hFilters.forEach(f => f.onchange = (e) => {
    if (f.placeholder === 'Search...') st.filters.mSearch = e.target.value.toLowerCase();
    else if (f.options[0].text === 'This Month') st.filters.mMonth = e.target.value;
    else if (f.options[0].text === 'All Wallets') st.filters.mWallet = e.target.value;
    else if (f.options[0].text === 'All Types') st.filters.mType = e.target.value;
    else if (f.options[0].text === 'All Owners') st.filters.mOwner = e.target.value;
    else if (f.options[0].text === 'All Scope') st.filters.mScope = e.target.value;
    scheduleRender();
  });
  hFilters[0].onkeyup = (e) => { st.filters.mSearch = e.target.value.toLowerCase(); scheduleRender(); };

  D.vMHistory.querySelector('button.bg-gray-100').onclick = exportCSV;

  // Analytics Filters
  const aFilters = D.vMAnalytics.querySelectorAll('select');
  aFilters[0].onchange = (e) => { st.filters.mScope = e.target.value; scheduleRender(); };
  aFilters[1].onchange = (e) => { st.filters.mMonth = e.target.value; scheduleRender(); };

  // Global events
  window.goToWalletHistory = (wId) => {
    st.filters.mWallet = wId; st.filters.mMonth = 'all';
    st.moneyView = 'history'; switchMode('money', 'history');
  };
  window.openMTx = (id) => openTxModal(st.transactions.find(t => t.id === id));
  window.applyMTemplate = (id) => {
    const tmpl = (st.workspace?.templates || []).find(t => t.id === id);
    if (!tmpl) return;
    const tx = { ...tmpl, id: undefined, date: todayISO() };
    saveTx(tx); toast('Logged from template', 'success');
  };
  window.openTemplates = openTemplatesModal;

  scheduleRender();
}

export function renderMoney() {
  if (st.mode !== 'money') return;
  if (st.moneyView === 'overview') renderOverview();
  else if (st.moneyView === 'history') renderHistory();
  else if (st.moneyView === 'analytics') renderAnalytics();
}

function renderOverview() {
  const month = curMonth();
  const txs = st.transactions;
  const wallets = getWallets();
  
  let netBal = wallets.reduce((sum, w) => sum + (st.balances.wallets[w.id] || 0), 0);
  let inc = 0, exp = 0;

  txs.filter(t => t.date.startsWith(month)).forEach(t => {
    if (t.type === 'income') inc += t.amt;
    else if (t.type === 'expense') exp += t.amt;
    else if (t.type === 'shop_sale') inc += (t.total * ((getShopSplit(t.sId)?.[st.activePerson] || 50) / 100));
    else if (t.type === 'shop_cap' || t.type === 'shop_cost') exp += (t.total * ((getShopSplit(t.sId)?.[st.activePerson] || 50) / 100));
  });

  const hero = D.vMOverview.children[0];
  hero.querySelector('h2').innerText = fmtMoney(netBal, st.workspace?.currency || '$');
  const hGrid = hero.querySelector('.grid').children;
  hGrid[0].children[1].innerText = fmtMoney(inc, st.workspace?.currency || '$', 0);
  hGrid[1].children[1].innerText = fmtMoney(exp, st.workspace?.currency || '$', 0);
  hGrid[2].children[1].innerText = fmtMoney(inc - exp, st.workspace?.currency || '$', 0);

  const wGrid = D.vMOverview.querySelectorAll('.grid')[1];
  wGrid.innerHTML = wallets.map(w => `
    <div onclick="goToWalletHistory('${w.id}')" class="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm cursor-pointer hover:ring-2 ring-brand/50 transition-all border-l-4" style="border-left-color: ${w.color || '#3b82f6'}">
      <div class="text-xl mb-2">${w.icon || '💼'}</div>
      <div class="text-sm text-gray-500 font-medium truncate">${esc(w.name)}</div>
      <div class="text-lg font-bold truncate">${fmtMoney(st.balances.wallets[w.id] || 0, st.workspace?.currency || '$', 0)}</div>
    </div>
  `).join('');

  const tGrid = D.vMOverview.querySelectorAll('.grid')[2];
  const tmpls = st.workspace?.templates || [];
  tGrid.innerHTML = tmpls.slice(0, 7).map(t => `
    <button onclick="applyMTemplate('${t.id}')" class="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-lg">${catIcon(t.cat, t.type)}</span>
        <span class="text-xs font-medium text-gray-500 truncate">${t.type==='income'?'Inc':'Exp'}</span>
      </div>
      <div class="font-bold text-sm truncate">${esc(t.note || t.catName || 'Template')}</div>
      <div class="${t.type==='income'?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400'} font-bold">${fmtMoney(t.amt, st.workspace?.currency || '$')}</div>
    </button>
  `).join('') + (tmpls.length > 0 ? `
    <button onclick="openTemplates()" class="bg-brand/5 p-3 rounded-xl border border-brand/20 flex flex-col items-center justify-center text-brand font-medium hover:bg-brand/10">
      <span class="text-xl mb-1">⚙️</span><span class="text-xs">Manage</span>
    </button>
  ` : `<div class="col-span-2 md:col-span-4 text-sm text-gray-500 bg-white dark:bg-gray-900 p-4 rounded-xl text-center">Save common transactions as templates for 1-tap logging.</div>`);

  const rList = D.vMOverview.querySelector('.space-y-2');
  rList.innerHTML = txs.slice(0, 8).map(t => txRowHtml(t)).join('') || `<div class="text-center text-gray-500 py-4">No recent activity</div>`;
  
  D.vMOverview.querySelector('button.text-brand').onclick = () => {
    st.filters.mWallet = 'all'; st.filters.mMonth = 'all';
    st.moneyView = 'history'; switchMode('money', 'history');
  };
}

function txRowHtml(t, showDate = false) {
  const isShop = t.type.startsWith('shop_');
  const amt = isShop ? t.total : t.amt;
  const isInc = t.type === 'income' || t.type === 'shop_sale';
  const isTfr = t.type === 'transfer';
  const wName = getWallet(t.wId).name;
  
  return `
    <div onclick="${isShop ? `openShopTxDeepLink('${t.id}')` : `openMTx('${t.id}')`}" class="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gray-100 dark:bg-gray-800 shrink-0">
          ${catIcon(t.cat, t.type)}
        </div>
        <div class="truncate">
          <div class="font-bold text-sm truncate flex items-center gap-2">
            ${esc(t.note || (isShop ? 'Shop Record' : t.catName || 'Transaction'))}
            ${isShop ? `<span class="text-[10px] bg-shop/10 text-shop px-1.5 py-0.5 rounded font-bold">🛍️ Shop ↗</span>` : ''}
          </div>
          <div class="text-xs text-gray-500 truncate">
            ${showDate ? t.date + ' • ' : ''}${isTfr ? `${wName} ➔ ${getWallet(t.wTo).name}` : wName} • ${t.owner === 'shared' ? UI_ICONS.Shared : (t.owner === 'p2' ? UI_ICONS.P2 : UI_ICONS.P1)}
          </div>
        </div>
      </div>
      <div class="font-bold ${isTfr ? 'text-gray-600 dark:text-gray-400' : (isInc ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} shrink-0">
        ${isTfr ? '' : (isInc ? '+' : '-')}${fmtMoney(amt, st.workspace?.currency || '$')}
      </div>
    </div>
  `;
}

function renderHistory() {
  const f = st.filters;
  let filtered = st.transactions.filter(t => {
    if (f.mMonth !== 'all' && !t.date.startsWith(f.mMonth)) return false;
    if (f.mType !== 'all') {
      if (f.mType === 'income' && t.type !== 'income' && t.type !== 'shop_sale') return false;
      if (f.mType === 'expense' && t.type !== 'expense' && t.type !== 'shop_cost' && t.type !== 'shop_cap') return false;
      if (f.mType === 'transfer' && t.type !== 'transfer') return false;
    }
    if (f.mWallet !== 'all' && t.wId !== f.mWallet && t.wTo !== f.mWallet && t.codWId !== f.mWallet) return false;
    if (f.mOwner !== 'all') {
      if (f.mOwner === 'shop' && !t.type.startsWith('shop_')) return false;
      if (f.mOwner !== 'shop' && t.type.startsWith('shop_')) return false; // shop txs don't have explicit owner prop
      if (f.mOwner !== 'shop' && t.owner !== f.mOwner && (t.owner || 'p1') !== f.mOwner) return false;
    }
    if (f.mScope === 'personal' && t.type.startsWith('shop_')) return false;
    if (f.mScope === 'shop' && !t.type.startsWith('shop_')) return false;
    
    if (f.mSearch) {
      const q = f.mSearch;
      if (!((t.note||'').toLowerCase().includes(q) || (t.catName||'').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const selects = D.vMHistory.querySelectorAll('select');
  selects[0].innerHTML = `<option value="all">All Months</option>` + Array.from(new Set(st.transactions.map(t => t.date.substring(0,7)))).map(m => `<option value="${m}" ${f.mMonth === m ? 'selected' : ''}>${fmtMonth(m)}</option>`).join('');
  selects[1].innerHTML = `<option value="all">All Wallets</option>` + getWallets().map(w => `<option value="${w.id}" ${f.mWallet === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
  selects[2].innerHTML = `<option value="all">All Types</option><option value="income" ${f.mType==='income'?'selected':''}>Income</option><option value="expense" ${f.mType==='expense'?'selected':''}>Expense</option><option value="transfer" ${f.mType==='transfer'?'selected':''}>Transfer</option>`;
  selects[3].innerHTML = `<option value="all">All Owners</option><option value="p1" ${f.mOwner==='p1'?'selected':''}>${personName('p1')}</option><option value="p2" ${f.mOwner==='p2'?'selected':''}>${personName('p2')}</option><option value="shared" ${f.mOwner==='shared'?'selected':''}>Shared</option><option value="shop" ${f.mOwner==='shop'?'selected':''}>Shop</option>`;
  selects[4].innerHTML = `<option value="all">Personal + Shop</option><option value="personal" ${f.mScope==='personal'?'selected':''}>Personal Only</option><option value="shop" ${f.mScope==='shop'?'selected':''}>Shop Only</option>`;

  const hToggles = D.vMHistory.querySelector('.flex.gap-2').children;
  hToggles[0].className = `px-3 py-1 rounded-lg text-sm font-medium ${!calMode ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`;
  hToggles[1].className = `px-3 py-1 rounded-lg text-sm font-medium ${calMode ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`;

  const listC = D.vMHistory.querySelector('.space-y-3');

  if (calMode) {
    if (f.mMonth === 'all') { listC.innerHTML = `<div class="p-8 text-center text-gray-500">Please select a specific month to view calendar.</div>`; return; }
    
    const [y, m] = f.mMonth.split('-');
    const daysInM = new Date(y, m, 0).getDate();
    const firstDay = new Date(y, m - 1, 1).getDay();
    
    let dData = {};
    for(let i=1; i<=daysInM; i++) dData[i] = { i: 0, e: 0 };
    
    filtered.forEach(t => {
      const d = parseInt(t.date.split('-')[2]);
      if (dData[d]) {
        const amt = t.type.startsWith('shop_') ? t.total : t.amt;
        if (t.type === 'income' || t.type === 'shop_sale') dData[d].i += amt;
        else if (t.type === 'expense' || t.type === 'shop_cost' || t.type === 'shop_cap') dData[d].e += amt;
      }
    });

    let calHtml = `<div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 mb-2"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div><div class="grid grid-cols-7 gap-1">`;
    for(let i=0; i<firstDay; i++) calHtml += `<div></div>`;
    for(let i=1; i<=daysInM; i++) {
      const isT = todayISO() === `${y}-${m}-${i.toString().padStart(2,'0')}`;
      calHtml += `
        <div onclick="openDayList('${y}-${m}-${i.toString().padStart(2,'0')}')" class="aspect-square border border-gray-200 dark:border-gray-800 rounded-lg p-1 flex flex-col cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isT ? 'ring-2 ring-brand bg-brand/5' : ''}">
          <div class="text-xs font-bold ${isT ? 'text-brand' : ''}">${i}</div>
          <div class="flex-1 flex flex-col justify-end text-[9px] font-medium tracking-tighter">
            ${dData[i].i > 0 ? `<div class="text-green-600 truncate">+${fmtCompact(dData[i].i)}</div>` : ''}
            ${dData[i].e > 0 ? `<div class="text-red-600 truncate">-${fmtCompact(dData[i].e)}</div>` : ''}
          </div>
        </div>`;
    }
    calHtml += `</div>`;
    listC.innerHTML = calHtml;

    window.openDayList = (date) => {
      st.filters.mSearch = date; scheduleRender();
      calMode = false;
    };

  } else {
    // List Mode
    if (filtered.length === 0) { listC.innerHTML = `<div class="text-center py-8 text-gray-500">No transactions found.</div>`; return; }
    
    const grps = {};
    filtered.forEach(t => {
      if (!grps[t.date]) grps[t.date] = { txs: [], in: 0, out: 0 };
      grps[t.date].txs.push(t);
      const amt = t.type.startsWith('shop_') ? t.total : t.amt;
      if (t.type === 'income' || t.type === 'shop_sale') grps[t.date].in += amt;
      else if (t.type === 'expense' || t.type === 'shop_cost' || t.type === 'shop_cap') grps[t.date].out += amt;
    });

    listC.innerHTML = Object.keys(grps).sort((a,b)=>b.localeCompare(a)).map(d => `
      <div class="mb-4">
        <div class="flex justify-between items-center text-xs font-bold text-gray-500 mb-2 px-1 border-b border-gray-200 dark:border-gray-800 pb-1">
          <span>${fmtDateHead(d)}</span>
          <span class="flex gap-2">
            ${grps[d].in > 0 ? `<span class="text-green-600 dark:text-green-400">+${fmtMoney(grps[d].in, st.workspace?.currency || '$')}</span>` : ''}
            ${grps[d].out > 0 ? `<span class="text-red-600 dark:text-red-400">-${fmtMoney(grps[d].out, st.workspace?.currency || '$')}</span>` : ''}
          </span>
        </div>
        <div class="space-y-2">
          ${grps[d].txs.map(t => txRowHtml(t)).join('')}
        </div>
      </div>
    `).join('');
  }
}

function exportCSV() {
  const rows = [['Date', 'Type', 'Category/Shop', 'Amount', 'Wallet', 'ToWallet', 'Owner', 'Note']];
  st.transactions.forEach(t => {
    rows.push([
      t.date, t.type, esc(t.catName || t.sId || ''), t.type.startsWith('shop_') ? t.total : t.amt,
      getWallet(t.wId).name, t.wTo ? getWallet(t.wTo).name : '', t.owner || 'shop', esc(t.note || '')
    ]);
  });
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `DF_Money_${todayISO()}.csv`);
}

async function renderAnalytics() {
  const c = st.charts;
  const f = st.filters;
  
  const selects = D.vMAnalytics.querySelectorAll('select');
  selects[0].innerHTML = `<option value="all">Personal + Shop</option><option value="personal" ${f.mScope==='personal'?'selected':''}>Personal Only</option><option value="shop" ${f.mScope==='shop'?'selected':''}>Shop Only</option>`;
  selects[1].innerHTML = `<option value="all">All Time</option>` + Array.from(new Set(st.transactions.map(t => t.date.substring(0,7)))).map(m => `<option value="${m}" ${f.mMonth === m ? 'selected' : ''}>${fmtMonth(m)}</option>`).join('');

  let filtered = st.transactions;
  if (f.mMonth !== 'all') filtered = filtered.filter(t => t.date.startsWith(f.mMonth));
  if (f.mScope === 'personal') filtered = filtered.filter(t => !t.type.startsWith('shop_'));
  if (f.mScope === 'shop') filtered = filtered.filter(t => t.type.startsWith('shop_'));

  let inc = 0, exp = 0, oData = { p1: { i: 0, e: 0 }, p2: { i: 0, e: 0 }, shared: { i: 0, e: 0 } };
  let catExp = {};
  
  filtered.forEach(t => {
    let amt = t.type.startsWith('shop_') ? t.total : t.amt;
    let own = t.owner || 'shared';
    let isInc = t.type === 'income' || t.type === 'shop_sale';
    let isExp = t.type === 'expense' || t.type === 'shop_cost' || t.type === 'shop_cap';
    
    if (t.type.startsWith('shop_')) {
      const sp = getShopSplit(t.sId);
      if (isInc) { inc += amt; oData.p1.i += amt * (sp.p1/100); oData.p2.i += amt * (sp.p2/100); }
      if (isExp) { exp += amt; oData.p1.e += amt * (sp.p1/100); oData.p2.e += amt * (sp.p2/100); }
    } else {
      if (isInc) { inc += amt; oData[own].i += amt; }
      if (isExp) {
        exp += amt; oData[own].e += amt;
        catExp[t.catName||'Other'] = (catExp[t.catName||'Other'] || 0) + amt;
      }
    }
  });

  const kpis = D.vMAnalytics.querySelectorAll('.grid')[0].children;
  kpis[0].children[1].innerText = fmtMoney(inc, st.workspace?.currency || '$', 0); kpis[0].children[0].innerText = 'Period Income';
  kpis[1].children[1].innerText = fmtMoney(exp, st.workspace?.currency || '$', 0); kpis[1].children[0].innerText = 'Period Expense';
  kpis[2].children[1].innerText = fmtMoney(inc - exp, st.workspace?.currency || '$', 0); kpis[2].children[0].innerText = 'Net Savings';
  const sr = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
  kpis[3].children[1].innerText = `${sr}%`; kpis[3].children[0].innerText = 'Savings Rate';

  await ensureChartJs();
  const txtCol = st.darkMode ? '#9ca3af' : '#4b5563';
  const gridCol = st.darkMode ? '#374151' : '#e5e7eb';
  const cOpts = { responsive: true, maintainAspectRatio: false, color: txtCol, plugins: { legend: { labels: { color: txtCol } } }, scales: { x: { grid: { color: gridCol }, ticks: { color: txtCol } }, y: { grid: { color: gridCol }, ticks: { color: txtCol } } } };

  // Chart 1: Expense Doughnut
  const ceData = Object.entries(catExp).sort((a,b)=>b[1]-a[1]);
  if (c.m1) c.m1.destroy();
  c.m1 = new Chart($('chart-1'), { type: 'doughnut', data: { labels: ceData.map(d=>d[0]), datasets: [{ data: ceData.map(d=>d[1]), backgroundColor: COLORS, borderWidth: 0 }] }, options: { ...cOpts, scales: {}, plugins: { legend: { position: 'right', labels: { color: txtCol } }, title: { display: true, text: 'Expenses by Category', color: txtCol } } } });

  // Chart 2: 6-Month Bar
  const lm = []; const lmI = []; const lmE = [];
  const d = new Date(); d.setDate(1);
  for(let i=5; i>=0; i--) {
    const nd = new Date(d); nd.setMonth(nd.getMonth() - i);
    const mStr = nd.toISOString().substring(0,7);
    lm.push(fmtMonth(mStr).split(' ')[0]);
    let mInc = 0, mExp = 0;
    st.transactions.filter(t => t.date.startsWith(mStr) && (f.mScope === 'all' || (f.mScope==='personal' && !t.type.startsWith('shop_')) || (f.mScope==='shop' && t.type.startsWith('shop_')))).forEach(t => {
      if (t.type === 'income' || t.type === 'shop_sale') mInc += (t.type.startsWith('shop_') ? t.total : t.amt);
      if (t.type === 'expense' || t.type === 'shop_cost' || t.type === 'shop_cap') mExp += (t.type.startsWith('shop_') ? t.total : t.amt);
    });
    lmI.push(mInc); lmE.push(mExp);
  }
  if (c.m2) c.m2.destroy();
  c.m2 = new Chart($('chart-2'), { type: 'bar', data: { labels: lm, datasets: [{ label: 'Income', data: lmI, backgroundColor: PALETTE.income }, { label: 'Expense', data: lmE, backgroundColor: PALETTE.expense }] }, options: { ...cOpts, plugins: { ...cOpts.plugins, title: { display: true, text: '6-Month Trend', color: txtCol } } } });

  // Chart 3: Live Wallets
  const wls = getWallets();
  if (c.m3) c.m3.destroy();
  c.m3 = new Chart($('chart-3'), { type: 'bar', data: { labels: wls.map(w=>w.name), datasets: [{ label: 'Balance', data: wls.map(w=>st.balances.wallets[w.id]||0), backgroundColor: wls.map(w=>w.color||PALETTE.brand) }] }, options: { ...cOpts, indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Live Wallet Balances', color: txtCol } } } });

  // Chart 4: Owner Breakdown
  if (c.m4) c.m4.destroy();
  c.m4 = new Chart($('chart-4'), { type: 'bar', data: { labels: [personName('p1'), personName('p2'), 'Shared'], datasets: [{ label: 'Income', data: [oData.p1.i, oData.p2.i, oData.shared.i], backgroundColor: PALETTE.income }, { label: 'Expense', data: [oData.p1.e, oData.p2.e, oData.shared.e], backgroundColor: PALETTE.expense }] }, options: { ...cOpts, plugins: { ...cOpts.plugins, title: { display: true, text: 'Owner Breakdown', color: txtCol } } } });
}

let cjsProm = null;
function ensureChartJs() {
  if (st.chartjsLoaded) return Promise.resolve();
  if (!cjsProm) {
    cjsProm = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = () => { st.chartjsLoaded = true; res(); };
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return cjsProm;
}

// Transaction Modal
function openTxModal(tx = null) {
  const m = $('tx-modal');
  let type = tx ? tx.type : 'expense';
  let wId = tx ? tx.wId : (getWallets()[0]?.id || '');
  let wTo = tx ? tx.wTo : (getWallets()[1]?.id || '');
  let cat = tx ? tx.cat : '';
  let catName = tx ? tx.catName : '';
  let owner = tx ? (tx.owner || 'p1') : (st.activePerson === 'shared' ? 'p1' : st.activePerson);
  let dVal = tx ? tx.date : todayISO();
  
  const tTabs = m.querySelectorAll('.flex.bg-gray-100 button');
  const selTab = (t) => {
    type = t;
    tTabs[0].className = `flex-1 py-1.5 rounded text-sm font-medium ${t==='expense' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`;
    tTabs[1].className = `flex-1 py-1.5 rounded text-sm font-medium ${t==='income' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`;
    tTabs[2].className = `flex-1 py-1.5 rounded text-sm font-medium ${t==='transfer' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`;
    renderForm();
  };
  tTabs[0].onclick = () => selTab('expense'); tTabs[1].onclick = () => selTab('income'); tTabs[2].onclick = () => selTab('transfer');

  const amtIn = m.querySelector('input[type="number"]');
  amtIn.type = 'text'; inputModeNum(amtIn);
  amtIn.value = tx ? fmtNum(tx.amt, 2) : '';
  
  const qChips = m.querySelector('.overflow-x-auto');
  qChips.innerHTML = [1000, 5000, 10000, 50000, 100000].map(v => `<button type="button" class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm shrink-0 whitespace-nowrap">+${fmtCompact(v)}</button>`).join('');
  qChips.querySelectorAll('button').forEach((b, i) => b.onclick = () => {
    const v = [1000, 5000, 10000, 50000, 100000][i];
    amtIn.value = fmtNum(parseAmt(amtIn.value) + v, 2);
  });

  const inputs = m.querySelectorAll('input:not([type="checkbox"]), select, textarea');
  const wSel = inputs[1]; const cSel = inputs[2]; const dSel = inputs[3]; const nSel = inputs[4];
  const oBtns = m.querySelectorAll('.flex.gap-2')[1].children;
  const tChk = m.querySelector('input[type="checkbox"]');
  const sBtn = m.querySelectorAll('button')[9];

  const renderForm = () => {
    const wls = getWallets();
    if (type === 'transfer') {
      wSel.outerHTML = `<div class="flex gap-2 mb-4" id="tfr-w"><select class="flex-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-none"></select><button class="px-4 bg-gray-100 dark:bg-gray-800 rounded-lg">🔄</button><select class="flex-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-none"></select></div>`;
      const tfr = m.querySelector('#tfr-w');
      tfr.children[0].innerHTML = wls.map(w => `<option value="${w.id}" ${w.id===wId?'selected':''}>${w.name}</option>`).join('');
      tfr.children[2].innerHTML = wls.map(w => `<option value="${w.id}" ${w.id===wTo?'selected':''}>${w.name}</option>`).join('');
      tfr.children[0].onchange = (e) => wId = e.target.value;
      tfr.children[2].onchange = (e) => wTo = e.target.value;
      tfr.children[1].onclick = () => { const temp = wId; wId = wTo; wTo = temp; renderForm(); };
      cSel.classList.add('hidden');
    } else {
      const el = m.querySelector('#tfr-w');
      if (el) el.outerHTML = `<select class="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-none mb-4"></select>`;
      const nSel = m.querySelectorAll('select')[0];
      nSel.innerHTML = wls.map(w => `<option value="${w.id}" ${w.id===wId?'selected':''}>${w.name} (${fmtCompact(st.balances.wallets[w.id]||0)})</option>`).join('');
      nSel.onchange = (e) => wId = e.target.value;
      
      cSel.classList.remove('hidden');
      const cats = type === 'expense' ? getCats().e : getCats().i;
      cSel.outerHTML = `<div class="flex gap-2 overflow-x-auto pb-2 hidden-scrollbar mb-4" id="cat-chips">${cats.map(c => `<button class="px-3 py-1.5 rounded-lg text-sm shrink-0 flex items-center gap-1 ${cat===c.id ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800'}" data-cid="${c.id}">${c.icon} ${c.name}</button>`).join('')}<input type="text" placeholder="Custom" class="w-24 p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border-none text-sm" value="${!cats.find(c=>c.id===cat) ? catName : ''}" /></div>`;
      
      const cc = m.querySelector('#cat-chips');
      cc.querySelectorAll('button').forEach(b => b.onclick = () => { cat = b.dataset.cid; catName = cats.find(c=>c.id===cat).name; renderForm(); });
      const cInp = cc.querySelector('input');
      cInp.onkeyup = (e) => { if (e.target.value) { cat = 'custom'; catName = e.target.value; cc.querySelectorAll('button').forEach(b=>b.className='px-3 py-1.5 rounded-lg text-sm shrink-0 flex items-center gap-1 bg-gray-100 dark:bg-gray-800'); } };
    }
  };

  selTab(type);
  dSel.value = dVal;
  nSel.value = tx ? tx.note : '';
  tChk.checked = false;
  tChk.parentElement.classList.toggle('hidden', !!tx);

  const renderO = () => {
    oBtns[0].className = `flex-1 py-2 rounded-lg font-medium ${owner==='p1'?'bg-brand text-white':'bg-gray-100 dark:bg-gray-800'}`; oBtns[0].innerText = personName('p1');
    oBtns[1].className = `flex-1 py-2 rounded-lg font-medium ${owner==='p2'?'bg-brand text-white':'bg-gray-100 dark:bg-gray-800'}`; oBtns[1].innerText = personName('p2');
    oBtns[2].className = `flex-1 py-2 rounded-lg font-medium ${owner==='shared'?'bg-brand text-white':'bg-gray-100 dark:bg-gray-800'}`;
  };
  oBtns[0].onclick = () => { owner = 'p1'; renderO(); }; oBtns[1].onclick = () => { owner = 'p2'; renderO(); }; oBtns[2].onclick = () => { owner = 'shared'; renderO(); };
  renderO();

  let delBtn = m.querySelector('#tx-del-btn');
  if (tx) {
    if (!delBtn) { delBtn = document.createElement('button'); delBtn.id = 'tx-del-btn'; delBtn.className = 'w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold rounded-xl mt-2'; delBtn.innerText = 'Delete'; sBtn.parentElement.appendChild(delBtn); }
    delBtn.onclick = () => openConfirm('Delete Transaction', 'Remove this transaction permanently?', () => { delTx(tx.id); m.classList.add('hidden'); });
  } else if (delBtn) { delBtn.remove(); }

  sBtn.onclick = () => {
    const amt = parseAmt(amtIn.value);
    if (!amt || !wId || (type!=='transfer' && !catName)) return toast('Missing fields', 'error');
    if (type==='transfer' && wId===wTo) return toast('Same wallet', 'error');
    
    const payload = { type, amt, wId, date: dSel.value, owner, note: nSel.value.trim() };
    if (type === 'transfer') payload.wTo = wTo;
    else { payload.cat = cat; payload.catName = catName; }

    saveTx(payload, tx ? tx.id : null);
    if (tChk.checked && !tx) {
      const tmpl = { type, amt, wId, wTo, cat, catName, owner, note: nSel.value.trim(), id: 'tmpl_'+Date.now() };
      patchWs({ templates: [...(st.workspace.templates||[]), tmpl] });
    }
    toast('Saved', 'success');
    m.classList.add('hidden');
  };

  m.querySelector('button.text-2xl').onclick = () => m.classList.add('hidden');
  m.classList.remove('hidden'); m.classList.add('flex');
}

function inputModeNum(el) {
  el.setAttribute('inputmode', 'decimal');
  el.onblur = (e) => { e.target.value = e.target.value ? fmtNum(parseAmt(e.target.value), 2) : ''; };
  el.onfocus = (e) => { e.target.value = e.target.value ? parseAmt(e.target.value) : ''; e.target.select(); };
}

function openTemplatesModal() {
  const m = $('templates-modal');
  const c = m.querySelector('.space-y-2');
  const renderT = () => {
    c.innerHTML = (st.workspace?.templates||[]).map(t => `
      <div class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
        <div><div class="font-bold text-sm">${esc(t.note||t.catName)}</div><div class="text-xs text-gray-500">${fmtMoney(t.amt, st.workspace?.currency||'$')} • ${t.type}</div></div>
        <button onclick="delTemplate('${t.id}')" class="text-red-500 text-xl">🗑️</button>
      </div>
    `).join('') || '<div class="text-center text-gray-500 text-sm py-4">No templates yet. Check "Save as Template" when adding a transaction.</div>';
  };
  window.delTemplate = (id) => { patchWs({ templates: st.workspace.templates.filter(t=>t.id!==id) }); renderT(); };
  renderT();
  m.querySelector('button.text-2xl').onclick = () => m.classList.add('hidden');
  m.classList.remove('hidden'); m.classList.add('flex');
}

function openSettings() {
  const m = $('settings-modal');
  const inps = m.querySelectorAll('input');
  inps[0].value = st.workspace?.name || 'My Ledger';
  inps[1].value = st.workspace?.currency || '$';
  inps[2].value = st.workspace?.names?.p1 || 'Person 1';
  inps[3].value = st.workspace?.names?.p2 || 'Person 2';

  const wCont = m.querySelector('.space-y-2');
  let editW = [...getWallets()];
  
  const renderW = () => {
    wCont.innerHTML = editW.map((w, i) => `
      <div class="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <select class="p-2 rounded bg-white dark:bg-gray-700 text-xl" onchange="updW(${i}, 'icon', this.value)">
          ${W_ICONS.map(ic => `<option value="${ic}" ${w.icon===ic?'selected':''}>${ic}</option>`).join('')}
        </select>
        <input type="color" value="${w.color||'#3b82f6'}" class="w-8 h-8 rounded border-none cursor-pointer p-0" onchange="updW(${i}, 'color', this.value)" />
        <div class="flex-1 flex flex-col gap-1">
          <input type="text" value="${esc(w.name)}" class="w-full p-1.5 text-sm rounded bg-white dark:bg-gray-700" onchange="updW(${i}, 'name', this.value)" />
          <input type="text" inputmode="decimal" value="${fmtNum(w.opening||0, 2)}" placeholder="Opening Bal" class="w-full p-1.5 text-sm rounded bg-white dark:bg-gray-700" onblur="this.value=fmtNum(parseSigned(this.value)); updW(${i}, 'opening', parseSigned(this.value))" onfocus="this.value=parseSigned(this.value); this.select();" />
        </div>
        ${editW.length > 1 ? `<button class="text-red-500 p-2" onclick="rmW(${i})">🗑️</button>` : ''}
      </div>
    `).join('') + `<button id="add-w-btn" class="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 font-medium">+ Add Wallet</button>`;
    
    m.querySelector('#add-w-btn').onclick = () => { editW.push({ id: 'w_'+Date.now(), name: 'New Wallet', icon: '💼', color: COLORS[Math.floor(Math.random()*COLORS.length)], opening: 0 }); renderW(); };
  };
  
  window.updW = (i, f, v) => { editW[i][f] = v; };
  window.rmW = (i) => {
    openConfirm('Remove Wallet', 'Remove this wallet? Transactions will remain but wallet might show as Unknown.', () => {
      const delName = editW[i].name;
      editW.splice(i, 1); 
      renderW();
    });
  };
  renderW();

  const spans = m.querySelectorAll('.font-mono');
  spans[0].innerText = st.workspaceId;
  spans[1].innerText = st.workspace?.joinPin || '****';
  const cBtns = m.querySelectorAll('button.text-brand.font-bold');
  cBtns[0].onclick = () => copyText(st.workspaceId, 'Workspace ID Copied');
  cBtns[1].onclick = () => copyText(st.workspace?.joinPin, 'Join PIN Copied');

  const bBtns = m.querySelectorAll('.flex.gap-2')[1].children;
  bBtns[0].onclick = () => { m.classList.add('hidden'); $('workspace-screen').classList.remove('hidden'); $('workspace-screen').classList.add('flex'); $('workspace-screen').querySelector('button.hidden').classList.remove('hidden'); $('workspace-screen').querySelector('button.hidden').onclick=()=>{$('workspace-screen').classList.add('hidden'); m.classList.remove('hidden');}; };
  bBtns[1].onclick = () => {
    const data = JSON.stringify(st.transactions);
    downloadBlob(new Blob([data], { type: 'application/json' }), `DF_Backup_${todayISO()}.json`);
    toast('Backup Downloaded', 'success');
  };

  const closeBtn = m.querySelector('button.text-2xl');
  closeBtn.onclick = () => {
    patchWs({
      name: inps[0].value.trim(), currency: inps[1].value.trim(),
      names: { p1: inps[2].value.trim(), p2: inps[3].value.trim() },
      wallets: editW
    });
    m.classList.add('hidden');
  };

  m.querySelector('button.text-red-500.border').onclick = async () => {
    const { auth, authMod } = await ensureFirebase();
    authMod.signOut(auth).then(() => window.location.reload());
  };

  m.classList.remove('hidden'); m.classList.add('flex');
}