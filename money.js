// Delights Flow — Money Module (Overview, History/Calendar, Analytics, Split Wallets/Settings Modals, Person Colors, Backup/Restore)

import {
  COLORS, COLOR_MAP, DEFAULT_PERSON_COLORS, W_ICONS, PALETTE, state,
  $, esc, todayISO, curMonth, isValidPerson, getOwner, personName, getPersonColor,
  fmtNum, fmtMoney, fmtDisp, fmtCompact, parseAmt, parseSigned, fmtAmtInput,
  fmtMonth, fmtDateHead, getWallets, getWallet, getCats, catIcon,
  getShopSplit, orderTot, codStatusOf, computeBalances, getAvailableMonths, matchesScope,
  toast, copyText, downloadBlob, openConfirm, killChart, ensureChartJs,
  switchView, openOnboarding, saveUserProfile, subscribeWs,
  patchWs, saveTx, batchSaveTxs, delTx
} from './core.js';

let shopTxHandler = null;
let chartErrNotified = false;
let isRestoringBackup = false;

// --- PERIOD & WALLET-ACCURATE CASHFLOW HELPERS ---
// Counts upfront paid on order date/wallet and COD paid on codPaidDate/codWallet.
// Works for both YYYY-MM months and YYYY-MM-DD exact dates (via startsWith).
function incomeInPeriod(t, periodKey, walletFilter = 'all') {
  if (t.type !== 'income') return 0;
  const sp = getShopSplit(t);
  if (!sp) {
    if (walletFilter !== 'all' && t.wallet !== walletFilter) return 0;
    return (periodKey === 'all' || t.date?.startsWith(periodKey)) ? (Number(t.amount) || 0) : 0;
  }
  let sum = 0;
  if (sp.paid > 0 && (periodKey === 'all' || t.date?.startsWith(periodKey)) && (walletFilter === 'all' || t.wallet === walletFilter)) {
    sum += sp.paid;
  }
  if (sp.codPaid && (periodKey === 'all' || (t.codPaidDate || t.date || '').startsWith(periodKey)) && (walletFilter === 'all' || sp.codWallet === walletFilter)) {
    sum += sp.cod;
  }
  return sum;
}

function expenseInPeriod(t, periodKey, walletFilter = 'all') {
  if (t.type !== 'expense') return 0;
  if (walletFilter !== 'all' && t.wallet !== walletFilter) return 0;
  return (periodKey === 'all' || t.date?.startsWith(periodKey)) ? (Number(t.amount) || 0) : 0;
}

// --- FILTERED MONEY LIST ---
function getFiltered(overrideMonth = null) {
  const { search, wallet, type, person, scope } = state.filters;
  const month = overrideMonth !== null ? overrideMonth : state.filters.month;
  const q = search.trim().toLowerCase();

  return state.transactions.filter((t) => {
    if (type !== 'all' && t.type !== type) return false;
    if (person !== 'all' && getOwner(t) !== person) return false;
    if (!matchesScope(t, scope)) return false;

    const sp = getShopSplit(t);
    if (sp) {
      // Evaluate date + wallet together so cross-month/split-wallet COD only matches relevant slices
      const upfrontMatch = (month === 'all' || t.date?.startsWith(month)) && (wallet === 'all' || t.wallet === wallet) && (sp.paid > 0 || sp.codPending);
      const codMatch = sp.codPaid && (month === 'all' || (t.codPaidDate || t.date || '').startsWith(month)) && (wallet === 'all' || sp.codWallet === wallet);
      if (!upfrontMatch && !codMatch) return false;
    } else {
      if (month !== 'all' && !t.date?.startsWith(month)) return false;
      if (wallet !== 'all') {
        if (t.type === 'transfer') {
          if (t.fromWallet !== wallet && t.toWallet !== wallet) return false;
        } else if (t.wallet !== wallet) {
          return false;
        }
      }
    }

    if (q) {
      const wn = t.type === 'transfer'
        ? `${getWallet(t.fromWallet).name} ${getWallet(t.toWallet).name}`
        : `${getWallet(t.wallet).name}${sp?.codPaid && sp.codWallet !== t.wallet ? ` ${getWallet(sp.codWallet).name}` : ''}`;
      if (![t.note, t.category, t.customerName, t.receiptNo, wn, personName(getOwner(t)), t.amount].join(' ').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// --- SHARED TRANSACTION ROW ---
// Accepts optional filter context { periodKey, walletFilter } so split COD rows display the exact slice matching the active view.
function rowHTML(t, showDate = false, ctx = null) {
  const id = esc(t.id), isTr = t.type === 'transfer', isInc = t.type === 'income', isShop = t.scope === 'shop', sp = getShopSplit(t);
  const sub = [t.customerName, t.note].filter(Boolean).join(' · ');
  let wHtml = '';
  if (isTr) {
    const fw = getWallet(t.fromWallet), tw = getWallet(t.toWallet);
    wHtml = `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${fw.hex}20;color:${fw.hex}">${esc(fw.name)}</span><span class="text-slate-400 text-[11px] font-bold">→</span><span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${tw.hex}20;color:${tw.hex}">${esc(tw.name)}</span>`;
  } else if (sp) {
    const w = getWallet(t.wallet);
    if (sp.paid > 0 || !sp.codPending) wHtml += `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${w.hex}20;color:${w.hex}">${esc(w.name)}</span>`;
    if (sp.codPaid && sp.codWallet && sp.codWallet !== t.wallet) {
      const cw = getWallet(sp.codWallet);
      wHtml += `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${cw.hex}20;color:${cw.hex}">COD → ${esc(cw.name)}</span>`;
    }
    if (sp.codPending) wHtml += `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">⏳ COD: ${fmtMoney(sp.cod)}</span>`;
  } else {
    const w = getWallet(t.wallet);
    wHtml = `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${w.hex}20;color:${w.hex}">${esc(w.name)}</span>`;
  }

  const pendOnly = Boolean(sp?.codPending && sp.paid <= 0);
  const amtCls = pendOnly ? 'text-amber-600 dark:text-amber-400' : isInc ? 'text-emerald-600 dark:text-emerald-400' : isTr ? 'text-sky-600' : 'text-rose-600 dark:text-rose-400';

  let displayAmt = Number(t.amount) || 0;
  let sliceSubHtml = '';
  if (sp && ctx && !pendOnly) {
    const slice = incomeInPeriod(t, ctx.periodKey ?? 'all', ctx.walletFilter ?? 'all');
    if (slice > 0 && slice !== displayAmt) {
      displayAmt = slice;
      sliceSubHtml = `<div class="text-[10px] font-semibold text-slate-400 text-right tabular-nums">of ${fmtMoney(t.amount)}</div>`;
    }
  }

  const amtTxt = pendOnly ? `COD ${fmtMoney(sp.cod)}` : `${isInc ? '+' : isTr ? '' : '-'}${fmtMoney(displayAmt)}`;
  const ok = getOwner(t), pn = personName(ok), pc = getPersonColor(ok);
  const pTxt = ok === 'shop' ? '🛍️ Shop ↗' : ok === 'shared' ? `👥 ${esc(pn)}` : esc(pn);
  const codDateHint = sp?.codPaid && t.codPaidDate && t.codPaidDate !== t.date ? `<span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">COD ${esc(t.codPaidDate)}</span>` : '';

  return `<div class="px-4 sm:px-5 py-3.5 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" data-edit-tx="${id}" title="${isShop ? 'Open Receipt / Edit Shop Entry' : 'Edit'}">
      <div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">${catIcon(t)}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap"><span class="text-sm font-bold truncate">${isTr ? 'Transfer' : esc(t.category || (isInc ? 'Income' : 'Expense'))}</span>${sub ? `<span class="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-xs">· ${esc(sub)}</span>` : ''}</div>
        <div class="flex items-center gap-1.5 flex-wrap mt-1">${wHtml}<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold" style="background:${pc.hex}20;color:${pc.hex}">${pTxt}</span>${codDateHint}${showDate ? `<span class="text-[11px] text-slate-400 font-medium">${esc(t.date || '')}</span>` : ''}</div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0"><div class="cursor-pointer text-right" data-edit-tx="${id}"><div class="text-sm sm:text-base font-extrabold tabular-nums ${amtCls}">${amtTxt}</div>${sliceSubHtml}</div><button type="button" aria-label="Delete transaction" data-del-tx="${id}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">✕</button></div>
  </div>`;
}

function bindRows(el) {
  el.querySelectorAll('[data-edit-tx]').forEach((n) => n.addEventListener('click', () => {
    const tx = state.transactions.find((t) => t.id === n.dataset.editTx);
    if (!tx) return;
    if (tx.scope === 'shop') { shopTxHandler?.(tx); return; }
    openTxModal(tx);
  }));
  el.querySelectorAll('[data-del-tx]').forEach((n) => n.addEventListener('click', (e) => {
    e.stopPropagation();
    openConfirm('Delete Transaction?', 'Wallet balances will update automatically.', async () => {
      try {
        await delTx(n.dataset.delTx);
        toast('Transaction deleted', 'success');
      } catch {
        toast('Could not delete transaction', 'error');
      }
    }, 'Delete');
  }));
}

// --- VIEW 1: OVERVIEW ---
export function renderOverview() {
  const ws = getWallets(), bal = computeBalances(), total = Object.values(bal).reduce((a, b) => a + b, 0), cm = curMonth();
  let mIn = 0, mOut = 0;
  state.transactions.forEach((t) => { mIn += incomeInPeriod(t, cm); mOut += expenseInPeriod(t, cm); });
  const mNet = mIn - mOut;

  $('hero-wallet-count-label').textContent = `Total Net Balance (${ws.length} ${ws.length === 1 ? 'Wallet' : 'Wallets'})`;
  $('overview-wallets-title').textContent = `Your Wallets (${ws.length})`;
  $('overview-month-pill').textContent = fmtMonth(cm);
  $('hero-total-balance').textContent = fmtDisp(total);
  $('hero-month-income').textContent = fmtDisp(mIn, true);
  $('hero-month-expense').textContent = state.privacyMode ? '••••••' : `-${fmtMoney(mOut)}`;
  $('hero-month-net').textContent = fmtDisp(mNet, true);
  $('hero-month-net').className = `text-base sm:text-lg font-extrabold tabular-nums text-right break-words ${mNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`;

  const wg = $('wallets-grid');
  wg.innerHTML = ws.map((w) => {
    const b = bal[w.id] || 0;
    return `<button type="button" data-wc="${esc(w.id)}" class="text-left bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 shadow-sm active:scale-[0.98] transition-all flex flex-col justify-between gap-3">
      <div class="flex items-center justify-between gap-2 w-full"><div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style="background:${w.hex}20;color:${w.hex}">${w.icon}</div><span class="px-2.5 py-1 rounded-full text-[11px] font-bold truncate" style="background:${w.hex}20;color:${w.hex}">${esc(w.name)}</span></div>
      <div class="min-w-0"><p class="text-[11px] font-medium text-slate-400">Live Balance</p><p class="text-base sm:text-lg font-extrabold tabular-nums truncate mt-0.5 ${!state.privacyMode && b < 0 ? 'text-rose-600 dark:text-rose-400' : ''}">${fmtDisp(b)}</p></div>
    </button>`;
  }).join('');
  wg.querySelectorAll('[data-wc]').forEach((b) => b.addEventListener('click', () => {
    state.walletFilterActive = true; state.filters.wallet = b.dataset.wc; state.filters.month = 'all';
    switchView('history', { keepWalletFilter: true, historySub: 'money' });
  }));

  // Quick Templates (validates active wallets before 1-tap logging)
  const tg = $('quick-templates-grid'), tpls = state.workspace.quickTemplates || [];
  const activeWalletIds = new Set(ws.map((w) => w.id));
  if (!tpls.length) {
    tg.innerHTML = `<button type="button" id="empty-tpl-btn" class="col-span-2 sm:col-span-3 lg:col-span-4 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:border-indigo-400 text-center"><p class="text-xs sm:text-sm font-bold">⚡ Create a Quick Template</p><p class="text-[11px] text-slate-400 mt-0.5">Save frequent entries for 1-tap logging</p></button>`;
    $('empty-tpl-btn')?.addEventListener('click', openTemplatesModal);
  } else {
    tg.innerHTML = tpls.map((tpl) => {
      const wt = tpl.type === 'transfer' ? `${getWallet(tpl.fromWallet).name} → ${getWallet(tpl.toWallet).name}` : getWallet(tpl.wallet).name;
      const missingW = tpl.type === 'transfer'
        ? (!activeWalletIds.has(tpl.fromWallet) || !activeWalletIds.has(tpl.toWallet))
        : !activeWalletIds.has(tpl.wallet);
      const cls = tpl.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : tpl.type === 'transfer' ? 'text-sky-600' : 'text-rose-600 dark:text-rose-400';
      const pc = getPersonColor(tpl.loggedBy);
      return `<button type="button" data-rtpl="${esc(tpl.id)}" class="text-left p-3.5 rounded-2xl bg-white dark:bg-slate-900 border ${missingW ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200/80 dark:border-slate-800'} hover:border-indigo-400 shadow-sm active:scale-[0.97] flex flex-col justify-between gap-2">
        <div class="flex items-center justify-between gap-1.5 w-full"><span class="text-base leading-none">${catIcon(tpl.type, tpl.category)}</span><span class="text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[85px]" style="background:${pc.hex}20;color:${pc.hex}">${esc(personName(tpl.loggedBy))}</span></div>
        <div class="min-w-0"><p class="text-xs sm:text-sm font-bold truncate">${esc(tpl.title)}</p><p class="text-[11px] ${missingW ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'} truncate">${missingW ? '⚠ Update wallet' : esc(wt)}</p></div>
        <div class="text-xs sm:text-sm font-extrabold tabular-nums ${cls} truncate">${tpl.type === 'income' ? '+' : tpl.type === 'transfer' ? '' : '-'}${fmtMoney(tpl.amount)}</div>
      </button>`;
    }).join('');
    tg.querySelectorAll('[data-rtpl]').forEach((b) => b.addEventListener('click', async () => {
      const tpl = tpls.find((t) => t.id === b.dataset.rtpl); if (!tpl) return;
      const isTr = tpl.type === 'transfer';
      const missingW = isTr
        ? (!activeWalletIds.has(tpl.fromWallet) || !activeWalletIds.has(tpl.toWallet))
        : !activeWalletIds.has(tpl.wallet);
      if (missingW) {
        toast('Wallet in this template was removed — please update it.', 'info');
        openTemplatesModal();
        return;
      }
      try {
        await saveTx({
          type: tpl.type || 'expense', scope: 'personal', amount: Number(tpl.amount) || 0, date: todayISO(),
          note: tpl.note || tpl.title || '', loggedBy: isValidPerson(tpl.loggedBy) ? tpl.loggedBy : state.activePerson,
          wallet: isTr ? '' : tpl.wallet,
          fromWallet: isTr ? tpl.fromWallet : '', toWallet: isTr ? tpl.toWallet : '',
          category: isTr ? 'Transfer' : (tpl.category || 'Other')
        });
        toast(`Logged "${tpl.title}"`, 'success');
      } catch { toast('Could not log template', 'error'); }
    }));
  }

  const rec = state.transactions.slice(0, 8), rEl = $('recent-transactions-list');
  rEl.innerHTML = rec.length ? rec.map((t) => rowHTML(t, true)).join('') : `<div class="p-8 text-center text-xs text-slate-400">No transactions yet. Tap <strong>+ New Entry</strong> to begin.</div>`;
  if (rec.length) bindRows(rEl);
}

// --- FILTER DROPDOWNS ---
function populateFilters() {
  const ms = getAvailableMonths(), ws = getWallets();
  $('filter-month').innerHTML = `<option value="all">All Months</option>${ms.map((m) => `<option value="${m}">${fmtMonth(m)}</option>`).join('')}`;
  $('filter-month').value = ms.includes(state.filters.month) || state.filters.month === 'all' ? state.filters.month : 'all';
  $('analytics-month-select').innerHTML = `${ms.map((m) => `<option value="${m}">${fmtMonth(m)}</option>`).join('')}<option value="all">All Time</option>`;
  $('analytics-month-select').value = ms.includes(state.analyticsMonth) || state.analyticsMonth === 'all' ? state.analyticsMonth : curMonth();
  $('filter-wallet').innerHTML = `<option value="all">All Wallets (${ws.length})</option>${ws.map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}`;
  if (state.filters.wallet !== 'all' && !ws.some((w) => w.id === state.filters.wallet)) state.filters.wallet = 'all';
  $('filter-wallet').value = state.filters.wallet;
  const fp = $('filter-person');
  if (fp?.options?.[2]) { fp.options[1].text = personName('person1'); fp.options[2].text = personName('person2'); }
}

// --- VIEW 2: MONEY HISTORY & CALENDAR (CROSS-MONTH & SPLIT-WALLET COD ACCURATE) ---
function renderCalendar() {
  const mk = state.calendarMonth || curMonth(), [y, m] = mk.split('-').map(Number);
  const wf = state.filters.wallet;
  $('cal-month-title').textContent = fmtMonth(mk);
  const txs = getFiltered(mk);

  const byDay = {};
  const addDayItem = (iso, t) => {
    const bucket = byDay[iso] ||= { in: 0, out: 0, tr: 0, items: [], seen: new Set() };
    if (!bucket.seen.has(t.id)) {
      bucket.seen.add(t.id);
      bucket.items.push(t);
    }
    return bucket;
  };

  txs.forEach((t) => {
    const sp = getShopSplit(t);
    if (sp) {
      // Bucket upfront payment (or pending-only COD order) on order date
      if (t.date?.startsWith(mk) && (wf === 'all' || t.wallet === wf) && (sp.paid > 0 || sp.codPending)) {
        const d = addDayItem(t.date, t);
        if (sp.paid > 0) d.in += sp.paid;
      }
      // Bucket paid COD on its actual received date (codPaidDate)
      const cDate = t.codPaidDate || t.date;
      if (sp.codPaid && cDate?.startsWith(mk) && (wf === 'all' || sp.codWallet === wf)) {
        const d = addDayItem(cDate, t);
        d.in += sp.cod;
      }
      return;
    }

    if (!t.date?.startsWith(mk)) return;
    const d = addDayItem(t.date, t);
    if (t.type === 'income') d.in += Number(t.amount) || 0;
    else if (t.type === 'expense') d.out += Number(t.amount) || 0;
    else d.tr++;
  });

  const firstDow = new Date(y, m - 1, 1).getDay(), dim = new Date(y, m, 0).getDate(), td = todayISO();
  if (!state.calendarSelectedDate?.startsWith(mk)) state.calendarSelectedDate = td.startsWith(mk) ? td : `${mk}-01`;
  let cells = '<div class="min-h-[58px] rounded-2xl bg-slate-50/40 dark:bg-slate-900/30"></div>'.repeat(firstDow);
  for (let d = 1; d <= dim; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, info = byDay[iso], sel = iso === state.calendarSelectedDate;
    const cls = sel ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500'
      : iso === td ? 'bg-slate-50 dark:bg-slate-800 border-indigo-300 dark:border-indigo-700'
      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800';
    cells += `<button type="button" data-cd="${iso}" class="min-h-[58px] p-1.5 rounded-2xl border text-left flex flex-col justify-between ${cls}">
      <div class="flex items-center justify-between w-full"><span class="text-[11px] font-extrabold ${sel ? 'text-indigo-700 dark:text-indigo-300' : ''}">${d}</span>${info?.tr ? '<span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>' : ''}</div>
      <div class="w-full overflow-hidden space-y-0.5">${info?.in ? `<div class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">+${fmtCompact(info.in)}</div>` : ''}${info?.out ? `<div class="text-[9px] font-bold text-rose-600 dark:text-rose-400 truncate">-${fmtCompact(info.out)}</div>` : ''}</div>
    </button>`;
  }
  const cg = $('calendar-days-grid'); cg.innerHTML = cells;
  cg.querySelectorAll('[data-cd]').forEach((b) => b.addEventListener('click', () => { state.calendarSelectedDate = b.dataset.cd; renderCalendar(); }));

  const si = byDay[state.calendarSelectedDate] || { in: 0, out: 0, items: [] };
  const dayCtx = { periodKey: state.calendarSelectedDate, walletFilter: wf };
  $('cal-selected-date-title').textContent = fmtDateHead(state.calendarSelectedDate);
  $('cal-selected-date-summary').textContent = si.items.length ? `${si.items.length} entries · In ${fmtMoney(si.in)} · Out ${fmtMoney(si.out)}` : 'No entries recorded';
  const dl = $('cal-selected-day-list');
  dl.innerHTML = si.items.length ? si.items.map((t) => rowHTML(t, false, dayCtx)).join('') : `<div class="p-6 text-center text-xs text-slate-400">No entries on this date.</div>`;
  if (si.items.length) bindRows(dl);
}

export function renderMoneyHistory() {
  populateFilters();
  $('filter-type').value = state.filters.type;
  $('filter-person').value = state.filters.person;
  $('filter-scope').value = state.filters.scope;
  const isCal = state.historyMode === 'calendar';
  $('history-mode-list').className = !isCal ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500';
  $('history-mode-calendar').className = isCal ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500';
  $('history-calendar-wrap').classList.toggle('hidden', !isCal);
  $('history-grouped-list').classList.toggle('hidden', isCal);

  const f = state.filters, rows = getFiltered(), mk = f.month, wf = f.wallet;
  let sIn = 0, sOut = 0;
  rows.forEach((t) => { sIn += incomeInPeriod(t, mk, wf); sOut += expenseInPeriod(t, mk, wf); });
  $('history-summary-stats').innerHTML = `<span class="text-slate-600 dark:text-slate-300">${rows.length} entries</span><span class="text-emerald-600 dark:text-emerald-400">+${fmtMoney(sIn)}</span><span class="text-rose-600 dark:text-rose-400">-${fmtMoney(sOut)}</span>`;
  $('clear-filters-btn').classList.toggle('hidden', !(f.search || f.wallet !== 'all' || f.type !== 'all' || f.person !== 'all' || f.scope !== 'all' || f.month !== curMonth()));
  if (isCal) return renderCalendar();

  const box = $('history-grouped-list');
  if (!rows.length) { box.innerHTML = `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-10 text-center text-xs text-slate-400">No matching transactions.</div>`; return; }

  // Group under codPaidDate whenever only the COD slice matches the active month or wallet filter
  const groups = new Map();
  rows.forEach((t) => {
    const sp = getShopSplit(t);
    let k = t.date || 'Unknown';
    if (sp?.codPaid) {
      const upfrontMatches = (sp.paid > 0 || sp.codPending) && (mk === 'all' || t.date?.startsWith(mk)) && (wf === 'all' || t.wallet === wf);
      const codMatches = (mk === 'all' || (t.codPaidDate || t.date || '').startsWith(mk)) && (wf === 'all' || sp.codWallet === wf);
      if (!upfrontMatches && codMatches && t.codPaidDate) {
        k = t.codPaidDate;
      }
    }
    (groups.get(k) || groups.set(k, []).get(k)).push(t);
  });

  const listCtx = { periodKey: mk, walletFilter: wf };
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  box.innerHTML = sortedGroups.map(([dk, items]) => {
    let dIn = 0, dOut = 0;
    items.forEach((t) => {
      dIn += incomeInPeriod(t, mk, wf);
      dOut += expenseInPeriod(t, mk, wf);
    });
    const net = dIn - dOut;
    return `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"><div class="px-4 sm:px-5 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between text-xs font-bold"><span>${esc(fmtDateHead(dk))}</span><span class="tabular-nums ${net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-600' : 'text-slate-400'}">${dIn === 0 && dOut === 0 ? 'Transfer / COD' : fmtMoney(net, true)}</span></div><div class="divide-y divide-slate-100 dark:divide-slate-800/70">${items.map((t) => rowHTML(t, false, listCtx)).join('')}</div></div>`;
  }).join('');
  bindRows(box);
}

// --- VIEW 3: MONEY ANALYTICS ---
export function renderMoneyAnalytics() {
  populateFilters();
  if (state.currentView !== 'analytics' || state.analyticsSub !== 'money') return;
  $('analytics-scope-select').value = state.analyticsScope;
  const sm = state.analyticsMonth, sc = state.analyticsScope;

  let inc = 0, exp = 0;
  const catMap = {}, pStats = { person1: { in: 0, out: 0 }, person2: { in: 0, out: 0 }, shared: { in: 0, out: 0 }, shop: { in: 0, out: 0 } };
  state.transactions.forEach((t) => {
    if (!matchesScope(t, sc)) return;
    const pk = getOwner(t), iv = incomeInPeriod(t, sm), ev = expenseInPeriod(t, sm);
    if (iv > 0) { inc += iv; pStats[pk].in += iv; }
    if (ev > 0) { exp += ev; pStats[pk].out += ev; catMap[t.category || 'Other'] = (catMap[t.category || 'Other'] || 0) + ev; }
  });

  const net = inc - exp;
  $('kpi-income').textContent = fmtMoney(inc);
  $('kpi-expense').textContent = fmtMoney(exp);
  $('kpi-net').textContent = fmtMoney(net, true);
  $('kpi-net').className = `text-base sm:text-xl font-extrabold mt-1 tabular-nums break-words ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  $('kpi-rate').textContent = `${inc > 0 ? Math.round((net / inc) * 100) : 0}%`;

  const tc = state.darkMode ? '#cbd5e1' : '#475569', gc = state.darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.07)', hasC = typeof Chart !== 'undefined';
  if (!hasC) {
    ensureChartJs().then((ok) => {
      if (ok) {
        chartErrNotified = false;
        if (state.currentView === 'analytics' && state.analyticsSub === 'money') renderMoneyAnalytics();
      } else if (!chartErrNotified) {
        chartErrNotified = true;
        toast('Charts need internet once to cache.', 'info', { label: 'Retry', onClick: () => { chartErrNotified = false; renderMoneyAnalytics(); } });
      }
    });
  }

  killChart('expenseCategory');
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  $('empty-expense-chart').classList.toggle('hidden', cats.length > 0);
  if (cats.length && hasC) state.charts.expenseCategory = new Chart($('chart-expense-category').getContext('2d'), { type: 'doughnut', data: { labels: cats.map((c) => c[0]), datasets: [{ data: cats.map((c) => c[1]), backgroundColor: cats.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtMoney(ctx.raw)}` } } } } });
  $('category-breakdown-list').innerHTML = cats.length ? cats.map(([n, v], i) => {
    const pct = exp > 0 ? ((v / exp) * 100).toFixed(1) : '0.0', col = PALETTE[i % PALETTE.length];
    return `<div class="space-y-1"><div class="flex justify-between text-xs font-semibold"><span class="flex items-center gap-2 truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${col}"></span>${esc(n)}</span><span class="tabular-nums">${fmtMoney(v)} <span class="text-slate-400">(${pct}%)</span></span></div><div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" style="width:${pct}%;background:${col}"></div></div></div>`;
  }).join('') : `<p class="text-xs text-slate-400 text-center">No expense data.</p>`;

  killChart('incomeExpense');
  const base = sm === 'all' ? new Date() : new Date(Number(sm.split('-')[0]), Number(sm.split('-')[1]) - 1, 1);
  const tms = Array.from({ length: 6 }, (_, idx) => { const d = new Date(base.getFullYear(), base.getMonth() - (5 - idx), 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  if (hasC) state.charts.incomeExpense = new Chart($('chart-income-expense').getContext('2d'), {
    type: 'bar',
    data: {
      labels: tms.map(fmtMonth),
      datasets: [
        { label: 'Income', data: tms.map((mk) => state.transactions.filter((t) => matchesScope(t, sc)).reduce((s, t) => s + incomeInPeriod(t, mk), 0)), backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Expense', data: tms.map((mk) => state.transactions.filter((t) => matchesScope(t, sc)).reduce((s, t) => s + expenseInPeriod(t, mk), 0)), backgroundColor: '#f43f5e', borderRadius: 6 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc } } }, scales: { x: { ticks: { color: tc }, grid: { display: false } }, y: { ticks: { color: tc }, grid: { color: gc } } } }
  });

  killChart('walletDistribution');
  const ws = getWallets(), bal = computeBalances(), wc = $('chart-wallet-distribution');
  $('analytics-wallets-chart-title').textContent = `Live Balance Across ${ws.length} ${ws.length === 1 ? 'Wallet' : 'Wallets'}`;
  if (wc?.parentElement) wc.parentElement.style.height = `${Math.max(220, ws.length * 42)}px`;
  if (hasC && wc) state.charts.walletDistribution = new Chart(wc.getContext('2d'), { type: 'bar', data: { labels: ws.map((w) => w.name), datasets: [{ label: 'Live Balance', data: ws.map((w) => bal[w.id] || 0), backgroundColor: ws.map((w) => w.hex), borderRadius: 8, maxBarThickness: 28 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${fmtMoney(ctx.raw)}` } } }, scales: { x: { ticks: { color: tc }, grid: { color: gc } }, y: { ticks: { color: tc, font: { weight: 'bold' } }, grid: { display: false } } } } });

  killChart('personBreakdown');
  const p1 = personName('person1'), p2 = personName('person2');
  const p1Hex = getPersonColor('person1').hex, p2Hex = getPersonColor('person2').hex;
  const groups = sc === 'shop' ? [{ l: 'Shop', n: '🛍️ Shop', st: pStats.shop, d: '#f59e0b' }]
    : sc === 'personal' ? [{ l: p1, n: p1, st: pStats.person1, d: p1Hex }, { l: p2, n: p2, st: pStats.person2, d: p2Hex }, { l: 'Shared', n: '👥 Shared', st: pStats.shared, d: '#14b8a6' }]
    : [{ l: p1, n: p1, st: pStats.person1, d: p1Hex }, { l: p2, n: p2, st: pStats.person2, d: p2Hex }, { l: 'Shared', n: '👥 Shared', st: pStats.shared, d: '#14b8a6' }, { l: 'Shop', n: '🛍️ Shop', st: pStats.shop, d: '#f59e0b' }];
  if (hasC) state.charts.personBreakdown = new Chart($('chart-person-breakdown').getContext('2d'), { type: 'bar', data: { labels: groups.map((g) => g.l), datasets: [{ label: 'Income', data: groups.map((g) => g.st.in), backgroundColor: '#10b981', borderRadius: 8 }, { label: 'Expense', data: groups.map((g) => g.st.out), backgroundColor: '#6366f1', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc } } }, scales: { x: { ticks: { color: tc }, grid: { display: false } }, y: { ticks: { color: tc }, grid: { color: gc } } } } });
  const totOut = groups.reduce((s, g) => s + g.st.out, 0), ce = $('person-comparison-cards');
  ce.className = `grid gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 ${groups.length === 1 ? 'grid-cols-1' : groups.length === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`;
  ce.innerHTML = groups.map((p) => `<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 space-y-1 text-xs"><div class="flex justify-between font-bold"><span class="flex items-center gap-1.5 truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${p.d}"></span>${esc(p.n)}</span><span class="text-slate-400">${totOut > 0 ? Math.round((p.st.out / totOut) * 100) : 0}%</span></div><div class="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">Out: ${fmtMoney(p.st.out)}</div><div class="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">In: ${fmtMoney(p.st.in)}</div></div>`).join('');
}

// --- MODAL 1: TRANSACTION ENTRY / EDIT (PRESERVES ARCHIVED WALLETS ON EDIT) ---
const renderWPills = (id, sel, cb) => {
  const box = $(id);
  const ws = getWallets();
  const list = [...ws];
  if (sel && !ws.some((w) => w.id === sel)) {
    const aw = getWallet(sel);
    list.push({ id: sel, name: `${aw.name} (Archived)`, hex: aw.hex });
  }
  box.innerHTML = list.map((w) => `<button type="button" data-pw="${esc(w.id)}" class="px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${w.id === sel ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${w.hex}"></span><span class="truncate">${esc(w.name)}</span></button>`).join('');
  box.querySelectorAll('[data-pw]').forEach((b) => b.addEventListener('click', () => cb(b.dataset.pw)));
};

function renderTxControls() {
  const ws = getWallets(), fId = ws[0]?.id || 'cash', sId = ws[1]?.id || fId, d = state.txDraft;
  if (!d.wallet || (!d.editId && !ws.some((w) => w.id === d.wallet))) d.wallet = fId;
  if (!d.fromWallet || (!d.editId && !ws.some((w) => w.id === d.fromWallet))) d.fromWallet = fId;
  if (!d.toWallet || (!d.editId && !ws.some((w) => w.id === d.toWallet))) d.toWallet = sId;

  document.querySelectorAll('.tx-type-tab').forEach((b) => {
    const t = b.dataset.txType;
    b.className = t === d.type ? `tx-type-tab py-2.5 rounded-xl text-sm font-bold text-white shadow-sm ${t === 'income' ? 'bg-emerald-600' : t === 'transfer' ? 'bg-sky-600' : 'bg-rose-600'}` : 'tx-type-tab py-2.5 rounded-xl text-sm font-bold text-slate-500';
  });
  const isTr = d.type === 'transfer';
  $('tx-single-wallet-wrap').classList.toggle('hidden', isTr);
  $('tx-category-wrap').classList.toggle('hidden', isTr);
  $('tx-transfer-wallets-wrap').classList.toggle('hidden', !isTr);
  if (isTr) {
    renderWPills('tx-from-wallet-pills', d.fromWallet, (id) => { d.fromWallet = id; renderTxControls(); });
    renderWPills('tx-to-wallet-pills', d.toWallet, (id) => { d.toWallet = id; renderTxControls(); });
  } else {
    $('tx-wallet-label').textContent = d.type === 'income' ? 'Deposit Into Wallet' : 'Paid From Wallet';
    renderWPills('tx-wallet-pills', d.wallet, (id) => { d.wallet = id; renderTxControls(); });
    const cats = getCats(d.type); if (!cats.some((c) => c.name === d.category)) d.category = cats[0]?.name || 'Other';
    const cg = $('tx-category-grid');
    cg.innerHTML = cats.map((c) => `<button type="button" data-pc="${esc(c.name)}" class="px-2 py-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${c.name === d.category ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}"><span class="text-base leading-none">${c.icon}</span><span class="truncate max-w-full">${esc(c.name)}</span></button>`).join('');
    cg.querySelectorAll('[data-pc]').forEach((b) => b.addEventListener('click', () => { d.category = b.dataset.pc; renderTxControls(); }));
  }
  document.querySelectorAll('.tx-person-toggle').forEach((b) => {
    const k = b.dataset.txPerson, c = getPersonColor(k), active = k === d.person;
    b.innerHTML = `<span class="inline-flex items-center justify-center gap-1 max-w-full"><span class="w-2 h-2 rounded-full shrink-0" style="background:${c.hex}"></span><span class="truncate">${esc(personName(k))}</span></span>`;
    b.className = active ? 'tx-person-toggle py-2 px-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 shadow-sm truncate' : 'tx-person-toggle py-2 px-1.5 rounded-lg text-xs font-bold text-slate-500 truncate';
    b.style.color = active ? c.hex : '';
  });
}

export function openTxModal(tx = null, presetDate = null) {
  const ws = getWallets(), fId = ws[0]?.id || 'cash', sId = ws[1]?.id || fId;
  $('tx-form-error').classList.add('hidden');
  $('custom-cat-inline').classList.add('hidden');
  $('tx-currency-badge').textContent = state.workspace.currency || 'Ks';
  $('tx-save-as-template').checked = false;
  state.txDraft = tx
    ? { editId: tx.id, type: tx.type || 'expense', wallet: tx.wallet || fId, fromWallet: tx.fromWallet || fId, toWallet: tx.toWallet || sId, category: tx.category || 'Other', person: isValidPerson(tx.loggedBy) ? tx.loggedBy : 'person1' }
    : { editId: null, type: 'expense', wallet: state.filters.wallet !== 'all' ? state.filters.wallet : fId, fromWallet: fId, toWallet: sId, category: 'Food & Dining', person: state.activePerson };
  $('tx-modal-title').textContent = tx ? 'Edit Transaction' : 'New Transaction';
  $('tx-submit-btn').textContent = tx ? 'Update Entry' : 'Save Entry';
  $('tx-delete-in-modal-btn').classList.toggle('hidden', !tx);
  $('tx-save-template-wrap').classList.toggle('hidden', Boolean(tx));
  $('tx-amount').value = tx ? fmtNum(tx.amount) : '';
  $('tx-date').value = tx?.date || presetDate || todayISO();
  $('tx-note').value = tx?.note || '';
  renderTxControls();
  $('tx-modal').classList.remove('hidden');
}

// --- MODAL 2A: DEDICATED MANAGE WALLETS (WARNS BEFORE REMOVING ACTIVE/NON-ZERO WALLETS) ---
function renderManageWalletsList(focusId = null) {
  const box = $('settings-wallets-list'), cur = state.workspace.currency || 'Ks', canDel = state.settingsDraftWallets.length > 1;
  box.innerHTML = state.settingsDraftWallets.map((w, i) => {
    const col = COLOR_MAP[w.colorKey] || COLORS[0], open = state.openColorPickerWalletId === w.id;
    return `<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-2" data-wrow="${esc(w.id)}">
      <div class="flex items-center gap-2"><button type="button" data-tp="${esc(w.id)}" aria-label="Pick wallet color" class="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0"><span class="w-4 h-4 rounded-full" style="background:${col.hex}"></span></button><input type="text" maxlength="28" required placeholder="e.g. KPay1, KBZ Bank" value="${esc(w.name)}" data-dn="${i}" class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold" /><button type="button" aria-label="Remove wallet" data-dr="${i}" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 ${canDel ? '' : 'opacity-30'}">✕</button></div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <select data-di="${i}" class="col-span-4 px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"><option value="cash" ${w.iconType==='cash'?'selected':''}>Cash</option><option value="bank" ${w.iconType==='bank'?'selected':''}>Bank</option><option value="mobile" ${w.iconType==='mobile'?'selected':''}>Mobile Pay</option><option value="card" ${w.iconType==='card'?'selected':''}>Card / Pay</option></select>
        <button type="button" data-tp="${esc(w.id)}" class="col-span-3 px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 truncate"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${col.hex}"></span><span class="truncate">${col.label}</span></button>
        <div class="col-span-5 relative flex items-center"><input type="text" inputmode="text" placeholder="0 or -5,000" value="${fmtNum(w.openingBalance || 0)}" data-dob="${i}" class="w-full px-2.5 py-2 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold tabular-nums" /><span class="absolute right-2 text-[11px] font-semibold text-slate-400 pointer-events-none">${esc(cur)}</span></div>
      </div>
      ${open ? `<div class="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex flex-wrap gap-2">${COLORS.map((c) => `<button type="button" data-pc="${i}:${c.key}" title="${c.label}" class="w-7 h-7 rounded-full flex items-center justify-center ${c.key === w.colorKey ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : ''}" style="background:${c.hex}">${c.key === w.colorKey ? '<span class="text-white text-xs font-bold">✓</span>' : ''}</button>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  box.querySelectorAll('[data-dn]').forEach((el) => el.addEventListener('input', () => (state.settingsDraftWallets[+el.dataset.dn].name = el.value)));
  box.querySelectorAll('[data-di]').forEach((el) => el.addEventListener('change', () => (state.settingsDraftWallets[+el.dataset.di].iconType = el.value)));
  box.querySelectorAll('[data-tp]').forEach((b) => b.addEventListener('click', () => { state.openColorPickerWalletId = state.openColorPickerWalletId === b.dataset.tp ? null : b.dataset.tp; renderManageWalletsList(); }));
  box.querySelectorAll('[data-pc]').forEach((b) => b.addEventListener('click', () => { const [i, k] = b.dataset.pc.split(':'); state.settingsDraftWallets[+i].colorKey = k; state.openColorPickerWalletId = null; renderManageWalletsList(); }));
  box.querySelectorAll('[data-dob]').forEach((el) => { el.addEventListener('input', () => (state.settingsDraftWallets[+el.dataset.dob].openingBalance = parseSigned(el.value))); el.addEventListener('blur', () => { const v = parseSigned(el.value); state.settingsDraftWallets[+el.dataset.dob].openingBalance = v; el.value = fmtNum(v); }); });
  box.querySelectorAll('[data-dr]').forEach((b) => b.addEventListener('click', () => {
    if (state.settingsDraftWallets.length <= 1) return toast('Keep at least 1 wallet', 'info');
    const idx = +b.dataset.dr;
    const target = state.settingsDraftWallets[idx];
    if (!target) return;
    const liveBal = computeBalances()[target.id] || 0;
    const txCount = state.transactions.filter((t) => t.wallet === target.id || t.fromWallet === target.id || t.toWallet === target.id || t.codWallet === target.id).length;
    if (liveBal !== 0 || txCount > 0) {
      const parts = [];
      if (liveBal !== 0) parts.push(`a live balance of ${fmtMoney(liveBal)}`);
      if (txCount > 0) parts.push(`${txCount} recorded ${txCount === 1 ? 'entry' : 'entries'}`);
      openConfirm(
        `Remove "${target.name || 'Wallet'}"?`,
        `This wallet has ${parts.join(' and ')}. Removing it will exclude its balance from Total Net Balance (past history will keep its archived name).`,
        () => {
          const curIdx = state.settingsDraftWallets.findIndex((x) => x.id === target.id);
          if (curIdx >= 0 && state.settingsDraftWallets.length > 1) {
            state.settingsDraftWallets.splice(curIdx, 1);
            renderManageWalletsList();
          }
        },
        'Remove'
      );
      return;
    }
    state.settingsDraftWallets.splice(idx, 1);
    renderManageWalletsList();
  }));
  if (focusId) box.querySelector(`[data-wrow="${focusId}"] input[data-dn]`)?.focus();
}

export function openWalletsModal() {
  state.openColorPickerWalletId = null;
  state.settingsDraftWallets = getWallets().map((w) => ({ id: w.id, name: w.name, iconType: w.iconType, colorKey: w.colorKey, openingBalance: Number(state.workspace.openingBalances?.[w.id]) || 0 }));
  renderManageWalletsList();
  $('wallets-modal').classList.remove('hidden');
}

// --- MODAL 2B: DEDICATED SETTINGS (PERSON 1 & PERSON 2 TAG COLOR PICKER) ---
function renderPersonColorControls() {
  const c1 = COLOR_MAP[state.settingsPersonColorsDraft.person1] || COLOR_MAP.indigo;
  const c2 = COLOR_MAP[state.settingsPersonColorsDraft.person2] || COLOR_MAP.fuchsia;
  const b1 = $('setting-p1-color-btn'), b2 = $('setting-p2-color-btn'), tray = $('setting-person-color-picker');
  if (b1) b1.innerHTML = `<span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:${c1.hex}"></span><span class="truncate">${c1.label}</span>`;
  if (b2) b2.innerHTML = `<span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:${c2.hex}"></span><span class="truncate">${c2.label}</span>`;

  const active = state.openPersonColorPicker;
  if (!tray) return;
  if (!active) { tray.classList.add('hidden'); tray.innerHTML = ''; return; }
  const curKey = state.settingsPersonColorsDraft[active] || DEFAULT_PERSON_COLORS[active];
  const label = active === 'person1' ? ($('setting-person1')?.value.trim() || 'Person 1') : ($('setting-person2')?.value.trim() || 'Person 2');
  tray.classList.remove('hidden');
  tray.innerHTML = `<div class="flex items-center justify-between text-[11px] font-bold text-slate-500"><span>Tag color for ${esc(label)}</span><button type="button" id="close-person-color-tray" class="text-slate-400 hover:text-slate-600">Done</button></div>
    <div class="flex flex-wrap gap-2">${COLORS.map((c) => `<button type="button" data-pcol="${c.key}" title="${c.label}" class="w-7 h-7 rounded-full flex items-center justify-center ${c.key === curKey ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : ''}" style="background:${c.hex}">${c.key === curKey ? '<span class="text-white text-xs font-bold">✓</span>' : ''}</button>`).join('')}</div>`;
  tray.querySelector('#close-person-color-tray')?.addEventListener('click', () => { state.openPersonColorPicker = null; renderPersonColorControls(); });
  tray.querySelectorAll('[data-pcol]').forEach((b) => b.addEventListener('click', () => {
    state.settingsPersonColorsDraft[active] = b.dataset.pcol;
    state.openPersonColorPicker = null;
    renderPersonColorControls();
  }));
}

export function openSettingsModal() {
  state.openPersonColorPicker = null;
  $('setting-ws-name').value = state.workspace.name || 'My Ledger';
  $('setting-currency').value = state.workspace.currency || 'Ks';
  $('setting-person1').value = state.workspace.userNames?.person1 || 'Person 1';
  $('setting-person2').value = state.workspace.userNames?.person2 || 'Person 2';
  state.settingsPersonColorsDraft = {
    person1: getPersonColor('person1').key,
    person2: getPersonColor('person2').key
  };
  renderPersonColorControls();
  $('setting-ws-id-display').textContent = state.workspaceId;
  $('setting-join-pin').value = state.workspace.joinPin || '';
  $('setting-ws-switcher').innerHTML = state.userWorkspaces.map((w) => `<option value="${esc(w.id)}">${esc(w.name)} (${esc(w.id)})</option>`).join('');
  $('setting-ws-switcher').value = state.workspaceId;
  $('settings-modal').classList.remove('hidden');
}

// --- MODAL 3: QUICK TEMPLATES ---
function populateTplSelects() {
  const ws = getWallets(), type = $('tpl-type').value, opts = ws.map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('');
  const pw = $('tpl-wallet').value, pto = $('tpl-to-wallet').value;
  $('tpl-wallet').innerHTML = opts; $('tpl-to-wallet').innerHTML = opts;
  if (ws.some((w) => w.id === pw)) $('tpl-wallet').value = pw;
  if (ws.some((w) => w.id === pto)) $('tpl-to-wallet').value = pto; else if (ws[1]) $('tpl-to-wallet').value = ws[1].id;
  $('tpl-to-wallet').classList.toggle('hidden', type !== 'transfer');
  $('tpl-category').classList.toggle('hidden', type === 'transfer');
  if (type !== 'transfer') $('tpl-category').innerHTML = getCats(type).map((c) => `<option value="${esc(c.name)}">${c.icon} ${esc(c.name)}</option>`).join('');
  $('tpl-person').options[0].text = personName('person1');
  $('tpl-person').options[1].text = personName('person2');
}

function resetTplForm() {
  $('tpl-edit-id').value = '';
  $('tpl-form-heading').textContent = 'Add Template';
  $('tpl-submit-btn').textContent = 'Save Template';
  $('tpl-cancel-edit-btn').classList.add('hidden');
  $('tpl-title').value = ''; $('tpl-amount').value = ''; $('tpl-type').value = 'expense';
  $('tpl-person').value = state.activePerson; $('tpl-note').value = '';
  populateTplSelects();
}

function renderTplList() {
  const list = state.workspace.quickTemplates || [], box = $('templates-modal-list');
  if (!list.length) { box.innerHTML = `<p class="text-xs text-slate-400 text-center py-3">No templates yet.</p>`; return; }
  box.innerHTML = list.map((t) => `<div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
    <div class="min-w-0"><p class="text-xs font-bold truncate">${catIcon(t.type, t.category)} ${esc(t.title)}</p><p class="text-[11px] text-slate-400">${fmtMoney(t.amount)} · ${esc(personName(t.loggedBy))}</p></div>
    <div class="flex items-center gap-1 shrink-0"><button type="button" data-etpl="${esc(t.id)}" class="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">Edit</button><button type="button" data-dtpl="${esc(t.id)}" class="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50">Delete</button></div>
  </div>`).join('');

  box.querySelectorAll('[data-etpl]').forEach((b) => b.addEventListener('click', () => {
    const t = list.find((x) => x.id === b.dataset.etpl); if (!t) return;
    $('tpl-edit-id').value = t.id;
    $('tpl-form-heading').textContent = 'Edit Template';
    $('tpl-submit-btn').textContent = 'Update Template';
    $('tpl-cancel-edit-btn').classList.remove('hidden');
    $('tpl-title').value = t.title || '';
    $('tpl-amount').value = fmtNum(t.amount || 0);
    $('tpl-type').value = t.type || 'expense';
    populateTplSelects();
    const wsIds = new Set(getWallets().map((w) => w.id));
    const targetFrom = t.type === 'transfer' ? t.fromWallet : t.wallet;
    if (wsIds.has(targetFrom)) $('tpl-wallet').value = targetFrom;
    if (t.type === 'transfer' && wsIds.has(t.toWallet)) $('tpl-to-wallet').value = t.toWallet;
    if (t.type !== 'transfer' && t.category) $('tpl-category').value = t.category;
    $('tpl-person').value = isValidPerson(t.loggedBy) ? t.loggedBy : 'person1';
    $('tpl-note').value = t.note || '';
    $('tpl-title').focus();
  }));

  box.querySelectorAll('[data-dtpl]').forEach((b) => b.addEventListener('click', async () => {
    try { await patchWs({ quickTemplates: list.filter((t) => t.id !== b.dataset.dtpl) }); if ($('tpl-edit-id').value === b.dataset.dtpl) resetTplForm(); renderTplList(); toast('Template removed', 'info'); }
    catch { toast('Could not remove template', 'error'); }
  }));
}

export function openTemplatesModal() {
  resetTplForm(); renderTplList();
  $('templates-modal').classList.remove('hidden');
}

// --- CSV EXPORT (INCLUDES ORDER TOTAL & COD STATUS FOR SHOP SALES) ---
function exportCSV() {
  const rows = getFiltered(); if (!rows.length) return toast('No entries to export', 'info');
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Date','Scope','Type','Amount','Order Total','COD Status','Currency','Wallet/From','To Wallet','Category','Owner','Note'].join(',')];
  rows.forEach((t) => {
    const isShopSale = t.scope === 'shop' && t.type === 'income';
    const cStatus = isShopSale ? codStatusOf(t) : '';
    const codLabel = cStatus === 'pending' ? 'Pending COD' : cStatus === 'paid' ? 'COD Paid' : '';
    lines.push([
      q(t.date), q(t.scope === 'shop' ? 'Shop' : 'Personal'), q(t.type), Number(t.amount) || 0,
      isShopSale ? orderTot(t) : '', q(codLabel), q(state.workspace.currency),
      q(t.type === 'transfer' ? getWallet(t.fromWallet).name : getWallet(t.wallet).name),
      q(t.type === 'transfer' ? getWallet(t.toWallet).name : ''),
      q(t.type === 'transfer' ? 'Transfer' : t.category), q(personName(getOwner(t))), q(t.note || '')
    ].join(','));
  });
  downloadBlob(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `DelightsFlow_${state.filters.month}.csv`);
  toast(`Exported ${rows.length} rows`, 'success');
}

// --- BATCHED, DUPLICATE-SAFE JSON BACKUP/RESTORE ---
function importBackup(file) {
  if (isRestoringBackup) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const p = JSON.parse(String(r.result || '{}'));
      if (!p?.settings || !Array.isArray(p.transactions)) return toast('Invalid backup JSON', 'error');
      openConfirm('Restore Backup?', `Import settings & up to ${p.transactions.length} entries (including Shop & COD data) into "${state.workspace.name}"?`, async () => {
        if (isRestoringBackup) return;
        isRestoringBackup = true;
        const btn = $('backup-import-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Restoring...'; }
        try {
          const patch = {};
          ['wallets', 'archivedWalletNames', 'openingBalances', 'userNames', 'userColors', 'currency', 'quickTemplates', 'customExpenseCategories', 'customIncomeCategories', 'shopCategories', 'shopProfile'].forEach((k) => {
            if (p.settings[k] !== undefined) patch[k] = p.settings[k];
          });
          await patchWs(patch);

          // Count-based signature + ID matching preserves legitimate identical same-day entries
          const sig = (t) => `${t.date}|${t.scope || 'personal'}|${t.type}|${Number(t.amount) || 0}|${Number(t.orderTotal) || 0}|${t.receiptNo || ''}|${t.wallet || ''}|${t.fromWallet || ''}|${t.toWallet || ''}|${t.category || ''}|${t.note || ''}`;
          const existingIds = new Set(state.transactions.map((t) => t.id).filter(Boolean));
          const existingSigCounts = new Map();
          state.transactions.forEach((t) => {
            const k = sig(t);
            existingSigCounts.set(k, (existingSigCounts.get(k) || 0) + 1);
          });

          const toAdd = [];
          for (const t of p.transactions) {
            const isShop = t?.scope === 'shop';
            const hasVal = Number(t?.amount) > 0 || (isShop && Number(t?.orderTotal) > 0);
            if (!t?.type || !hasVal) continue;
            if (t.id && existingIds.has(t.id)) continue;

            const clean = {
              type: t.type, scope: isShop ? 'shop' : 'personal',
              amount: Number(t.amount) || 0, date: t.date || todayISO(), note: t.note || '',
              loggedBy: isShop ? 'shop' : (isValidPerson(t.loggedBy) ? t.loggedBy : 'person1'),
              wallet: t.type === 'transfer' ? '' : (t.wallet || 'cash'),
              fromWallet: t.type === 'transfer' ? (t.fromWallet || '') : '',
              toWallet: t.type === 'transfer' ? (t.toWallet || '') : '',
              category: t.type === 'transfer' ? 'Transfer' : (t.category || 'Other')
            };
            if (Number.isFinite(Number(t.createdAt))) clean.createdAt = Number(t.createdAt);
            if (isShop) {
              ['shopEntryType', 'orderTotal', 'paidAmount', 'codAmount', 'codStatus', 'codWallet', 'codPaidDate', 'subtotal', 'deliveryFee', 'discount', 'items', 'receiptNo', 'customerName', 'customerPhone', 'shopCategoryId', 'shopCategoryName', 'costSubType'].forEach((k) => {
                if (t[k] !== undefined) clean[k] = t[k];
              });
            }

            const k = sig(clean);
            const rem = existingSigCounts.get(k) || 0;
            if (rem > 0) {
              existingSigCounts.set(k, rem - 1);
              continue;
            }
            toAdd.push(clean);
          }

          const added = await batchSaveTxs(toAdd);
          $('settings-modal').classList.add('hidden');
          toast(`Restored settings & ${added} new entries`, 'success');
        } catch {
          toast('Could not restore backup', 'error');
        } finally {
          isRestoringBackup = false;
          if (btn) { btn.disabled = false; btn.textContent = '↑ Restore JSON'; }
        }
      }, 'Restore');
    } catch { toast('Could not read JSON file', 'error'); }
  };
  r.readAsText(file);
}

// --- EVENT BINDINGS ---
export function bindMoneyEvents({ onOpenShopTx } = {}) {
  shopTxHandler = onOpenShopTx || null;

  $('overview-view-all-btn').onclick = () => switchView('history', { historySub: 'money' });
  if ($('overview-edit-wallets-btn')) $('overview-edit-wallets-btn').onclick = openWalletsModal;
  ['desktop-settings-btn', 'mobile-settings-btn', 'sidebar-open-sync'].forEach((id) => { if ($(id)) $(id).onclick = openSettingsModal; });

  // Transaction Modal
  $('desktop-add-btn').onclick = () => openTxModal(null);
  $('tx-modal-close').onclick = () => $('tx-modal').classList.add('hidden');
  $('tx-modal').onclick = (e) => { if (e.target.id === 'tx-modal') $('tx-modal').classList.add('hidden'); };
  document.querySelectorAll('.tx-type-tab').forEach((b) => b.addEventListener('click', () => { state.txDraft.type = b.dataset.txType; renderTxControls(); }));
  document.querySelectorAll('.tx-person-toggle').forEach((b) => b.addEventListener('click', () => { state.txDraft.person = b.dataset.txPerson; renderTxControls(); }));
  $('tx-swap-wallets-btn').onclick = () => { [state.txDraft.fromWallet, state.txDraft.toWallet] = [state.txDraft.toWallet, state.txDraft.fromWallet]; renderTxControls(); };
  $('tx-amount').oninput = () => fmtAmtInput($('tx-amount'));
  $('tpl-amount').oninput = () => fmtAmtInput($('tpl-amount'));
  document.querySelectorAll('.quick-amt-btn').forEach((b) => b.addEventListener('click', () => ($('tx-amount').value = fmtNum(parseAmt($('tx-amount').value) + Number(b.dataset.quickAmt)))));

  $('toggle-add-custom-cat').onclick = () => { $('custom-cat-inline').classList.toggle('hidden'); $('custom-cat-input').focus(); };
  $('save-custom-cat-btn').onclick = async () => {
    const name = $('custom-cat-input').value.trim(); if (!name) return;
    try {
      const k = state.txDraft.type === 'income' ? 'customIncomeCategories' : 'customExpenseCategories', list = [...(state.workspace[k] || [])];
      if (!list.some((c) => c.toLowerCase() === name.toLowerCase())) { list.push(name); await patchWs({ [k]: list }); }
      state.txDraft.category = name; $('custom-cat-input').value = ''; $('custom-cat-inline').classList.add('hidden'); renderTxControls(); toast(`Added "${name}"`, 'success');
    } catch { toast('Could not save custom category', 'error'); }
  };

  $('tx-delete-in-modal-btn').onclick = () => {
    const id = state.txDraft.editId; if (!id) return;
    $('tx-modal').classList.add('hidden');
    openConfirm('Delete Transaction?', 'Wallet balances will update automatically.', async () => {
      try { await delTx(id); toast('Deleted', 'success'); }
      catch { toast('Could not delete entry', 'error'); }
    }, 'Delete');
  };

  $('tx-form').onsubmit = async (e) => {
    e.preventDefault(); const err = $('tx-form-error'), btn = $('tx-submit-btn'); err.classList.add('hidden');
    const amount = parseAmt($('tx-amount').value), date = $('tx-date').value || todayISO(), note = $('tx-note').value.trim();
    const { type, wallet, fromWallet, toWallet, category, person, editId } = state.txDraft;
    if (amount <= 0) { err.textContent = 'Enter an amount greater than 0.'; err.classList.remove('hidden'); return; }
    if (type === 'transfer' && fromWallet === toWallet) { err.textContent = 'Choose two different wallets.'; err.classList.remove('hidden'); return; }
    const payload = { type, scope: 'personal', amount, date, note, loggedBy: person, wallet: type === 'transfer' ? '' : wallet, fromWallet: type === 'transfer' ? fromWallet : '', toWallet: type === 'transfer' ? toWallet : '', category: type === 'transfer' ? 'Transfer' : category };
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      await saveTx(payload, editId);
      if (!editId && $('tx-save-as-template').checked) {
        await patchWs({ quickTemplates: [...(state.workspace.quickTemplates || []), { id: `tpl_${Date.now().toString(36)}`, title: (note || category || 'Quick Entry').slice(0, 28), ...payload }] });
      }
      $('tx-modal').classList.add('hidden');
      toast(editId ? 'Entry updated' : 'Entry saved', 'success');
    } catch { err.textContent = 'Could not save entry.'; err.classList.remove('hidden'); }
    finally { btn.disabled = false; btn.textContent = editId ? 'Update Entry' : 'Save Entry'; }
  };

  // Dedicated Manage Wallets Modal
  $('wallets-modal-close').onclick = () => $('wallets-modal').classList.add('hidden');
  $('wallets-modal').onclick = (e) => { if (e.target.id === 'wallets-modal') $('wallets-modal').classList.add('hidden'); };
  $('add-wallet-btn').onclick = () => {
    const id = `acct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 4)}`;
    state.settingsDraftWallets.push({ id, name: '', iconType: 'bank', colorKey: COLORS[state.settingsDraftWallets.length % COLORS.length].key, openingBalance: 0 });
    renderManageWalletsList(id);
  };
  $('wallets-form').onsubmit = async (e) => {
    e.preventDefault(); const btn = $('wallets-save-btn'); btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const prevW = getWallets();
      const newW = state.settingsDraftWallets.map((w, i) => ({ id: w.id, name: String(w.name || '').trim() || `Account ${i + 1}`, iconType: W_ICONS[w.iconType] ? w.iconType : 'bank', colorKey: COLOR_MAP[w.colorKey] ? w.colorKey : COLORS[i % COLORS.length].key }));
      const ob = {}; state.settingsDraftWallets.forEach((w) => (ob[w.id] = Number(w.openingBalance) || 0));
      const arch = { ...(state.workspace.archivedWalletNames || {}) }, activeIds = new Set(newW.map((w) => w.id));
      prevW.forEach((pw) => { if (!activeIds.has(pw.id)) arch[pw.id] = pw.name; });
      await patchWs({ wallets: newW, archivedWalletNames: arch, openingBalances: ob });
      $('wallets-modal').classList.add('hidden'); toast('Wallets saved!', 'success');
    } catch { toast('Could not save wallets', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save Wallets'; }
  };

  // Dedicated Settings Modal
  $('settings-modal-close').onclick = () => $('settings-modal').classList.add('hidden');
  $('settings-modal').onclick = (e) => { if (e.target.id === 'settings-modal') $('settings-modal').classList.add('hidden'); };
  $('setting-p1-color-btn')?.addEventListener('click', () => { state.openPersonColorPicker = state.openPersonColorPicker === 'person1' ? null : 'person1'; renderPersonColorControls(); });
  $('setting-p2-color-btn')?.addEventListener('click', () => { state.openPersonColorPicker = state.openPersonColorPicker === 'person2' ? null : 'person2'; renderPersonColorControls(); });
  $('copy-ws-id-btn').onclick = () => copyText(state.workspaceId, 'Workspace ID copied!');
  $('copy-ws-pin-btn').onclick = () => copyText($('setting-join-pin').value.trim(), 'Join PIN copied!');
  $('setting-ws-switcher').onchange = async (e) => { const id = e.target.value; if (!id || id === state.workspaceId) return; $('settings-modal').classList.add('hidden'); state.workspaceId = id; await saveUserProfile(); subscribeWs(id); };
  $('open-ws-onboarding-btn').onclick = () => { $('settings-modal').classList.add('hidden'); openOnboarding(true); };
  $('backup-export-btn').onclick = () => {
    downloadBlob(new Blob([JSON.stringify({ app: 'Delights Flow', exportedAt: new Date().toISOString(), settings: state.workspace, transactions: state.transactions }, null, 2)], { type: 'application/json' }), `DelightsFlow_Backup_${todayISO()}.json`);
    toast(`Backup downloaded (${state.transactions.length} entries)`, 'success');
  };
  $('backup-import-btn').onclick = () => { if (isRestoringBackup) return; $('backup-import-file').value = ''; $('backup-import-file').click(); };
  $('backup-import-file').onchange = (e) => { if (e.target.files?.[0]) importBackup(e.target.files[0]); };

  $('settings-form').onsubmit = async (e) => {
    e.preventDefault(); const btn = $('settings-save-btn'); btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const nextName = $('setting-ws-name').value.trim() || 'My Ledger';
      await patchWs({
        name: nextName,
        currency: $('setting-currency').value.trim() || 'Ks',
        joinPin: $('setting-join-pin').value.trim(),
        userNames: { person1: $('setting-person1').value.trim() || 'Person 1', person2: $('setting-person2').value.trim() || 'Person 2' },
        userColors: {
          person1: COLOR_MAP[state.settingsPersonColorsDraft.person1] ? state.settingsPersonColorsDraft.person1 : DEFAULT_PERSON_COLORS.person1,
          person2: COLOR_MAP[state.settingsPersonColorsDraft.person2] ? state.settingsPersonColorsDraft.person2 : DEFAULT_PERSON_COLORS.person2
        }
      });
      state.workspace.name = nextName;
      const wsEntry = state.userWorkspaces.find((w) => w.id === state.workspaceId);
      if (wsEntry) wsEntry.name = nextName;
      await saveUserProfile();
      $('settings-modal').classList.add('hidden'); toast('Settings saved!', 'success');
    } catch { toast('Could not save settings', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save Settings'; }
  };

  // Templates Modal
  $('open-templates-modal-btn').onclick = openTemplatesModal;
  $('templates-modal-close').onclick = () => $('templates-modal').classList.add('hidden');
  $('templates-modal').onclick = (e) => { if (e.target.id === 'templates-modal') $('templates-modal').classList.add('hidden'); };
  $('tpl-type').onchange = populateTplSelects;
  $('tpl-cancel-edit-btn').onclick = resetTplForm;
  $('template-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = $('tpl-title').value.trim(), amount = parseAmt($('tpl-amount').value), type = $('tpl-type').value;
    if (!title || amount <= 0) return toast('Enter template name & amount', 'error');
    if (type === 'transfer' && $('tpl-wallet').value === $('tpl-to-wallet').value) return toast('Choose two different wallets', 'error');
    const editId = $('tpl-edit-id').value;
    const entry = {
      id: editId || `tpl_${Date.now().toString(36)}`, title, type, amount,
      wallet: type === 'transfer' ? '' : $('tpl-wallet').value,
      fromWallet: type === 'transfer' ? $('tpl-wallet').value : '',
      toWallet: type === 'transfer' ? $('tpl-to-wallet').value : '',
      category: type === 'transfer' ? 'Transfer' : $('tpl-category').value,
      loggedBy: $('tpl-person').value, note: $('tpl-note').value.trim()
    };
    try {
      const prev = state.workspace.quickTemplates || [];
      const next = editId && prev.some((t) => t.id === editId) ? prev.map((t) => (t.id === editId ? entry : t)) : [...prev, entry];
      await patchWs({ quickTemplates: next });
      resetTplForm(); renderTplList(); toast(editId ? 'Template updated' : 'Template saved', 'success');
    } catch { toast('Could not save template', 'error'); }
  };

  // History, Calendar & Debounced Search
  $('history-mode-list').onclick = () => { state.historyMode = 'list'; renderMoneyHistory(); };
  $('history-mode-calendar').onclick = () => { state.historyMode = 'calendar'; state.calendarMonth = state.filters.month !== 'all' ? state.filters.month : curMonth(); renderMoneyHistory(); };
  const shiftCal = (d) => { const [y, m] = (state.calendarMonth || curMonth()).split('-').map(Number), nd = new Date(y, m - 1 + d, 1); state.calendarMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; renderCalendar(); };
  $('cal-prev-month').onclick = () => shiftCal(-1);
  $('cal-next-month').onclick = () => shiftCal(1);
  $('cal-today-btn').onclick = () => { state.calendarMonth = curMonth(); state.calendarSelectedDate = todayISO(); renderCalendar(); };
  $('cal-add-for-date-btn').onclick = () => openTxModal(null, state.calendarSelectedDate);

  let searchTimer = 0;
  $('filter-search').oninput = (e) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.filters.search = e.target.value; renderMoneyHistory(); }, 150); };
  $('filter-month').onchange = (e) => { state.filters.month = e.target.value; if (e.target.value !== 'all') state.calendarMonth = e.target.value; renderMoneyHistory(); };
  $('filter-wallet').onchange = (e) => { state.filters.wallet = e.target.value; state.walletFilterActive = e.target.value !== 'all'; renderMoneyHistory(); };
  $('filter-type').onchange = (e) => { state.filters.type = e.target.value; renderMoneyHistory(); };
  $('filter-person').onchange = (e) => { state.filters.person = e.target.value; renderMoneyHistory(); };
  $('filter-scope').onchange = (e) => { state.filters.scope = e.target.value; renderMoneyHistory(); };
  $('clear-filters-btn').onclick = () => { state.walletFilterActive = false; state.filters = { search: '', month: curMonth(), wallet: 'all', type: 'all', person: 'all', scope: 'all' }; $('filter-search').value = ''; renderMoneyHistory(); };
  $('export-csv-btn').onclick = exportCSV;

  // Analytics controls
  $('analytics-scope-select').onchange = (e) => { state.analyticsScope = e.target.value; renderMoneyAnalytics(); };
  $('analytics-month-select').onchange = (e) => { state.analyticsMonth = e.target.value; renderMoneyAnalytics(); };
  const shiftAna = (d) => { const c = state.analyticsMonth === 'all' ? curMonth() : state.analyticsMonth, [y, m] = c.split('-').map(Number), nd = new Date(y, m - 1 + d, 1); state.analyticsMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; renderMoneyAnalytics(); };
  $('analytics-prev-month').onclick = () => shiftAna(-1);
  $('analytics-next-month').onclick = () => shiftAna(1);
}