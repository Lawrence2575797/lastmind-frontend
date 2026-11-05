// The bond market page: the yield curve, the supply and demand behind bond prices, the market's history, what the club holds, and the forms for buying and selling.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = (n) => FM.gbp(n), pc = (v, d) => (v * 100).toFixed(d == null ? 2 : d) + '%', f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : '–'), f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '–');
  const num = (n) => Math.round(n).toLocaleString('en-GB');
  const bp = (v) => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 10000)) + ' bp';
  const ROUNDS = 14;
  const bs = { sel: 'g5', shock: 0, msg: null, amt: {} };
  const SCOL = { g1: 'blue', g2: 'good', g5: 'gold', g10: 'avg', c5: 'warn' };

  function curveFrom(item) {   // the yield curve at a point in the market's history
    const tp = (T) => item.slope * (1 - Math.exp(-T / 3)) / (1 - Math.exp(-10 / 3)), press = -((item.dem - item.sup) / 2) / 440;
    return [0.25, 0.5, 1, 2, 3, 5, 7, 10].map((T) => [T, Math.max(0.0005, item.rate + tp(T) + press) * 100]);
  }

  FM.renderBonds = function (host, lg, hooks) {
    hooks = hooks || {}; const C = FM.charts, B = FM.bonds;
    if (lg.mp) { host.innerHTML = '<div class="card"><h2>Bonds</h2><p class="note">The bond market is not part of a game with other managers.</p></div>'; return; }
    const st = B.state(lg), b = FM.biz(lg), pf = B.portfolio(lg), avail = B.available(lg), H = st.hist, now = H[H.length - 1], prev = H[H.length - 2] || now, ago = (n) => H[Math.max(0, H.length - 1 - n)];
    const redo = () => { if (hooks.save) hooks.save(); FM.renderBonds(host, lg, hooks); };
    const quotes = B.SERIES.map((s) => Object.assign({ s }, B.quote(lg, s.id), { prevP: prev.p[s.id], prevY: prev.y[s.id], firstP: H[0].p[s.id] }));
    const unreal = pf.value - pf.cost, y10 = now.y.g10, y1 = now.y.g1, slopeBp = y10 - y1;
    const kpi = [['Central bank rate', pc(st.rate), bp(st.rate - prev.rate) + ' on the matchday'], ['10-year yield', pc(y10), bp(y10 - prev.y.g10)], ['Yield curve (10-year less 1-year)', bp(slopeBp), slopeBp < 0 ? 'inverted' : slopeBp < 0.004 ? 'flat' : 'upward sloping'],
      ['Bonds held', gbp(pf.value), (unreal >= 0 ? '+' : '−') + gbp(Math.abs(unreal)) + ' unrealised'], ['Interest received', gbp(pf.income) + ' a matchday', gbp(pf.income * ROUNDS) + ' a year'], ['Free to invest', gbp(avail), 'above the board\'s reserve']];
    // ---------- the yield curve ----------
    const curves = [{ label: 'Now', pts: curveFrom(now), cls: 'gold', dots: true }, { label: 'Last matchday', pts: curveFrom(prev), cls: 'avg', dash: true }, { label: '5 matchdays ago', pts: curveFrom(ago(5)), cls: 'blue', dash: true }, { label: 'A season ago', pts: curveFrom(ago(14)), cls: 'good', dash: true }];
    const held = pf.rows.map((r) => ({ x: r.years, y: r.y * 100, cls: 'hl', t: esc(B.seriesBy(r.h.series).short) + ' held: ' + pc(r.y) }));
    const curveChart = C.lines(curves, { xl: 'Years to maturity', yl: 'Yield (%)', yFmt: (v) => v.toFixed(1) + '%', marks: held.filter((m) => m.x > 0.05 && m.x <= 10), legendRight: true, h: 320, x0: 0, x1: 10 });
    // ---------- supply and demand for the reference bond ----------
    const dd = (x) => ({ dem: x.dem, sup: x.sup }), cur = B.referenceCurves(lg), pr = (() => { const x = prev; const s5 = B.SERIES[2], c = st.coupons.g5, n = s5.years * ROUNDS; const Pf = B.price(c, n, x.rate + (x.slope * (1 - Math.exp(-5 / 3)) / (1 - Math.exp(-10 / 3)))), sh = (Pf - 100) * 2, d = sh + x.dem, s = x.sup; return { dem: d, sup: s, p: 100 + (d - s) / 2, q: 100 + (d + s) / 2 }; })();
    void dd;
    const qs = [30, 170], D = (dem) => qs.map((q) => [q, 200 + dem - q]), Sx = (sup) => qs.map((q) => [q, q - sup]);
    const sdChart = C.lines([{ label: 'Demand (before)', pts: D(0), cls: 'avg', dash: true, opacity: 0.55 }, { label: 'Supply (before)', pts: Sx(0), cls: 'avg', dash: true, opacity: 0.55 }, { label: 'Demand last matchday', pts: D(pr.dem), cls: 'blue', dash: true }, { label: 'Supply last matchday', pts: Sx(pr.sup), cls: 'warn', dash: true }, { label: 'Demand now', pts: D(cur.dem), cls: 'blue' }, { label: 'Supply now', pts: Sx(cur.sup), cls: 'warn' }],
      { xl: 'Quantity of bonds traded', yl: 'Price (face value 100)', x0: 30, x1: 170, y0: 40, y1: 180, marks: [{ x: pr.q, y: pr.p, cls: 'avg', t: 'Last matchday: ' + f2(pr.p) }, { x: cur.q, y: cur.p, cls: 'hl', guide: true, label: 'Price ' + f2(cur.p), t: 'Now: price ' + f2(cur.p) + ', quantity ' + f1(cur.q) }], h: 320, legendRight: true });
    const dP = cur.p - pr.p, dem0 = cur.dem - pr.dem, sup0 = cur.sup - pr.sup;
    const why = [];
    if (Math.abs(cur.shiftRate - (pr.dem - st.dem + 0)) > 0) { /* the rate effect is part of the demand shift */ }
    if (Math.abs(dem0) > 0.4) why.push('Demand has shifted ' + (dem0 > 0 ? 'right' : 'left') + ' by ' + f1(Math.abs(dem0)) + ' (' + (dem0 > 0 ? 'investors want more bonds' : 'investors want fewer: yields elsewhere are higher, or appetite for risk is back') + ').');
    if (Math.abs(sup0) > 0.4) why.push('Supply has shifted ' + (sup0 > 0 ? 'right' : 'left') + ' by ' + f1(Math.abs(sup0)) + ' (' + (sup0 > 0 ? 'more bonds are on offer' : 'fewer bonds are on offer') + ').');
    const cause = why.length ? why.join(' ') : 'Neither curve has moved much since the last matchday.';
    // ---------- history ----------
    const idx = (id) => ({ label: B.seriesBy(id).short, pts: H.map((h) => [h.t, 100 * h.p[id] / H[0].p[id]]), cls: SCOL[id] });
    const priceHist = C.lines(B.SERIES.map((s) => idx(s.id)), { xl: 'Matchday', yl: 'Price index (start = 100)', h: 280, legendRight: true });
    const yieldHist = C.lines(B.SERIES.map((s) => ({ label: s.short, pts: H.map((h) => [h.t, h.y[s.id] * 100]), cls: SCOL[s.id] })).concat([{ label: 'Central bank rate', pts: H.map((h) => [h.t, h.rate * 100]), cls: 'avg', dash: true }]), { xl: 'Matchday', yl: 'Yield (%)', yFmt: (v) => v.toFixed(1) + '%', h: 280, legendRight: true });
    // ---------- the selected bond: price against yield ----------
    const sel = B.seriesBy(bs.sel) || B.SERIES[2], sq = quotes.find((q) => q.s.id === sel.id), n = sel.years * ROUNDS;
    const pyPts = []; for (let y = 0.002; y <= 0.12; y += 0.002) pyPts.push([y * 100, B.price(sq.c, n, y)]);
    const py = C.lines([{ label: sel.short + ' (coupon ' + pc(sq.c) + ')', pts: pyPts, cls: 'gold' }], { xl: 'Yield (%)', yl: 'Price', xFmt: (v) => v.toFixed(0) + '%', marks: [{ x: sq.y * 100, y: sq.mid, cls: 'hl', guide: true, label: f2(sq.mid) + ' at ' + pc(sq.y) }].concat(pf.rows.filter((r) => r.h.series === sel.id).map((r) => ({ x: r.y * 100, y: r.mid, cls: 'mine', t: 'Your holding' }))), h: 300 });
    // ---------- the market ----------
    const marketRows = quotes.map((q) => { const ch = q.mid - q.prevP; const buyId = 'bnAmt_' + q.s.id; const amt = bs.amt[q.s.id] != null ? bs.amt[q.s.id] : 500000; return `<tr class="${bs.sel === q.s.id ? 'sel' : ''}" data-sel="${q.s.id}"><td class="l"><b>${esc(q.s.name)}</b><br><small>${q.s.kind === 'corp' ? 'pays a premium for the risk of the company failing' : 'backed by the government'}</small></td><td>${pc(q.c)}</td><td><b>${pc(q.y)}</b><br><small>${bp(q.y - q.prevY)}</small></td><td><b>${f2(q.mid)}</b><br><small class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(2)}</small></td><td>${f2(q.bid)} / ${f2(q.ask)}</td><td>${f2(q.dur)} yrs</td><td class="bn-buy"><input type="number" id="${buyId}" min="10000" step="10000" value="${amt}" aria-label="Amount to invest in ${esc(q.s.short)}"><button type="button" data-buy="${q.s.id}" class="primary">Buy</button><div class="bn-quote" id="bnQuote_${q.s.id}"></div></td></tr>`; }).join('');
    const holdRows = pf.rows.map((r) => { const s = B.seriesBy(r.h.series), gain = r.value - r.h.cost, ret = r.h.cost ? gain / r.h.cost : 0; return `<tr><td class="l"><b>${esc(s.short)}</b><br><small>bought at ${f2(r.h.buyPrice)} (${pc(r.h.buyYield)})</small></td><td>${num(r.h.qty)}</td><td>${pc(r.h.coupon)}</td><td>${f2(r.mid)}</td><td>${gbp(r.value)}</td><td class="${gain >= 0 ? 'up' : 'down'}">${gain >= 0 ? '+' : '−'}${gbp(Math.abs(gain))}<br><small>${(ret * 100).toFixed(1)}%</small></td><td>${gbp(r.income)}</td><td>${f1(r.years)} yrs</td><td class="bn-buy"><input type="number" id="bnSellQty_${r.h.id}" min="1" max="${r.h.qty}" step="1" value="${r.h.qty}" aria-label="Bonds to sell"><button type="button" data-sell="${r.h.id}">Sell</button></td></tr>`; }).join('');
    // ---------- the rate shock ----------
    const shock = bs.shock / 100, shocked = pf.rows.map((r) => { const s = B.seriesBy(r.h.series), y = Math.max(0.0005, r.y + shock); return { r, value: B.price(r.h.coupon, Math.max(0, r.h.matures - b.ledger.length), y) * r.h.qty }; }), shockedVal = shocked.reduce((a, x) => a + x.value, 0);
    const shockPts = []; for (let k = -3; k <= 3.001; k += 0.25) { const v = pf.rows.reduce((a, r) => a + B.price(r.h.coupon, Math.max(0, r.h.matures - b.ledger.length), Math.max(0.0005, r.y + k / 100)) * r.h.qty, 0); shockPts.push([k, v / 1e6]); }
    const shockChart = pf.rows.length ? C.lines([{ label: 'Value of your bonds (£m)', pts: shockPts, cls: 'gold' }], { xl: 'Change in yields (percentage points)', yl: '£m', marks: [{ x: bs.shock, y: shockedVal / 1e6, cls: 'hl', guide: true, label: gbp(shockedVal) }], h: 260 }) : '<p class="note">Buy a bond to see how its value moves with yields.</p>';
    // ---------- what is owed and owed to the club ----------
    const pay = (b.payables || []).slice().sort((a, c) => a.due - c.due), rec = (b.receivables || []).slice().sort((a, c) => a.due - c.due), left = (x) => Math.max(0, x.due - b.ledger.length);
    const yo1 = now.y.g1, yo2 = now.y.g2;
    const planRows = pay.map((x) => `<tr><td class="l">Owed for ${esc(x.name)}<br><small>to ${esc(x.to)}</small></td><td>${gbp(x.amount)}</td><td>in ${left(x)} matchdays</td><td>${left(x) >= 14 ? 'A bond of the same term yields ' + pc(left(x) >= 28 ? yo2 : yo1) + ': money kept back until then can earn that.' : ''}</td></tr>`).concat(rec.map((x) => `<tr><td class="l">Due from ${esc(x.from)} for ${esc(x.name)}</td><td>${gbp(x.amount)}</td><td>in ${left(x)} matchdays</td><td>Not yet received, and a buyer short of money may not pay.</td></tr>`)).join('');
    // ---------- the page ----------
    host.innerHTML = `<div class="bn-wrap">
      <header class="bn-head"><div><div class="eyebrow">Finance</div><h2>The bond market</h2><p class="note">A bond pays a coupon every matchday and its face value at the end. When yields rise, the price of bonds already issued falls. Matchday ${st.t}.</p></div></header>
      ${bs.msg ? `<div class="rc-notice ${bs.msg.ok ? 'ok' : 'no'}" role="status">${esc(bs.msg.text)}</div>` : ''}
      <div class="bn-kpis">${kpi.map(([a, v, s]) => `<div><span>${esc(a)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join('')}</div>
      <div class="pf-two"><div class="pf-card"><h3>The yield curve</h3><p class="note">Yield against how long you lend for. The gold line is today. When it slopes up, lenders are paid more for lending for longer; when it falls (inverted), the market expects rates to come down. The rings are bonds you hold.</p>${curveChart}</div>
        <div class="pf-card"><h3>Why the price moved: supply and demand for the five-year bond</h3><p class="note">Demand slopes down (a higher price attracts fewer buyers) and supply slopes up. Where they cross is the price. The grey lines are where the market started; the dashed lines are the last matchday.</p>${sdChart}
        <p class="bn-why"><b>The five-year price is ${f2(cur.p)}, ${dP >= 0 ? 'up' : 'down'} ${Math.abs(dP).toFixed(2)} on the matchday.</b> ${esc(cause)}</p></div></div>
      <div class="pf-card"><h3>Buy bonds</h3><p class="note">Click a bond to see its price against its yield. Prices are the middle of the market; you buy a little above it and sell a little below (the spread). The board keeps ${gbp((b.board && b.board.reserve) || 500000)} back, so ${gbp(avail)} can be invested now. Money in bonds is not available for transfers until it is sold.</p>
        <div class="tablewrap"><table class="data bn-table"><thead><tr><th class="l">Bond</th><th>Coupon</th><th>Yield</th><th>Price</th><th>Bid / ask</th><th>Duration</th><th>Invest (£)</th></tr></thead><tbody>${marketRows}</tbody></table></div></div>
      <div class="pf-two"><div class="pf-card"><h3>${esc(sel.name)}: price against yield</h3><p class="note">The price is the present value of the coupons and the face value at the market yield. The curve bends: a fall in yields lifts the price by more than a rise lowers it (convexity). Duration, ${f2(sq.dur)} years, is the slope: a rise of one per cent in yields takes about ${sq.dur.toFixed(1)}% off the price.</p>${py}</div>
        <div class="pf-card"><h3>What you hold</h3>${pf.rows.length ? `<div class="tablewrap"><table class="data bn-table"><thead><tr><th class="l">Bond</th><th>Bonds</th><th>Coupon</th><th>Price</th><th>Value</th><th>Gain</th><th>Income a matchday</th><th>Matures</th><th>Sell</th></tr></thead><tbody>${holdRows}</tbody><tfoot><tr><td class="l"><b>Total</b></td><td></td><td></td><td></td><td><b>${gbp(pf.value)}</b></td><td class="${unreal >= 0 ? 'up' : 'down'}"><b>${unreal >= 0 ? '+' : '−'}${gbp(Math.abs(unreal))}</b></td><td><b>${gbp(pf.income)}</b></td><td></td><td></td></tr></tfoot></table></div><p class="note">Gains on bonds you have sold so far: ${gbp(pf.realised)}.</p>` : '<p class="note">You hold no bonds. Interest received on bonds comes off the interest the club pays on its loans.</p>'}</div></div>
      <div class="pf-two"><div class="pf-card"><h3>Prices since the start</h3>${priceHist}</div><div class="pf-card"><h3>Yields since the start</h3>${yieldHist}</div></div>
      <div class="pf-two"><div class="pf-card"><h3>If yields moved</h3><div class="bn-shock"><label>Change in yields<input type="range" id="bnShock" min="-3" max="3" step="0.25" value="${bs.shock}"></label><b>${bs.shock >= 0 ? '+' : '−'}${Math.abs(bs.shock).toFixed(2)} points</b></div>${shockChart}
        ${pf.rows.length ? `<p class="bn-why">Your bonds would be worth <b>${gbp(shockedVal)}</b>, ${shockedVal >= pf.value ? 'a gain' : 'a loss'} of <b>${gbp(Math.abs(shockedVal - pf.value))}</b>. The longer the bond, the more it moves: that is why long bonds are riskier when rates may rise, and why short ones are safer for money the club may need soon.</p>` : ''}</div>
        <div class="pf-card"><h3>Payments agreed on players</h3>${planRows ? `<div class="tablewrap"><table class="data bn-table"><thead><tr><th class="l">Payment</th><th>Amount</th><th>Due</th><th class="l">Compared with bonds</th></tr></thead><tbody>${planRows}</tbody></table></div>` : '<p class="note">No transfer fee is being paid in instalments, and none is owed to the club. When a player is signed or sold in instalments, the payments appear here, so they can be weighed against what bonds pay.</p>'}
        <h3>The market</h3><div class="bn-log">${st.log.length ? st.log.slice(0, 8).map((e) => `<div><small>Matchday ${e.t}</small> ${esc(e.text)}</div>`).join('') : '<p class="note">Nothing has happened in the market yet.</p>'}</div></div></div></div>`;
    // ---------- wiring ----------
    host.querySelectorAll('[data-sel]').forEach((r) => r.addEventListener('click', (e) => { if (e.target.closest('input,button')) return; bs.sel = r.dataset.sel; redo(); }));
    const quoteOf = (id) => { const q = quotes.find((x) => x.s.id === id), inp = host.querySelector('#bnAmt_' + id), amount = Math.floor((+inp.value || 0) / 1e4) * 1e4, qty = Math.floor(amount / q.ask), cost = qty * q.ask; bs.amt[id] = +inp.value || 0; const el = host.querySelector('#bnQuote_' + id); if (el) el.textContent = qty >= 1 ? num(qty) + ' bonds for ' + gbp(cost) + ' · ' + gbp(qty * 100 * q.c) + ' a year · yield ' + pc(q.y) : 'Enter at least £10,000'; };
    B.SERIES.forEach((s) => { const inp = host.querySelector('#bnAmt_' + s.id); if (inp) { inp.addEventListener('input', () => quoteOf(s.id)); quoteOf(s.id); } });
    host.querySelectorAll('[data-buy]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.buy, r = B.buy(lg, id, host.querySelector('#bnAmt_' + id).value); bs.msg = r; redo(); }));
    host.querySelectorAll('[data-sell]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.sell, r = B.sell(lg, id, host.querySelector('#bnSellQty_' + id).value); bs.msg = r; redo(); }));
    const sh = host.querySelector('#bnShock'); if (sh) sh.addEventListener('input', () => { bs.shock = +sh.value; bs.msg = null; FM.renderBonds(host, lg, hooks); });
  };
  FM.booksLearnCss = (FM.booksLearnCss || '');
})();
