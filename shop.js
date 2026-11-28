// Delights Flow — Shop Module (Multi-Shop Home, COD Tracking, Shop History & Calendar, Per-Shop Analytics, Style A Receipt PNG/Text)

import {
  COLORS, COLOR_MAP, COST_SUBTYPES, COST_COLORS, state,
  $, esc, todayISO, curMonth,
  fmtNum, fmtMoney, fmtCompact, parseAmt, fmtAmtInput, fmtMonth, fmtDateHead,
  getWallets, getWallet, getShops, getShop,
  isSaleTx, orderTot, paidUpfront, codAmtOf, codStatusOf, collectedOf, pendingCodOf, genReceiptNo,
  getAvailableMonths, toast, copyText, downloadBlob, openConfirm, killChart, ensureChartJs,
  switchView, patchWs, saveTx, delTx
} from './core.js';

let shopBound = false;
let shopChartErrNotified = false;

// --- HELPERS ---
const shopTxs = () => state.transactions.filter((t) => t.scope === 'shop');

// Grapheme-safe text splitter so Myanmar diacritics/consonants never tear apart on Receipt PNG
const graphemeSeg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const splitGraphemes = (str) => {
  if (graphemeSeg) return Array.from(graphemeSeg.segment(str), (s) => s.segment);
  return str.match(/[\u1000-\u102A\u103F\u104E][\u102B-\u103E\u1056-\u1059\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D]*|./gu) || Array.from(str);
};

// Period-accurate collected shop sales (counts upfront on order date, COD on received date)
function collectedInPeriod(t, mk) {
  if (!isSaleTx(t)) return 0;
  if (mk === 'all') return collectedOf(t);
  let sum = 0;
  const pUp = paidUpfront(t);
  if (pUp > 0 && t.date?.startsWith(mk)) sum += pUp;
  if (codStatusOf(t) === 'paid' && (t.codPaidDate || t.date || '').startsWith(mk)) sum += codAmtOf(t);
  return sum;
}

function getFilteredShop(overrideMonth = null) {
  const { search, category, type } = state.shopFilters;
  const month = overrideMonth !== null ? overrideMonth : state.shopFilters.month;
  const q = search.trim().toLowerCase();
  return shopTxs().filter((t) => {
    const sale = isSaleTx(t);
    if (month !== 'all') {
      const matchDate = t.date?.startsWith(month) || (sale && codStatusOf(t) === 'paid' && (t.codPaidDate || '').startsWith(month));
      if (!matchDate) return false;
    }
    if (category !== 'all' && (t.shopCategoryId || 'general') !== category) return false;
    if ((type === 'sale' && !sale) || (type === 'capital' && sale) || (type === 'pending_cod' && (!sale || pendingCodOf(t) <= 0))) return false;
    if (q) {
      const hay = [t.customerName, t.customerPhone, t.receiptNo, t.note, t.shopCategoryName, t.costSubType, (t.items || []).map((i) => i.name).join(' '), getWallet(t.wallet).name, t.codWallet ? getWallet(t.codWallet).name : ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function populateShopSelectors() {
  const shops = getShops(), ms = getAvailableMonths();
  const fm = $('shop-filter-month'), fc = $('shop-filter-cat'), ft = $('shop-filter-type');
  const sm = $('sa-month-select'), ss = $('sa-shop-select');

  if (fm) {
    fm.innerHTML = `<option value="all">All Time</option>${ms.map((m) => `<option value="${m}">${fmtMonth(m)}</option>`).join('')}`;
    fm.value = ms.includes(state.shopFilters.month) || state.shopFilters.month === 'all' ? state.shopFilters.month : curMonth();
  }
  const shopOpts = `<option value="all">All Shops</option>${shops.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}<option value="general">General Shop</option>`;
  if (fc) {
    fc.innerHTML = shopOpts;
    if (state.shopFilters.category !== 'all' && state.shopFilters.category !== 'general' && !shops.some((s) => s.id === state.shopFilters.category)) state.shopFilters.category = 'all';
    fc.value = state.shopFilters.category;
  }
  if (ft) ft.value = state.shopFilters.type;
  if (sm) {
    sm.innerHTML = `${ms.map((m) => `<option value="${m}">${fmtMonth(m)}</option>`).join('')}<option value="all">All Time</option>`;
    sm.value = ms.includes(state.shopAnalyticsMonth) || state.shopAnalyticsMonth === 'all' ? state.shopAnalyticsMonth : curMonth();
  }
  if (ss) {
    ss.innerHTML = shopOpts;
    if (state.shopAnalyticsShopId !== 'all' && state.shopAnalyticsShopId !== 'general' && !shops.some((s) => s.id === state.shopAnalyticsShopId)) state.shopAnalyticsShopId = 'all';
    ss.value = state.shopAnalyticsShopId;
  }
}

// --- SHARED SHOP ROW ---
function rowHTML(t) {
  const sale = isSaleTx(t), sh = getShop(t.shopCategoryId, t.shopCategoryName || t.category), w = getWallet(t.wallet);
  const head = sale ? esc(t.customerName || t.items?.[0]?.name || sh.name) : esc(t.costSubType || 'Capital / Cost');
  const sub = sale ? (t.items?.length ? t.items.map((i) => `${i.name} ×${i.qty}`).join(', ') : (t.note || '')) : (t.note || '');
  let amtHtml = '', codHtml = '', codBtn = '', showW = true;

  if (sale) {
    const tot = orderTot(t), pUp = paidUpfront(t), cAmt = codAmtOf(t), cSt = codStatusOf(t);
    if (cSt === 'pending' && pUp <= 0) showW = false;
    if (cAmt > 0) {
      if (cSt === 'pending') {
        codHtml = `${pUp > 0 ? `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">Paid: ${fmtMoney(pUp)}</span>` : ''}<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">⏳ COD: ${fmtMoney(cAmt)}</span>`;
        codBtn = `<button type="button" data-cod="${esc(t.id)}" class="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm">✓ Mark COD Paid</button>`;
      } else {
        const codDateTag = t.codPaidDate && t.codPaidDate !== t.date ? ` · ${esc(t.codPaidDate)}` : '';
        codHtml = `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">✓ COD Paid (${esc(getWallet(t.codWallet || t.wallet).name)}${codDateTag})</span>`;
      }
    }
    amtHtml = `<span class="text-sm sm:text-base font-extrabold tabular-nums ${cSt === 'pending' && pUp <= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">+${fmtMoney(tot)}</span>`;
  } else {
    amtHtml = `<span class="text-sm sm:text-base font-extrabold tabular-nums text-rose-600 dark:text-rose-400">-${fmtMoney(t.amount)}</span>`;
  }

  return `<div class="p-4 sm:px-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" data-ed="${esc(t.id)}">
      <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 overflow-hidden" style="background:${sh.hex}20">${sh.logoDataUrl && sale ? `<img src="${sh.logoDataUrl}" alt="" class="w-full h-full object-cover"/>` : (sale ? '🛍️' : '📦')}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap"><span class="text-sm font-extrabold truncate">${head}</span>${t.receiptNo ? `<span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">${esc(t.receiptNo)}</span>` : ''}</div>
        ${sub ? `<p class="text-xs text-slate-500 line-clamp-2 mt-0.5">${esc(sub)}</p>` : ''}
        <div class="flex items-center gap-1.5 flex-wrap mt-1.5"><span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${sh.hex}20;color:${sh.hex}">${esc(sh.name)}</span>${showW ? `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${w.hex}20;color:${w.hex}">${esc(w.name)}</span>` : ''}${codHtml}<span class="text-[11px] text-slate-400 font-medium">${esc(t.date || '')}</span></div>
      </div>
    </div>
    <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
      <div class="cursor-pointer" data-ed="${esc(t.id)}">${amtHtml}</div>
      <div class="flex items-center gap-1.5 flex-wrap">${codBtn}${sale ? `<button type="button" data-rc="${esc(t.id)}" class="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold">🧾 Receipt</button>` : ''}<button type="button" aria-label="Delete shop entry" data-dl="${esc(t.id)}" class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">✕</button></div>
    </div>
  </div>`;
}

function bindShopRows(el) {
  el.querySelectorAll('[data-ed]').forEach((n) => n.addEventListener('click', () => {
    const t = state.transactions.find((x) => x.id === n.dataset.ed);
    if (t) openShopTxModal(isSaleTx(t) ? 'sale' : 'capital', t);
  }));
  el.querySelectorAll('[data-rc]').forEach((n) => n.addEventListener('click', (e) => {
    e.stopPropagation();
    const t = state.transactions.find((x) => x.id === n.dataset.rc);
    if (t) openReceiptModal(t);
  }));
  el.querySelectorAll('[data-cod]').forEach((n) => n.addEventListener('click', (e) => {
    e.stopPropagation();
    const t = state.transactions.find((x) => x.id === n.dataset.cod);
    if (t) openCodModal(t);
  }));
  el.querySelectorAll('[data-dl]').forEach((n) => n.addEventListener('click', (e) => {
    e.stopPropagation();
    openConfirm('Delete Shop Entry?', 'Your linked wallet balance will adjust automatically.', async () => {
      try {
        await delTx(n.dataset.dl);
        toast('Deleted', 'success');
      } catch {
        toast('Could not delete shop entry', 'error');
      }
    }, 'Delete');
  }));
}

// --- VIEW: SHOP HOME ---
export function renderShopHome() {
  const shops = getShops(), txs = shopTxs(), td = todayISO();
  let tdSales = 0, totRev = 0, totCap = 0, totCod = 0;
  const stats = {};
  shops.forEach((s) => { const sc = Number(s.startingCapital) || 0; totCap += sc; stats[s.id] = { ...s, sales: 0, capital: sc, cod: 0 }; });

  txs.forEach((t) => {
    const sId = t.shopCategoryId || 'general';
    const st = stats[sId] ||= { ...getShop(sId, t.shopCategoryName || t.category), sales: 0, capital: 0, cod: 0 };
    if (isSaleTx(t)) {
      const col = collectedOf(t), pc = pendingCodOf(t);
      totRev += col; totCod += pc; st.sales += col; st.cod += pc;
      if (t.date === td) tdSales += paidUpfront(t);
      if (codStatusOf(t) === 'paid' && (t.codPaidDate || t.date) === td) tdSales += codAmtOf(t);
    } else {
      const a = Number(t.amount) || 0; totCap += a; st.capital += a;
    }
  });

  const net = totRev - totCap;
  $('hero-today-date').textContent = td;
  $('hero-daily-sales').textContent = fmtMoney(tdSales);
  $('hero-total-revenue').textContent = fmtMoney(totRev);
  $('hero-total-capital').textContent = fmtMoney(totCap);
  $('hero-net-label').textContent = net >= 0 ? '═ Net Profit' : '═ To Break Even';
  $('hero-net-profit').textContent = net >= 0 ? fmtMoney(net, true) : fmtMoney(Math.abs(net));
  $('hero-net-profit').className = `text-base sm:text-lg font-extrabold tabular-nums text-right break-words ${net >= 0 ? 'text-emerald-300' : 'text-amber-300'}`;
  $('hero-pending-cod').textContent = fmtMoney(totCod);

  const sg = $('shops-grid');
  const cards = Object.values(stats).filter((s) => shops.some((x) => x.id === s.id) || s.sales > 0 || s.capital > 0 || s.cod > 0);
  sg.innerHTML = cards.map((s) => {
    const sn = s.sales - s.capital;
    const pct = s.capital > 0 ? Math.min(100, Math.round((s.sales / s.capital) * 100)) : (s.sales > 0 ? 100 : 0);
    const av = s.logoDataUrl ? `<img src="${s.logoDataUrl}" alt="" class="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"/>` : `<span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:${s.hex}"></span>`;
    return `<button type="button" data-sh="${esc(s.id)}" class="text-left bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 shadow-sm active:scale-[0.98] transition-all space-y-3">
      <div class="flex items-center justify-between gap-2"><span class="inline-flex items-center gap-2.5 font-extrabold text-sm truncate">${av}<span class="truncate">${esc(s.name)}</span></span><span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0" style="background:${s.hex}20;color:${s.hex}">History →</span></div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60"><p class="text-[10px] font-semibold uppercase text-slate-400">Sales</p><p class="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums break-words mt-0.5">${fmtMoney(s.sales)}</p></div>
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60"><p class="text-[10px] font-semibold uppercase text-slate-400">Capital</p><p class="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums break-words mt-0.5">${fmtMoney(s.capital)}</p></div>
        <div class="col-span-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex justify-between gap-2"><span class="text-[10px] font-bold uppercase text-slate-400">${sn >= 0 ? 'Net Profit' : 'Left to Break Even'}</span><span class="font-extrabold tabular-nums ${sn >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}">${sn >= 0 ? fmtMoney(sn, true) : fmtMoney(Math.abs(sn))}</span></div>
        ${s.cod > 0 ? `<div class="col-span-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex justify-between text-amber-700 dark:text-amber-300"><span class="text-[10px] font-bold uppercase">⏳ Pending COD</span><span class="font-extrabold tabular-nums">${fmtMoney(s.cod)}</span></div>` : ''}
      </div>
      <div class="space-y-1"><div class="flex justify-between text-[10px] font-semibold text-slate-400"><span>Capital Recovery</span><span>${pct}%</span></div><div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${s.hex}"></div></div></div>
    </button>`;
  }).join('');
  sg.querySelectorAll('[data-sh]').forEach((b) => b.addEventListener('click', () => {
    state.shopFilterActive = true;
    state.shopFilters.category = b.dataset.sh;
    state.shopFilters.month = 'all';
    state.shopFilters.type = 'all';
    switchView('history', { keepShopFilter: true, historySub: 'shop' });
  }));

  const rec = txs.slice(0, 8), rEl = $('shop-recent-list');
  rEl.innerHTML = rec.length ? rec.map(rowHTML).join('') : `<div class="p-8 text-center text-xs text-slate-400">No shop activity yet. Tap <strong>+</strong> to record a sale.</div>`;
  if (rec.length) bindShopRows(rEl);
}

// --- VIEW: SHOP HISTORY & CALENDAR (CROSS-MONTH COD ACCURATE) ---
function renderShopCalendar() {
  const mk = state.shopCalendarMonth || curMonth(), [y, m] = mk.split('-').map(Number);
  $('shop-cal-month-title').textContent = fmtMonth(mk);
  const txs = getFilteredShop(mk);

  const byDay = {};
  const addDayItem = (iso, t) => {
    const bucket = byDay[iso] ||= { in: 0, out: 0, cod: 0, items: [], seen: new Set() };
    if (!bucket.seen.has(t.id)) {
      bucket.seen.add(t.id);
      bucket.items.push(t);
    }
    return bucket;
  };

  txs.forEach((t) => {
    if (isSaleTx(t)) {
      const pUp = paidUpfront(t), pCod = pendingCodOf(t), cSt = codStatusOf(t), cAmt = codAmtOf(t);
      // Bucket upfront paid and pending COD on order date
      if (t.date?.startsWith(mk) && (pUp > 0 || pCod > 0 || cSt === 'none')) {
        const d = addDayItem(t.date, t);
        if (pUp > 0) d.in += pUp;
        if (pCod > 0) d.cod += pCod;
      }
      // Bucket paid COD on its actual received date (codPaidDate)
      const cDate = t.codPaidDate || t.date;
      if (cSt === 'paid' && cAmt > 0 && cDate?.startsWith(mk)) {
        const d = addDayItem(cDate, t);
        d.in += cAmt;
      }
    } else if (t.date?.startsWith(mk)) {
      const d = addDayItem(t.date, t);
      d.out += Number(t.amount) || 0;
    }
  });

  const firstDow = new Date(y, m - 1, 1).getDay(), dim = new Date(y, m, 0).getDate(), td = todayISO();
  if (!state.shopCalendarSelectedDate?.startsWith(mk)) state.shopCalendarSelectedDate = td.startsWith(mk) ? td : `${mk}-01`;

  let cells = '<div class="min-h-[58px] rounded-2xl bg-slate-50/40 dark:bg-slate-900/30"></div>'.repeat(firstDow);
  for (let d = 1; d <= dim; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, info = byDay[iso], sel = iso === state.shopCalendarSelectedDate;
    const cls = sel ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-1 ring-amber-500'
      : iso === td ? 'bg-slate-50 dark:bg-slate-800 border-amber-300 dark:border-amber-700'
      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800';
    cells += `<button type="button" data-scd="${iso}" class="min-h-[58px] p-1.5 rounded-2xl border text-left flex flex-col justify-between ${cls}">
      <div class="flex items-center justify-between w-full"><span class="text-[11px] font-extrabold ${sel ? 'text-amber-700 dark:text-amber-300' : ''}">${d}</span>${info?.cod > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500" title="Pending COD"></span>' : ''}</div>
      <div class="w-full overflow-hidden space-y-0.5">${info?.in ? `<div class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">+${fmtCompact(info.in)}</div>` : ''}${info?.out ? `<div class="text-[9px] font-bold text-rose-600 dark:text-rose-400 truncate">-${fmtCompact(info.out)}</div>` : ''}${!info?.in && info?.cod > 0 ? `<div class="text-[9px] font-bold text-amber-600 dark:text-amber-400 truncate">⏳${fmtCompact(info.cod)}</div>` : ''}</div>
    </button>`;
  }

  const cg = $('shop-calendar-days-grid');
  if (cg) {
    cg.innerHTML = cells;
    cg.querySelectorAll('[data-scd]').forEach((b) => b.addEventListener('click', () => { state.shopCalendarSelectedDate = b.dataset.scd; renderShopCalendar(); }));
  }

  const si = byDay[state.shopCalendarSelectedDate] || { in: 0, out: 0, cod: 0, items: [] };
  $('shop-cal-selected-date-title').textContent = fmtDateHead(state.shopCalendarSelectedDate);
  $('shop-cal-selected-date-summary').textContent = si.items.length
    ? `${si.items.length} records · Sales ${fmtMoney(si.in)}${si.cod > 0 ? ` · COD ${fmtMoney(si.cod)}` : ''}${si.out > 0 ? ` · Cap ${fmtMoney(si.out)}` : ''}`
    : 'No shop entries recorded';
  const dl = $('shop-cal-selected-day-list');
  if (dl) {
    dl.innerHTML = si.items.length ? si.items.map(rowHTML).join('') : `<div class="p-6 text-center text-xs text-slate-400">No shop records on this date.</div>`;
    if (si.items.length) bindShopRows(dl);
  }
}

export function renderShopHistory() {
  populateShopSelectors();
  const isCal = state.shopHistoryMode === 'calendar';
  $('shop-history-mode-list').className = !isCal ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500';
  $('shop-history-mode-calendar').className = isCal ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500';
  $('shop-history-calendar-wrap').classList.toggle('hidden', !isCal);
  $('shop-history-list').classList.toggle('hidden', isCal);

  const flt = getFilteredShop(), mk = state.shopFilters.month;
  let fR = 0, fC = 0, fD = 0;
  flt.forEach((t) => {
    if (isSaleTx(t)) { fR += collectedInPeriod(t, mk); fD += pendingCodOf(t); }
    else fC += Number(t.amount) || 0;
  });
  $('shop-filter-summary').innerHTML = `<span class="text-slate-500">${flt.length} records</span><span class="text-emerald-600 dark:text-emerald-400">Received: ${fmtMoney(fR)}</span>${fD > 0 ? `<span class="text-amber-600 dark:text-amber-400">COD: ${fmtMoney(fD)}</span>` : ''}<span class="text-rose-600 dark:text-rose-400">Capital: ${fmtMoney(fC)}</span>`;
  const f = state.shopFilters;
  $('shop-reset-filters-btn').classList.toggle('hidden', !(f.search || f.month !== curMonth() || f.category !== 'all' || f.type !== 'all'));

  if (isCal) return renderShopCalendar();

  const hl = $('shop-history-list');
  hl.innerHTML = flt.length
    ? `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden">${flt.map(rowHTML).join('')}</div>`
    : `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-10 text-center text-xs text-slate-400">No shop records found.</div>`;
  if (flt.length) bindShopRows(hl);
}

// --- VIEW: SHOP ANALYTICS (PER-SHOP FILTER + OFFLINE CHART RETRY) ---
export function renderShopAnalytics() {
  populateShopSelectors();
  if (state.currentView !== 'analytics' || state.analyticsSub !== 'shop') return;
  const sm = state.shopAnalyticsMonth, selShop = state.shopAnalyticsShopId || 'all';
  const txs = shopTxs().filter((t) => selShop === 'all' || (t.shopCategoryId || 'general') === selShop);
  const scopeLabel = selShop === 'all' ? 'All Shops' : getShop(selShop).name;

  let pS = 0, pC = 0, paidOrderCount = 0;
  const catMap = {}, costMap = {};

  getShops().forEach((s) => {
    if (selShop !== 'all' && s.id !== selShop) return;
    const sc = sm === 'all' ? (Number(s.startingCapital) || 0) : 0;
    pC += sc;
    if (sc > 0) costMap['Starting Capital'] = (costMap['Starting Capital'] || 0) + sc;
    catMap[s.id] = { name: s.name, hex: s.hex, sales: 0, capital: sc };
  });

  txs.forEach((t) => {
    const sId = t.shopCategoryId || 'general';
    if (isSaleTx(t)) {
      const col = collectedInPeriod(t, sm);
      if (col > 0) {
        const c = catMap[sId] ||= { ...getShop(sId, t.shopCategoryName || t.category), sales: 0, capital: 0 };
        pS += col;
        paidOrderCount++;
        c.sales += col;
      }
    } else if (sm === 'all' || t.date?.startsWith(sm)) {
      const c = catMap[sId] ||= { ...getShop(sId, t.shopCategoryName || t.category), sales: 0, capital: 0 };
      const a = Number(t.amount) || 0;
      pC += a; c.capital += a;
      const ct = t.costSubType || 'Stock / Capital';
      costMap[ct] = (costMap[ct] || 0) + a;
    }
  });

  const net = pS - pC;
  $('sa-kpi-sales').textContent = fmtMoney(pS);
  $('sa-kpi-capital').textContent = fmtMoney(pC);
  $('sa-kpi-net').textContent = fmtMoney(net, true);
  $('sa-kpi-net').className = `text-base sm:text-xl font-extrabold mt-1 tabular-nums break-words ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  $('sa-kpi-avg').textContent = fmtMoney(paidOrderCount > 0 ? pS / paidOrderCount : 0);

  const tc = state.darkMode ? '#cbd5e1' : '#475569', gc = state.darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)', hasC = typeof Chart !== 'undefined';
  if (!hasC) {
    ensureChartJs().then((ok) => {
      if (ok) {
        shopChartErrNotified = false;
        if (state.currentView === 'analytics' && state.analyticsSub === 'shop') renderShopAnalytics();
      } else if (!shopChartErrNotified) {
        shopChartErrNotified = true;
        toast('Charts need internet once to cache.', 'info', { label: 'Retry', onClick: () => { shopChartErrNotified = false; renderShopAnalytics(); } });
      }
    });
  }

  killChart('shopTrend');
  let tL = [], tS = [], tC = [];
  if (sm === 'all') {
    $('sa-trend-title').textContent = 'Monthly Sales & Capital Trend';
    $('sa-trend-sub').textContent = `Last 6 months · ${scopeLabel}`;
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1), mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      tL.push(fmtMonth(mk));
      tS.push(txs.reduce((s, t) => s + collectedInPeriod(t, mk), 0));
      tC.push(txs.filter((t) => !isSaleTx(t) && t.date?.startsWith(mk)).reduce((s, t) => s + (Number(t.amount) || 0), 0));
    }
  } else {
    $('sa-trend-title').textContent = `Daily Sales & Capital (${fmtMonth(sm)})`;
    $('sa-trend-sub').textContent = `Daily revenue vs capital · ${scopeLabel}`;
    const [y, m] = sm.split('-').map(Number), days = new Date(y, m, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      tL.push(String(day));
      tS.push(txs.reduce((s, t) => {
        if (!isSaleTx(t)) return s;
        let v = 0;
        if (t.date === iso) v += paidUpfront(t);
        if (codStatusOf(t) === 'paid' && (t.codPaidDate || t.date) === iso) v += codAmtOf(t);
        return s + v;
      }, 0));
      tC.push(txs.filter((t) => !isSaleTx(t) && t.date === iso).reduce((s, t) => s + (Number(t.amount) || 0), 0));
    }
  }
  const hasT = tS.some((v) => v > 0) || tC.some((v) => v > 0);
  $('sa-empty-trend').classList.toggle('hidden', hasT);
  if (hasT && hasC) state.charts.shopTrend = new Chart($('sa-chart-trend').getContext('2d'), { type: 'bar', data: { labels: tL, datasets: [{ label: 'Sales', data: tS, backgroundColor: '#10b981', borderRadius: 5 }, { label: 'Capital', data: tC, backgroundColor: '#f43f5e', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc } }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtMoney(ctx.raw)}` } } }, scales: { x: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc } } } } });

  killChart('shopCats');
  const cRows = Object.values(catMap).filter((c) => c.sales > 0 || c.capital > 0);
  $('sa-empty-cats').classList.toggle('hidden', cRows.length > 0);
  if (cRows.length && hasC) state.charts.shopCats = new Chart($('sa-chart-cats').getContext('2d'), { type: 'bar', data: { labels: cRows.map((c) => c.name), datasets: [{ label: 'Sales', data: cRows.map((c) => c.sales), backgroundColor: '#10b981', borderRadius: 6 }, { label: 'Capital', data: cRows.map((c) => c.capital), backgroundColor: '#f43f5e', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc } } }, scales: { x: { ticks: { color: tc, font: { weight: 'bold' } }, grid: { display: false } }, y: { ticks: { color: tc }, grid: { color: gc } } } } });
  $('sa-cats-list').innerHTML = cRows.length ? cRows.map((c) => { const n = c.sales - c.capital; return `<div class="flex justify-between gap-2 text-xs"><span class="flex items-center gap-2 font-bold truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${c.hex}"></span>${esc(c.name)}</span><span class="tabular-nums font-extrabold ${n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${fmtMoney(n, true)}</span></div>`; }).join('') : `<p class="text-xs text-slate-400 text-center">No shop data.</p>`;

  killChart('shopCosts');
  const costs = Object.entries(costMap).sort((a, b) => b[1] - a[1]);
  $('sa-empty-costs').classList.toggle('hidden', costs.length > 0);
  if (costs.length && hasC) state.charts.shopCosts = new Chart($('sa-chart-costs').getContext('2d'), { type: 'doughnut', data: { labels: costs.map((c) => c[0]), datasets: [{ data: costs.map((c) => c[1]), backgroundColor: costs.map((_, i) => COST_COLORS[i % COST_COLORS.length]), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtMoney(ctx.raw)}` } } } } });
  $('sa-costs-list').innerHTML = costs.length ? costs.map(([n, v], i) => `<div class="flex justify-between text-xs font-semibold"><span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${COST_COLORS[i % COST_COLORS.length]}"></span>${esc(n)}</span><span class="tabular-nums">${fmtMoney(v)} <span class="text-slate-400">(${pC > 0 ? Math.round((v / pC) * 100) : 0}%)</span></span></div>`).join('') : `<p class="text-xs text-slate-400 text-center">No capital/cost entries.</p>`;
}

// --- MODAL 1: RECORD SALE / CAPITAL ---
function computeSale(sync = true) {
  const sub = state.shopDraft.items.reduce((s, it) => s + ((Number(it.qty) || 1) * parseAmt(it.price)), 0);
  const del = parseAmt($('stx-delivery').value), dis = parseAmt($('stx-discount').value), grand = Math.max(0, sub + del - dis);
  $('stx-grand-total').textContent = fmtMoney(grand);
  if (sync) {
    if (state.shopDraft.splitMode === 'full_paid') { $('stx-paid-amount').value = fmtNum(grand); $('stx-cod-amount').value = '0'; }
    else if (state.shopDraft.splitMode === 'full_cod') { $('stx-paid-amount').value = '0'; $('stx-cod-amount').value = fmtNum(grand); }
    else { const p = Math.min(grand, parseAmt($('stx-paid-amount').value)); $('stx-paid-amount').value = fmtNum(p); $('stx-cod-amount').value = fmtNum(Math.max(0, grand - p)); }
  }
  const paid = Math.min(grand, parseAmt($('stx-paid-amount').value));
  return { subtotal: sub, delivery: del, discount: dis, grand, paid, cod: Math.max(0, grand - paid) };
}

function renderItemRows() {
  const box = $('stx-items-list');
  box.innerHTML = state.shopDraft.items.map((it, i) => `<div class="grid grid-cols-12 gap-1.5 items-center">
    <input type="text" placeholder="Item name" value="${esc(it.name)}" data-in="${i}" class="col-span-6 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"/>
    <input type="number" min="1" step="1" value="${it.qty || 1}" data-iq="${i}" class="col-span-2 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-center tabular-nums"/>
    <input type="text" inputmode="decimal" placeholder="Price" value="${it.price !== '' ? fmtNum(it.price) : ''}" data-ip="${i}" class="col-span-3 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold tabular-nums"/>
    <button type="button" aria-label="Remove item" data-ir="${i}" class="col-span-1 text-slate-400 hover:text-rose-500 font-bold ${state.shopDraft.items.length <= 1 ? 'opacity-20 pointer-events-none' : ''}">✕</button>
  </div>`).join('');
  box.querySelectorAll('[data-in]').forEach((el) => (el.oninput = () => (state.shopDraft.items[+el.dataset.in].name = el.value)));
  box.querySelectorAll('[data-iq]').forEach((el) => (el.oninput = () => { state.shopDraft.items[+el.dataset.iq].qty = Math.max(1, parseInt(el.value, 10) || 1); computeSale(true); }));
  box.querySelectorAll('[data-ip]').forEach((el) => (el.oninput = () => { fmtAmtInput(el); const p = parseAmt(el.value); state.shopDraft.items[+el.dataset.ip].price = el.value ? p : ''; computeSale(true); }));
  box.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { state.shopDraft.items.splice(+b.dataset.ir, 1); renderItemRows(); }));
  computeSale(true);
}

function renderShopTxControls() {
  const d = state.shopDraft, sale = d.mode === 'sale', shops = getShops(), ws = getWallets();
  const isEditing = Boolean(d.editId);

  $('stx-modal-title').textContent = isEditing ? (sale ? 'Edit Shop Sale' : 'Edit Capital / Cost') : (sale ? 'Record Shop Sale' : 'Record Capital / Cost');
  // Lock Sale/Capital mode switcher when editing an existing record so incompatible fields cannot be orphaned
  $('stx-mode-tabs')?.classList.toggle('hidden', isEditing);
  $('stx-sale-fields').classList.toggle('hidden', !sale);
  $('stx-capital-fields').classList.toggle('hidden', sale);
  $('stx-wallet-label').textContent = sale ? 'Deposit Paid Amount Into Wallet' : 'Deduct Capital / Cost From Wallet';
  $('stx-cap-currency').textContent = state.workspace.currency || 'Ks';
  const sb = $('stx-submit-btn');
  sb.textContent = isEditing ? 'Update Entry' : (sale ? 'Save Sale' : 'Save Capital / Cost');
  sb.className = `flex-1 py-3.5 px-5 rounded-2xl text-white font-bold text-sm shadow-lg ${sale ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`;
  document.querySelectorAll('.stx-mode-btn').forEach((b) => {
    const m = b.dataset.stxMode;
    b.className = m === d.mode ? `stx-mode-btn py-2.5 rounded-xl text-sm font-bold text-white shadow-sm ${m === 'sale' ? 'bg-emerald-600' : 'bg-rose-600'}` : 'stx-mode-btn py-2.5 rounded-xl text-sm font-bold text-slate-500';
  });

  const choices = sale ? shops : [...shops, { id: 'general', name: 'General Shop', hex: '#64748b' }];
  if (!choices.some((c) => c.id === d.shopCategoryId)) d.shopCategoryId = choices[0]?.id || 'shop1';
  const cb = $('stx-category-pills');
  cb.innerHTML = choices.map((c) => `<button type="button" data-sc="${esc(c.id)}" class="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${c.id === d.shopCategoryId ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}"><span class="w-2.5 h-2.5 rounded-full" style="background:${c.hex}"></span><span>${esc(c.name)}</span></button>`).join('');
  cb.querySelectorAll('[data-sc]').forEach((b) => (b.onclick = () => { d.shopCategoryId = b.dataset.sc; renderShopTxControls(); }));

  if (!sale) {
    const ct = $('stx-cost-types');
    ct.innerHTML = COST_SUBTYPES.map((x) => `<button type="button" data-ct="${esc(x)}" class="px-3 py-1.5 rounded-xl border text-xs font-bold ${x === d.costSubType ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}">${esc(x)}</button>`).join('');
    ct.querySelectorAll('[data-ct]').forEach((b) => (b.onclick = () => { d.costSubType = b.dataset.ct; renderShopTxControls(); }));
  } else renderItemRows();

  // Preserve archived wallets when editing existing entries so notes/items can be updated safely
  if (!d.wallet || (!isEditing && !ws.some((w) => w.id === d.wallet))) d.wallet = ws[0]?.id || 'cash';
  const walletChoices = [...ws];
  if (d.wallet && !ws.some((w) => w.id === d.wallet)) {
    const aw = getWallet(d.wallet);
    walletChoices.push({ id: d.wallet, name: `${aw.name} (Archived)`, hex: aw.hex });
  }
  const wb = $('stx-wallet-pills');
  wb.innerHTML = walletChoices.map((w) => `<button type="button" data-sw="${esc(w.id)}" class="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${w.id === d.wallet ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${w.hex}"></span><span class="truncate">${esc(w.name)}</span></button>`).join('');
  wb.querySelectorAll('[data-sw]').forEach((b) => (b.onclick = () => { d.wallet = b.dataset.sw; renderShopTxControls(); }));
}

export function openShopTxModal(mode = 'sale', tx = null, presetShop = null, presetDate = null) {
  $('stx-error').classList.add('hidden');
  const ws = getWallets(), shops = getShops();
  if (tx) {
    const m = isSaleTx(tx) ? 'sale' : 'capital', ot = orderTot(tx), pUp = paidUpfront(tx), cA = codAmtOf(tx);
    state.shopDraft = {
      editId: tx.id, mode: m, shopCategoryId: tx.shopCategoryId || shops[0]?.id || 'shop1',
      costSubType: tx.costSubType || 'Stock / Capital', wallet: tx.wallet || ws[0]?.id || 'cash',
      items: tx.items?.length ? tx.items.map((i) => ({ ...i })) : [{ name: tx.note || tx.shopCategoryName || 'Item', qty: 1, price: ot }],
      splitMode: cA <= 0 ? 'full_paid' : (pUp <= 0 ? 'full_cod' : 'custom'),
      existingCodStatus: codStatusOf(tx), existingCodWallet: tx.codWallet || '', existingCodPaidDate: tx.codPaidDate || ''
    };
    $('stx-customer').value = tx.customerName || '';
    $('stx-customer-phone').value = tx.customerPhone || '';
    $('stx-delivery').value = tx.deliveryFee ? fmtNum(tx.deliveryFee) : '';
    $('stx-discount').value = tx.discount ? fmtNum(tx.discount) : '';
    $('stx-paid-amount').value = fmtNum(pUp);
    $('stx-cod-amount').value = fmtNum(cA);
    $('stx-capital-amount').value = m === 'capital' ? fmtNum(tx.amount) : '';
    $('stx-date').value = tx.date || todayISO();
    $('stx-note').value = tx.note || '';
    $('stx-delete-btn').classList.remove('hidden');
  } else {
    state.shopDraft = {
      editId: null, mode, shopCategoryId: presetShop || (state.shopFilters.category !== 'all' ? state.shopFilters.category : (shops[0]?.id || 'shop1')),
      costSubType: 'Stock / Capital', wallet: ws[0]?.id || 'cash', items: [{ name: '', qty: 1, price: '' }],
      splitMode: 'full_paid', existingCodStatus: 'none', existingCodWallet: '', existingCodPaidDate: ''
    };
    ['stx-customer', 'stx-customer-phone', 'stx-delivery', 'stx-discount', 'stx-capital-amount', 'stx-note'].forEach((id) => ($(id).value = ''));
    $('stx-paid-amount').value = '0'; $('stx-cod-amount').value = '0';
    $('stx-date').value = presetDate || todayISO(); $('stx-open-receipt').checked = true;
    $('stx-delete-btn').classList.add('hidden');
  }
  renderShopTxControls();
  $('shop-tx-modal').classList.remove('hidden');
}

// --- MODAL 2: MARK COD PAID ---
function openCodModal(tx) {
  const ws = getWallets();
  state.codPayDraft = { txId: tx.id, wallet: ws.some((w) => w.id === tx.wallet) ? tx.wallet : (ws[0]?.id || 'cash') };
  $('cod-pay-info').textContent = `${tx.customerName || tx.receiptNo || 'Order'} · ${getShop(tx.shopCategoryId, tx.shopCategoryName).name}`;
  $('cod-pay-amount').textContent = fmtMoney(codAmtOf(tx));
  $('cod-pay-date').value = todayISO();
  const renderW = () => {
    const b = $('cod-pay-wallet-pills');
    b.innerHTML = ws.map((w) => `<button type="button" data-cpw="${esc(w.id)}" class="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${w.id === state.codPayDraft.wallet ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${w.hex}"></span><span class="truncate">${esc(w.name)}</span></button>`).join('');
    b.querySelectorAll('[data-cpw]').forEach((el) => (el.onclick = () => { state.codPayDraft.wallet = el.dataset.cpw; renderW(); }));
  };
  renderW();
  $('cod-pay-modal').classList.remove('hidden');
}

// --- MODAL 3: MANAGE SHOPS (AUTO-SAVES BEFORE "+ ADD COST" SO NEW SHOPS NEVER FALL BACK TO SHOP 1) ---
async function persistShopsDraft() {
  const clean = state.settingsShopsDraft.map((s, i) => ({
    id: s.id, name: (s.name || '').trim() || `Shop ${i + 1}`,
    colorKey: COLOR_MAP[s.colorKey] ? s.colorKey : COLORS[i % COLORS.length].key,
    startingCapital: Number(s.startingCapital) || 0,
    footer: (s.footer || '').trim() || 'Thank you for your purchase!',
    logoDataUrl: s.logoDataUrl || ''
  }));
  const f = clean[0];
  const profile = { name: f?.name || '', footer: f?.footer || 'Thank you for your purchase!', logoDataUrl: f?.logoDataUrl || '' };
  await patchWs({ shopCategories: clean, shopProfile: profile });
  // Update local workspace state immediately so follow-up modals see new shops right away
  state.workspace.shopCategories = clean;
  state.workspace.shopProfile = profile;
  return clean;
}

function renderShopsEditor(focusId = null) {
  const box = $('shops-editor'), canDel = state.settingsShopsDraft.length > 1, cur = state.workspace.currency || 'Ks';
  box.innerHTML = state.settingsShopsDraft.map((s, i) => {
    const col = COLOR_MAP[s.colorKey] || COLORS[0], open = state.openColorPickerShopId === s.id;
    return `<div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3" data-shrow="${esc(s.id)}">
      <div class="flex items-center gap-2.5">
        <button type="button" data-shl="${i}" title="Upload logo" aria-label="Upload shop logo" class="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">${s.logoDataUrl ? `<img src="${s.logoDataUrl}" alt="" class="w-full h-full object-cover"/>` : '<span class="text-xl">🛍️</span>'}</button>
        <div class="flex-1 min-w-0 flex items-center gap-1.5">
          <input type="text" maxlength="32" required placeholder="Shop name" value="${esc(s.name)}" data-shn="${i}" class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"/>
          <button type="button" data-shc="${esc(s.id)}" title="Pick color" class="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 shrink-0"><span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:${col.hex}"></span><span class="hidden sm:inline">${col.label}</span></button>
          <button type="button" aria-label="Remove shop" data-shd="${i}" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 ${canDel ? '' : 'opacity-30'}">✕</button>
        </div>
      </div>
      ${open ? `<div class="pt-2 pb-1 border-y border-slate-200/70 dark:border-slate-700 flex flex-wrap gap-2">${COLORS.map((c) => `<button type="button" data-shpc="${i}:${c.key}" title="${c.label}" class="w-7 h-7 rounded-full flex items-center justify-center ${c.key === s.colorKey ? 'ring-2 ring-offset-2 ring-amber-500 scale-110' : ''}" style="background:${c.hex}">${c.key === s.colorKey ? '<span class="text-white text-xs font-bold">✓</span>' : ''}</button>`).join('')}</div>` : ''}
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-shl="${i}" class="flex-1 min-w-[115px] py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 text-xs font-bold text-center">📷 ${s.logoDataUrl ? 'Change Logo' : 'Upload Logo'}</button>
        ${s.logoDataUrl ? `<button type="button" data-shrl="${i}" class="py-2 px-3 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">Remove</button>` : ''}
        <button type="button" data-shac="${esc(s.id)}" class="flex-1 min-w-[115px] py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60 text-xs font-bold text-center">📦 + Add Cost</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="space-y-1"><label class="text-[11px] font-semibold text-slate-500">Starting Capital (${esc(cur)})</label><input type="text" inputmode="decimal" placeholder="0" value="${s.startingCapital ? fmtNum(s.startingCapital) : ''}" data-shk="${i}" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold tabular-nums"/></div>
        <div class="space-y-1"><label class="text-[11px] font-semibold text-slate-500">Receipt Footer</label><input type="text" maxlength="100" placeholder="Thank you for your purchase!" value="${esc(s.footer || '')}" data-shf="${i}" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm"/></div>
      </div>
    </div>`;
  }).join('');

  box.querySelectorAll('[data-shn]').forEach((el) => (el.oninput = () => (state.settingsShopsDraft[+el.dataset.shn].name = el.value)));
  box.querySelectorAll('[data-shf]').forEach((el) => (el.oninput = () => (state.settingsShopsDraft[+el.dataset.shf].footer = el.value)));
  box.querySelectorAll('[data-shk]').forEach((el) => (el.oninput = () => { fmtAmtInput(el); state.settingsShopsDraft[+el.dataset.shk].startingCapital = parseAmt(el.value); }));
  box.querySelectorAll('[data-shc]').forEach((b) => (b.onclick = () => { state.openColorPickerShopId = state.openColorPickerShopId === b.dataset.shc ? null : b.dataset.shc; renderShopsEditor(); }));
  box.querySelectorAll('[data-shpc]').forEach((b) => (b.onclick = () => { const [i, k] = b.dataset.shpc.split(':'); state.settingsShopsDraft[+i].colorKey = k; state.openColorPickerShopId = null; renderShopsEditor(); }));
  box.querySelectorAll('[data-shl]').forEach((b) => (b.onclick = () => { state.logoUploadTargetIdx = +b.dataset.shl; $('shop-logo-file-input').value = ''; $('shop-logo-file-input').click(); }));
  box.querySelectorAll('[data-shrl]').forEach((b) => (b.onclick = () => { state.settingsShopsDraft[+b.dataset.shrl].logoDataUrl = ''; renderShopsEditor(); }));
  box.querySelectorAll('[data-shac]').forEach((b) => (b.onclick = async () => {
    const targetShopId = b.dataset.shac;
    b.disabled = true;
    try {
      await persistShopsDraft();
      $('shop-settings-modal').classList.add('hidden');
      openShopTxModal('capital', null, targetShopId);
    } catch {
      toast('Could not save shops before adding cost', 'error');
    } finally {
      b.disabled = false;
    }
  }));
  box.querySelectorAll('[data-shd]').forEach((b) => (b.onclick = () => { if (state.settingsShopsDraft.length <= 1) return toast('Keep at least 1 shop', 'info'); state.settingsShopsDraft.splice(+b.dataset.shd, 1); renderShopsEditor(); }));
  if (focusId) box.querySelector(`[data-shrow="${focusId}"] input[data-shn]`)?.focus();
}

export function openManageShops() {
  state.openColorPickerShopId = null;
  state.settingsShopsDraft = getShops().map((s) => ({ ...s }));
  renderShopsEditor();
  $('shop-settings-modal').classList.remove('hidden');
}

// --- STYLE A CUSTOMER RECEIPT GENERATOR (PNG + TEXT SLIP, MYANMAR GRAPHEME-SAFE WRAP) ---
const rRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
};

const wrapTxt = (ctx, text, maxW) => {
  const str = String(text || '').trim(); if (!str) return [''];
  const lines = []; let cur = '';
  str.split(/\s+/).forEach((word) => {
    if (ctx.measureText(word).width <= maxW) {
      const t = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(t).width <= maxW) cur = t;
      else { if (cur) lines.push(cur); cur = word; }
    } else {
      splitGraphemes(word).forEach((ch) => {
        const t = cur + ch;
        if (ctx.measureText(t).width <= maxW || !cur) cur = t;
        else { lines.push(cur); cur = ch; }
      });
    }
  });
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
};

function buildReceiptText(tx) {
  const sh = getShop(tx.shopCategoryId, tx.shopCategoryName || tx.category), tot = orderTot(tx), pUp = paidUpfront(tx), cA = codAmtOf(tx), cS = codStatusOf(tx);
  const items = tx.items?.length ? tx.items : [{ name: tx.note || 'Order Item', qty: 1, price: tot }];
  const payLines = cA <= 0 ? ['Status     : ✓ PAID IN FULL']
    : cS === 'paid' ? ['Status     : ✓ PAID IN FULL (COD Received)']
    : pUp > 0 ? [`Paid       : -${fmtMoney(pUp)}`, `COD Balance (To Pay) : ${fmtMoney(cA)}`]
    : [`Cash on Delivery (COD) : ${fmtMoney(cA)}`];
  return [
    `✨ ${sh.name || state.workspace.name || 'Delights Flow'}`, '══════════════════════',
    `Receipt No : ${tx.receiptNo || 'DF-RECEIPT'}`, `Date       : ${tx.date || todayISO()}`,
    tx.customerName ? `Customer   : ${tx.customerName}` : null, tx.customerPhone ? `Phone      : ${tx.customerPhone}` : null,
    '──────────────────────',
    ...items.map((i) => `• ${i.name || 'Item'} (×${i.qty || 1}) — ${fmtMoney((Number(i.qty) || 1) * (Number(i.price) || 0))}`),
    '──────────────────────',
    Number(tx.deliveryFee) > 0 ? `Delivery   : +${fmtMoney(tx.deliveryFee)}` : null,
    Number(tx.discount) > 0 ? `Discount   : -${fmtMoney(tx.discount)}` : null,
    `Total      : ${fmtMoney(tot)}`, ...payLines, '══════════════════════',
    sh.footer || 'Thank you for shopping with us!'
  ].filter(Boolean).join('\n');
}

async function drawReceipt(tx) {
  const canvas = $('receipt-canvas'), ctx = canvas.getContext('2d');
  const W = 760, pad = 28, cX = pad, cW = W - pad * 2, lX = cX + 42, rX = cX + cW - 42, cntW = rX - lX;
  const sh = getShop(tx.shopCategoryId, tx.shopCategoryName || tx.category), shopName = sh.name || state.workspace.name || 'Delights Flow';
  const tot = orderTot(tx), pUp = paidUpfront(tx), cA = codAmtOf(tx), cS = codStatusOf(tx);
  const items = tx.items?.length ? tx.items : [{ name: tx.note || 'Order Item', qty: 1, price: tot }];
  const sub = items.reduce((s, i) => s + ((Number(i.qty) || 1) * (Number(i.price) || 0)), 0), del = Number(tx.deliveryFee) || 0, dis = Number(tx.discount) || 0;
  const isPart = cA > 0 && cS === 'pending' && pUp > 0, isFullCod = cA > 0 && cS === 'pending' && pUp <= 0, isCodDone = cA > 0 && cS === 'paid';
  const logo = sh.logoDataUrl ? await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = sh.logoDataUrl; }) : null;

  const qtyX = lX + 412, step = 30, barH = 44;
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  const mItems = items.map((it) => { const nl = wrapTxt(ctx, it.name || 'Item', 350), q = Number(it.qty) || 1, u = Number(it.price) || 0; return { nl, q, u, amt: q * u, h: nl.length * step + (q > 1 ? 22 : 0) }; });
  ctx.font = '800 32px Inter, system-ui, sans-serif'; const nameL = wrapTxt(ctx, shopName, cntW - 20);
  ctx.font = '600 18px Inter, system-ui, sans-serif'; const footL = wrapTxt(ctx, sh.footer || 'Thank you for shopping with us!', cntW - 24);
  const meta = [['Receipt No.', tx.receiptNo || 'DF-RECEIPT', true], ['Date', tx.date || todayISO(), true], ['Customer', tx.customerName || 'Valued Customer', true], ...(tx.customerPhone ? [['Phone', tx.customerPhone, false]] : [])];

  const cH = 40 + (logo ? 120 : 8) + nameL.length * 40 + 48 + meta.length * 32 + 12 + barH + 22 + mItems.reduce((s, m, i) => s + m.h + 18 + (i < mItems.length - 1 ? 20 : 0), 0) + 42 + ((del > 0 || dis > 0) ? 32 : 0) + (del > 0 ? 32 : 0) + (dis > 0 ? 32 : 0) + 94 + (isPart ? 104 : isFullCod ? 70 : 64) + 16 + footL.length * 26 + 26;
  canvas.width = W; canvas.height = cH + pad * 2;

  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, W, canvas.height);
  ctx.save(); ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; rRect(ctx, cX, pad, cW, cH, 28); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  ctx.save(); rRect(ctx, cX, pad, cW, cH, 28); ctx.clip();

  const tg = ctx.createLinearGradient(cX, pad, cX + cW, pad); tg.addColorStop(0, '#4f46e5'); tg.addColorStop(0.55, '#8b5cf6'); tg.addColorStop(1, sh.hex || '#f59e0b');
  ctx.fillStyle = tg; ctx.fillRect(cX, pad, cW, 14);
  ctx.textBaseline = 'top'; let y = pad + 40;
  if (logo) { const lx = (W - 96) / 2; ctx.save(); rRect(ctx, lx, y, 96, 96, 24); ctx.clip(); ctx.drawImage(logo, lx, y, 96, 96); ctx.restore(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rRect(ctx, lx, y, 96, 96, 24); ctx.stroke(); y += 120; } else y += 8;

  ctx.fillStyle = '#0f172a'; ctx.font = '800 32px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
  nameL.forEach((l) => { ctx.fillText(l, W / 2, y); y += 40; }); y += 18;

  const notch = (yy) => { ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.moveTo(lX, yy); ctx.lineTo(rX, yy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(cX, yy, 13, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.beginPath(); ctx.arc(cX + cW, yy, 13, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.restore(); };
  const kv = (l, r, b = true, rc = '#0f172a') => { ctx.textAlign = 'left'; ctx.fillStyle = '#64748b'; ctx.font = '600 18px Inter, system-ui, sans-serif'; ctx.fillText(l, lX, y); ctx.textAlign = 'right'; ctx.fillStyle = rc; ctx.font = `${b ? '700' : '600'} 18px Inter, system-ui, sans-serif`; ctx.fillText(r, rX, y); y += 32; };
  notch(y); y += 30; meta.forEach(([k, v, b]) => kv(k, v, b));

  y += 12; rRect(ctx, lX, y, cntW, barH, 10); ctx.fillStyle = '#f8fafc'; ctx.fill();
  ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = '#64748b'; ctx.font = '700 14px Inter, system-ui, sans-serif';
  const mid = y + barH / 2; ctx.textAlign = 'left'; ctx.fillText('ITEM', lX + 14, mid); ctx.textAlign = 'center'; ctx.fillText('QTY', qtyX, mid); ctx.textAlign = 'right'; ctx.fillText('AMOUNT', rX - 14, mid); ctx.restore();
  y += barH + 22;

  mItems.forEach((m, idx) => {
    const ty = y; ctx.textAlign = 'left'; ctx.fillStyle = '#0f172a'; ctx.font = '700 20px Inter, system-ui, sans-serif';
    m.nl.forEach((l, li) => ctx.fillText(l, lX + 14, ty + li * step));
    if (m.q > 1) { ctx.fillStyle = '#94a3b8'; ctx.font = '600 15px Inter, system-ui, sans-serif'; ctx.fillText(`${fmtMoney(m.u)} each`, lX + 14, ty + m.nl.length * step + 2); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#475569'; ctx.font = '700 19px Inter, system-ui, sans-serif'; ctx.fillText(`×${m.q}`, qtyX, ty);
    ctx.textAlign = 'right'; ctx.fillStyle = '#0f172a'; ctx.font = '700 20px Inter, system-ui, sans-serif'; ctx.fillText(fmtMoney(m.amt), rX - 14, ty);
    y += m.h + 18;
    if (idx < mItems.length - 1) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lX + 6, y); ctx.lineTo(rX - 6, y); ctx.stroke(); y += 20; }
  });

  y += 12; notch(y); y += 30;
  if (del > 0 || dis > 0) kv('Subtotal', fmtMoney(sub), false);
  if (del > 0) kv('Delivery Fee', `+${fmtMoney(del)}`, false);
  if (dis > 0) kv('Discount', `-${fmtMoney(dis)}`, false, '#e11d48');

  y += 10; const bg = ctx.createLinearGradient(lX, y, rX, y); bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#312e81');
  rRect(ctx, lX, y, cntW, 68, 18); ctx.fillStyle = bg; ctx.fill();
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#e0e7ff'; ctx.font = '700 20px Inter, system-ui, sans-serif'; ctx.fillText('Total', lX + 22, y + 34);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = '800 28px Inter, system-ui, sans-serif'; ctx.fillText(fmtMoney(tot), rX - 22, y + 34); ctx.restore();
  y += 84;

  const amberBox = (label, amt) => {
    rRect(ctx, lX, y, cntW, 56, 14); ctx.fillStyle = '#fffbeb'; ctx.fill(); ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#b45309'; ctx.font = '700 17px Inter, system-ui, sans-serif'; ctx.fillText(label, lX + 18, y + 28);
    ctx.textAlign = 'right'; ctx.fillStyle = '#92400e'; ctx.font = '800 22px Inter, system-ui, sans-serif'; ctx.fillText(fmtMoney(amt), rX - 18, y + 28); ctx.restore(); y += 70;
  };
  if (isPart) { ctx.textAlign = 'left'; ctx.fillStyle = '#047857'; ctx.font = '700 18px Inter, system-ui, sans-serif'; ctx.fillText('Paid', lX + 14, y + 2); ctx.textAlign = 'right'; ctx.fillText(`-${fmtMoney(pUp)}`, rX - 14, y + 2); y += 34; amberBox('COD Balance (To Pay)', cA); }
  else if (isFullCod) amberBox('Cash on Delivery (COD)', cA);
  else {
    rRect(ctx, lX, y, cntW, 50, 14); ctx.fillStyle = '#ecfdf5'; ctx.fill(); ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#047857'; ctx.font = '800 17px Inter, system-ui, sans-serif';
    ctx.fillText(isCodDone ? '✓  PAID IN FULL (COD Received)' : '✓  PAID IN FULL', W / 2, y + 25); ctx.restore(); y += 64;
  }

  y += 16; ctx.textAlign = 'center'; ctx.fillStyle = '#64748b'; ctx.font = '600 18px Inter, system-ui, sans-serif';
  footL.forEach((l) => { ctx.fillText(l, W / 2, y); y += 26; });
  ctx.restore();
}

export async function openReceiptModal(tx) {
  state.activeReceiptTx = tx;
  $('receipt-modal').classList.remove('hidden');
  await drawReceipt(tx);
}

export function openShopEntry(tx) {
  if (!tx) return;
  if (isSaleTx(tx)) openReceiptModal(tx);
  else openShopTxModal('capital', tx);
}

// --- ONE-TIME LAZY EVENT BINDINGS ---
export function initShopModule() {
  if (shopBound) return;
  shopBound = true;

  $('hero-pending-cod-btn').onclick = () => {
    state.shopFilterActive = true;
    state.shopFilters.category = 'all';
    state.shopFilters.type = 'pending_cod';
    state.shopFilters.month = 'all';
    state.shopHistoryMode = 'list';
    switchView('history', { keepShopFilter: true, historySub: 'shop' });
  };
  $('shop-view-all-history-btn').onclick = () => switchView('history', { historySub: 'shop' });
  $('manage-shops-btn')?.addEventListener('click', openManageShops);

  // Shop Analytics controls (Per-Shop + Month)
  $('sa-shop-select')?.addEventListener('change', (e) => { state.shopAnalyticsShopId = e.target.value; renderShopAnalytics(); });
  $('sa-month-select').onchange = (e) => { state.shopAnalyticsMonth = e.target.value; renderShopAnalytics(); };
  const shiftSa = (d) => { const c = state.shopAnalyticsMonth === 'all' ? curMonth() : state.shopAnalyticsMonth, [y, m] = c.split('-').map(Number), nd = new Date(y, m - 1 + d, 1); state.shopAnalyticsMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; renderShopAnalytics(); };
  $('sa-prev-month').onclick = () => shiftSa(-1);
  $('sa-next-month').onclick = () => shiftSa(1);

  // Shop History Calendar & Mode toggles
  $('shop-history-mode-list')?.addEventListener('click', () => { state.shopHistoryMode = 'list'; renderShopHistory(); });
  $('shop-history-mode-calendar')?.addEventListener('click', () => { state.shopHistoryMode = 'calendar'; state.shopCalendarMonth = state.shopFilters.month !== 'all' ? state.shopFilters.month : curMonth(); renderShopHistory(); });
  const shiftShopCal = (d) => { const [y, m] = (state.shopCalendarMonth || curMonth()).split('-').map(Number), nd = new Date(y, m - 1 + d, 1); state.shopCalendarMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; renderShopCalendar(); };
  $('shop-cal-prev-month')?.addEventListener('click', () => shiftShopCal(-1));
  $('shop-cal-next-month')?.addEventListener('click', () => shiftShopCal(1));
  $('shop-cal-today-btn')?.addEventListener('click', () => { state.shopCalendarMonth = curMonth(); state.shopCalendarSelectedDate = todayISO(); renderShopCalendar(); });
  $('shop-cal-add-for-date-btn')?.addEventListener('click', () => openShopTxModal('sale', null, state.shopFilters.category !== 'all' ? state.shopFilters.category : null, state.shopCalendarSelectedDate));

  // Sale / Capital Modal
  $('stx-modal-close').onclick = () => $('shop-tx-modal').classList.add('hidden');
  $('shop-tx-modal').onclick = (e) => { if (e.target.id === 'shop-tx-modal') $('shop-tx-modal').classList.add('hidden'); };
  document.querySelectorAll('.stx-mode-btn').forEach((b) => (b.onclick = () => {
    if (state.shopDraft.editId) return;
    state.shopDraft.mode = b.dataset.stxMode;
    renderShopTxControls();
  }));
  $('stx-add-item-btn').onclick = () => { state.shopDraft.items.push({ name: '', qty: 1, price: '' }); renderItemRows(); };
  ['stx-delivery', 'stx-discount'].forEach((id) => ($(id).oninput = () => { fmtAmtInput($(id)); computeSale(true); }));
  $('stx-capital-amount').oninput = () => fmtAmtInput($('stx-capital-amount'));
  $('stx-btn-full-paid').onclick = () => { state.shopDraft.splitMode = 'full_paid'; computeSale(true); };
  $('stx-btn-full-cod').onclick = () => { state.shopDraft.splitMode = 'full_cod'; computeSale(true); };

  // Clamp both active and opposite Paid/COD fields when input exceeds order grand total
  $('stx-paid-amount').oninput = () => {
    state.shopDraft.splitMode = 'custom';
    fmtAmtInput($('stx-paid-amount'));
    const { grand } = computeSale(false);
    const raw = parseAmt($('stx-paid-amount').value);
    const clamped = Math.min(grand, raw);
    if (raw > grand) $('stx-paid-amount').value = fmtNum(clamped);
    $('stx-cod-amount').value = fmtNum(Math.max(0, grand - clamped));
  };
  $('stx-cod-amount').oninput = () => {
    state.shopDraft.splitMode = 'custom';
    fmtAmtInput($('stx-cod-amount'));
    const { grand } = computeSale(false);
    const raw = parseAmt($('stx-cod-amount').value);
    const clamped = Math.min(grand, raw);
    if (raw > grand) $('stx-cod-amount').value = fmtNum(clamped);
    $('stx-paid-amount').value = fmtNum(Math.max(0, grand - clamped));
  };

  $('stx-delete-btn').onclick = () => {
    const id = state.shopDraft.editId; if (!id) return;
    $('shop-tx-modal').classList.add('hidden');
    openConfirm('Delete Shop Entry?', 'Your linked wallet balance will adjust automatically.', async () => {
      try { await delTx(id); toast('Deleted', 'success'); }
      catch { toast('Could not delete entry', 'error'); }
    }, 'Delete');
  };

  $('stx-form').onsubmit = async (e) => {
    e.preventDefault(); const err = $('stx-error'), btn = $('stx-submit-btn'); err.classList.add('hidden');
    const { mode, shopCategoryId, costSubType, wallet, editId } = state.shopDraft, sale = mode === 'sale';
    const date = $('stx-date').value || todayISO(), note = $('stx-note').value.trim(), sh = getShop(shopCategoryId);
    let payload;
    if (sale) {
      const cleanItems = state.shopDraft.items.map((it) => ({ name: (it.name || '').trim() || sh.name, qty: Math.max(1, Number(it.qty) || 1), price: parseAmt(it.price) })).filter((it) => it.price > 0);
      const { subtotal, delivery, discount, grand, paid, cod } = computeSale(false);
      if (!cleanItems.length || grand <= 0) { err.textContent = 'Enter at least one item price so total > 0.'; err.classList.remove('hidden'); return; }
      const ex = editId ? state.transactions.find((t) => t.id === editId) : null;
      const wasPaid = Boolean(editId && state.shopDraft.existingCodStatus === 'paid' && cod > 0);
      const cSt = cod <= 0 ? 'none' : (wasPaid ? 'paid' : 'pending');
      payload = {
        type: 'income', scope: 'shop', shopEntryType: 'sale',
        amount: paid + (cSt === 'paid' ? cod : 0), orderTotal: grand, paidAmount: paid, codAmount: cod,
        codStatus: cSt, codWallet: wasPaid ? state.shopDraft.existingCodWallet : '', codPaidDate: wasPaid ? state.shopDraft.existingCodPaidDate : '',
        subtotal, deliveryFee: delivery, discount, items: cleanItems, receiptNo: ex?.receiptNo || genReceiptNo(date),
        customerName: $('stx-customer').value.trim(), customerPhone: $('stx-customer-phone').value.trim(),
        shopCategoryId: sh.id, shopCategoryName: sh.name, category: sh.name,
        wallet, fromWallet: '', toWallet: '', date, loggedBy: 'shop', note
      };
    } else {
      const amount = parseAmt($('stx-capital-amount').value);
      if (amount <= 0) { err.textContent = 'Enter a capital/cost amount greater than 0.'; err.classList.remove('hidden'); return; }
      payload = {
        type: 'expense', scope: 'shop', shopEntryType: 'capital', amount, costSubType,
        shopCategoryId: sh.id, shopCategoryName: sh.name, category: `${sh.name} (${costSubType})`,
        wallet, fromWallet: '', toWallet: '', date, loggedBy: 'shop', note
      };
    }
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const saved = await saveTx(payload, editId);
      $('shop-tx-modal').classList.add('hidden');
      toast(sale ? (payload.codStatus === 'pending' ? 'Sale saved (Pending COD tracked)!' : 'Sale saved & wallet updated!') : 'Capital saved & wallet updated!', 'success');
      if (sale && !editId && $('stx-open-receipt').checked) openReceiptModal(saved);
    } catch { err.textContent = 'Could not save entry.'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = editId ? 'Update Entry' : (sale ? 'Save Sale' : 'Save Capital / Cost'); }
  };

  // Mark COD Paid Modal
  const closeCod = () => $('cod-pay-modal').classList.add('hidden');
  $('cod-pay-close').onclick = closeCod; $('cod-pay-cancel').onclick = closeCod;
  $('cod-pay-modal').onclick = (e) => { if (e.target.id === 'cod-pay-modal') closeCod(); };
  $('cod-pay-confirm').onclick = async () => {
    const tx = state.transactions.find((t) => t.id === state.codPayDraft.txId); if (!tx) return closeCod();
    const btn = $('cod-pay-confirm'); btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const pUp = paidUpfront(tx), cA = codAmtOf(tx);
      await saveTx({ codStatus: 'paid', codWallet: state.codPayDraft.wallet, codPaidDate: $('cod-pay-date').value || todayISO(), amount: pUp + cA }, tx.id);
      closeCod();
      toast(`COD ${fmtMoney(cA)} added to ${getWallet(state.codPayDraft.wallet).name}!`, 'success');
    } catch { toast('Could not mark COD paid', 'error'); }
    finally { btn.disabled = false; btn.textContent = '✓ Confirm Paid'; }
  };

  // Receipt Modal
  $('receipt-modal-close').onclick = () => $('receipt-modal').classList.add('hidden');
  $('receipt-modal').onclick = (e) => { if (e.target.id === 'receipt-modal') $('receipt-modal').classList.add('hidden'); };
  $('receipt-edit-sale-btn').onclick = () => { const tx = state.activeReceiptTx; if (!tx) return; $('receipt-modal').classList.add('hidden'); openShopTxModal('sale', tx); };
  $('receipt-copy-text-btn').onclick = () => { if (state.activeReceiptTx) copyText(buildReceiptText(state.activeReceiptTx), 'Text receipt copied!'); };
  $('receipt-download-btn').onclick = () => {
    const fn = `${state.activeReceiptTx?.receiptNo || 'DelightsFlow_Receipt'}.png`;
    $('receipt-canvas').toBlob((blob) => {
      if (blob) downloadBlob(blob, fn);
      else Object.assign(document.createElement('a'), { href: $('receipt-canvas').toDataURL('image/png'), download: fn }).click();
      toast('Receipt PNG downloaded!', 'success');
    }, 'image/png');
  };
  $('receipt-share-btn').onclick = () => {
    const fn = `${state.activeReceiptTx?.receiptNo || 'DelightsFlow_Receipt'}.png`;
    $('receipt-canvas').toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], fn, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Customer Receipt' }); return; } catch {} }
      downloadBlob(blob, fn);
      toast('Saved PNG — ready to send!', 'info');
    }, 'image/png');
  };

  // Manage Shops Modal
  $('shop-settings-close').onclick = () => $('shop-settings-modal').classList.add('hidden');
  $('shop-settings-modal').onclick = (e) => { if (e.target.id === 'shop-settings-modal') $('shop-settings-modal').classList.add('hidden'); };
  $('shop-logo-file-input').onchange = (e) => {
    const file = e.target.files?.[0], idx = state.logoUploadTargetIdx;
    if (!file || idx < 0 || !state.settingsShopsDraft[idx]) return;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const sc = Math.min(1, 160 / Math.max(im.width, im.height));
        const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(im.width * sc)), height: Math.max(1, Math.round(im.height * sc)) });
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        state.settingsShopsDraft[idx].logoDataUrl = c.toDataURL('image/jpeg', 0.82);
        renderShopsEditor(); toast('Logo ready — click Save Shops', 'success');
      };
      im.src = String(r.result);
    };
    r.readAsDataURL(file);
  };
  $('add-shop-btn').onclick = () => {
    const id = `shop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 4)}`;
    state.settingsShopsDraft.push({ id, name: `Shop ${state.settingsShopsDraft.length + 1}`, colorKey: COLORS[state.settingsShopsDraft.length % COLORS.length].key, startingCapital: 0, footer: 'Thank you for your purchase!', logoDataUrl: '' });
    renderShopsEditor(id);
  };
  $('shop-settings-form').onsubmit = async (e) => {
    e.preventDefault(); const btn = $('shop-settings-save-btn'); btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await persistShopsDraft();
      $('shop-settings-modal').classList.add('hidden'); toast('Shops saved!', 'success');
    } catch { toast('Could not save shops', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save Shops'; }
  };

  // Shop History Filters (Debounced Search — re-renders ONLY Shop History/Calendar)
  let shopSearchTimer = 0;
  $('shop-search').oninput = (e) => { clearTimeout(shopSearchTimer); shopSearchTimer = setTimeout(() => { state.shopFilters.search = e.target.value; renderShopHistory(); }, 150); };
  $('shop-filter-month').onchange = (e) => { state.shopFilters.month = e.target.value; if (e.target.value !== 'all') state.shopCalendarMonth = e.target.value; renderShopHistory(); };
  $('shop-filter-cat').onchange = (e) => { state.shopFilters.category = e.target.value; state.shopFilterActive = e.target.value !== 'all'; renderShopHistory(); };
  $('shop-filter-type').onchange = (e) => { state.shopFilters.type = e.target.value; renderShopHistory(); };
  $('shop-reset-filters-btn').onclick = () => { state.shopFilterActive = false; state.shopFilters = { search: '', month: curMonth(), category: 'all', type: 'all' }; $('shop-search').value = ''; renderShopHistory(); };
  $('export-shop-csv-btn').onclick = () => {
    const rows = getFilteredShop(); if (!rows.length) return toast('No shop records to export', 'info');
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Date','Type','Receipt No','Shop','Customer','Items / Cost Type','Order Total','Paid','COD','COD Status','Currency','Wallet','COD Wallet','Note'].join(',')];
    rows.forEach((t) => {
      const s = isSaleTx(t);
      lines.push([
        q(t.date), q(s ? 'Sale' : 'Capital'), q(t.receiptNo || ''), q(getShop(t.shopCategoryId, t.shopCategoryName).name),
        q(t.customerName || ''), q(s ? (t.items || []).map((i) => `${i.name} x${i.qty}`).join('; ') : (t.costSubType || 'Capital')),
        s ? orderTot(t) : (Number(t.amount) || 0), s ? paidUpfront(t) : 0, s ? codAmtOf(t) : 0, q(s ? codStatusOf(t) : ''),
        q(state.workspace.currency), q(getWallet(t.wallet).name), q(s && t.codWallet ? getWallet(t.codWallet).name : ''), q(t.note || '')
      ].join(','));
    });
    downloadBlob(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `DelightsFlow_Shop_${todayISO()}.csv`);
    toast(`Exported ${rows.length} rows`, 'success');
  };
}