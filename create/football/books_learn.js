// The business teaching tabs of The Books: the share market and owners, and every theme of the Edexcel Business specification at the level the save was started at.
// Key terms inside any explanation are buttons: they ask Rafael Morales (in the side panel) to explain that idea, with the question ready to send, not sent.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = (v) => '£' + Math.round(v).toLocaleString('en-GB');
  const lvl = (lg) => (lg.tier === 'alevel' || lg.tier === 'above' ? 'alevel' : 'gcse');
  const LEVEL_NAME = { gcse: 'GCSE', alevel: 'A-level' };
  const S = { theme: null, topic: {}, be: { price: 25, vc: 4, fc: 150000, att: 11000 }, sd: { d: 0, s: 0 } };

  // ---------- key terms ----------
  function termsFor(level) {
    const names = new Set(); (FM.BOOKS[level] || []).forEach((th) => th.topics.forEach((tp) => tp.c.forEach((c) => names.add(c[0]))));
    return Array.from(names).sort((a, b) => b.length - a.length);
  }
  const question = (name, level) => `Can you explain "${name}" for ${LEVEL_NAME[level]} Business, using Ashford Rovers plc as the example? Please send me a question to try afterwards.`;
  const termBtn = (name, level, label) => `<button type="button" class="bk-term" data-q="${esc(question(name, level))}">${esc(label || name)}</button>`;
  function linkify(text, own, level, terms) {
    let out = esc(text); const used = new Set([String(own).toLowerCase()]), stash = [];
    terms.forEach((t) => {
      const key = t.toLowerCase(); if (used.has(key) || t.length < 5) return;
      const re = new RegExp('(^|[^A-Za-z])(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![A-Za-z])', 'i'), m = re.exec(out);
      if (!m) return; used.add(key);
      stash.push(termBtn(t, level, m[2])); out = out.slice(0, m.index + m[1].length) + '\u0001' + (stash.length - 1) + '\u0002' + out.slice(m.index + m[1].length + m[2].length);
    });
    return out.replace(/\u0001(\d+)\u0002/g, (_, i) => stash[+i]);
  }

  // ---------- small drawings ----------
  const AX = 'stroke="rgba(244,237,218,.35)" stroke-width="1"', TXT = 'fill="rgba(244,237,218,.8)" font-family="Arial,sans-serif" font-size="11"';
  function pie(items) {
    const R = 86, cx = 100, cy = 100, COL = ['#d7b86b', '#7fd49a', '#6fa8dc', '#e78078', '#b69ad6', '#f2c8a0', '#8fb5a3', '#c9c27a'];
    let a0 = -Math.PI / 2, s = `<svg class="bk-pie" viewBox="0 0 200 200" role="img" aria-label="Shareholders as a share of the club">`;
    items.forEach((it, i) => { const a1 = a0 + it.pct / 100 * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0; s += `<path d="M${cx} ${cy} L${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 ${large} 1 ${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)} Z" fill="${COL[i % COL.length]}" stroke="#1f2322" stroke-width="2"/>`; a0 = a1; });
    return s + '</svg>';
  }
  const PIECOL = ['#d7b86b', '#7fd49a', '#6fa8dc', '#e78078', '#b69ad6', '#f2c8a0', '#8fb5a3', '#c9c27a'];
  function breakeven() {
    const b = S.be, W = 420, H = 250, ml = 46, mb = 28, maxQ = Math.max(b.att * 1.5, 14000), maxY = Math.max(b.price * maxQ, b.fc + b.vc * maxQ) * 1.05, X = (q) => ml + q / maxQ * (W - ml - 10), Y = (v) => H - mb - v / maxY * (H - mb - 10);
    const bep = b.price > b.vc ? b.fc / (b.price - b.vc) : null, line = (f, c, dash) => `<polyline points="${X(0)},${Y(f(0))} ${X(maxQ)},${Y(f(maxQ))}" fill="none" stroke="${c}" stroke-width="2.4"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
    let s = `<svg class="bk-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Break-even chart"><line x1="${ml}" y1="${H - mb}" x2="${W - 8}" y2="${H - mb}" ${AX}/><line x1="${ml}" y1="10" x2="${ml}" y2="${H - mb}" ${AX}/>`;
    s += line((q) => b.price * q, '#7fd49a') + line((q) => b.fc + b.vc * q, '#e78078') + line(() => b.fc, '#d7b86b', true);
    if (bep && bep < maxQ) s += `<circle cx="${X(bep)}" cy="${Y(b.price * bep)}" r="5" fill="#fff"/><line x1="${X(bep)}" y1="${Y(b.price * bep)}" x2="${X(bep)}" y2="${H - mb}" ${AX} stroke-dasharray="3 3"/><text x="${X(bep)}" y="${H - mb + 14}" text-anchor="middle" ${TXT}>${Math.round(bep).toLocaleString('en-GB')}</text>`;
    s += `<line x1="${X(b.att)}" y1="${H - mb}" x2="${X(b.att)}" y2="${Y(b.price * b.att)}" stroke="rgba(215,184,107,.7)" stroke-width="1.4"/><text x="${X(b.att)}" y="${H - 8}" text-anchor="middle" ${TXT}>expected ${b.att.toLocaleString('en-GB')}</text>`;
    s += `<text x="${W - 12}" y="${Y(b.price * maxQ) + 12}" text-anchor="end" fill="#7fd49a" font-size="11" font-family="Arial">Revenue</text><text x="${W - 12}" y="${Y(b.fc + b.vc * maxQ) - 6}" text-anchor="end" fill="#e78078" font-size="11" font-family="Arial">Total cost</text><text x="${ml + 6}" y="${Y(b.fc) - 6}" fill="#d7b86b" font-size="11" font-family="Arial">Fixed cost</text>`;
    return { svg: s + '</svg>', bep };
  }
  function breakevenCard(level, lg) {
    if (lg && !S.beSeeded && FM.booksLive) { S.beSeeded = true; try { Object.assign(S.be, FM.booksLive.beSeed(lg)); } catch (e) { /* the example figures stay */ } }
    const { svg, bep } = breakeven(), b = S.be, ms = bep ? b.att - bep : null;
    const inp = (k, label, step) => `<label class="bk-in"><span>${label}</span><input type="number" data-be="${k}" value="${b[k]}" step="${step}" min="0"></label>`;
    return `<div class="card bk-card" id="bkBreak"><h3>Break-even for a home match at Ashford Rovers</h3><p class="bk-lead">It opens on the club's own figures: revenue per spectator, the cost of each spectator, and the standing costs not covered by broadcasting and sponsors. Change them and the lines move. Break-even output = fixed costs / (price - variable cost per ticket).</p><div class="bk-inputs">${inp('price', 'Average ticket price (£)', 1)}${inp('vc', 'Variable cost per ticket (£)', 0.5)}${inp('fc', 'Fixed costs per match (£)', 5000)}${inp('att', 'Expected attendance', 500)}</div><div id="bkBreakSvg">${svg}</div><p id="bkBreakNote" class="bk-why">${bep ? `Break-even is <b>${Math.round(bep).toLocaleString('en-GB')} tickets</b>. ${ms >= 0 ? `Expected attendance is <b>${Math.round(ms).toLocaleString('en-GB')}</b> above it: that is the margin of safety (${(100 * ms / b.att).toFixed(0)}% of the crowd).` : `Expected attendance is <b>${Math.round(-ms).toLocaleString('en-GB')}</b> below it: the match makes a loss.`}` : 'The price does not cover the variable cost: there is no break-even.'}</p>${level === 'alevel' ? '<p class="bk-why">Limits: it assumes a constant price and costs, one product, and that everything made is sold.</p>' : ''}</div>`;
  }
  function plc() {
    const s = `<svg class="bk-chart" viewBox="0 0 420 210" role="img" aria-label="Product life cycle"><line x1="36" y1="180" x2="410" y2="180" ${AX}/><line x1="36" y1="14" x2="36" y2="180" ${AX}/><path d="M36 178 C80 176 90 60 160 56 C230 52 250 54 290 80 C330 108 350 150 400 170" fill="none" stroke="#d7b86b" stroke-width="3"/>${['Development', 'Introduction', 'Growth', 'Maturity', 'Decline'].map((l, i) => `<text x="${[56, 100, 160, 250, 350][i]}" y="198" text-anchor="middle" ${TXT}>${l}</text>`).join('')}<text x="18" y="100" transform="rotate(-90 18 100)" text-anchor="middle" ${TXT}>sales</text></svg>`;
    return `<div class="card bk-card"><h3>Product life cycle</h3>${s}<p class="bk-why">An extension strategy (a new kit design, a new market) lifts a product that is sliding into decline back towards growth.</p></div>`;
  }
  function supplyDemand() {
    const d = S.sd.d, sh = S.sd.s, W = 360, H = 240, X = (q) => 40 + q * 3.1, Y = (p) => 210 - p * 1.9;
    const D = (q) => 90 - 0.5 * q + d * 8, Sup = (q) => 10 + 0.5 * q + sh * 8;
    const eq = (() => { const q = (90 + d * 8 - 10 - sh * 8) / 1; return { q, p: Sup(q) }; })();
    const s = `<svg class="bk-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Supply and demand"><line x1="40" y1="210" x2="${W - 10}" y2="210" ${AX}/><line x1="40" y1="14" x2="40" y2="210" ${AX}/><polyline points="${X(0)},${Y(D(0))} ${X(100)},${Y(D(100))}" fill="none" stroke="#7fd49a" stroke-width="2.4"/><polyline points="${X(0)},${Y(Sup(0))} ${X(100)},${Y(Sup(100))}" fill="none" stroke="#e78078" stroke-width="2.4"/><circle cx="${X(eq.q)}" cy="${Y(eq.p)}" r="5" fill="#fff"/><text x="${X(100) - 4}" y="${Y(D(100)) - 6}" text-anchor="end" fill="#7fd49a" font-size="11" font-family="Arial">Demand</text><text x="${X(100) - 4}" y="${Y(Sup(100)) - 6}" text-anchor="end" fill="#e78078" font-size="11" font-family="Arial">Supply</text><text x="${X(eq.q)}" y="228" text-anchor="middle" ${TXT}>Q ${eq.q.toFixed(0)}</text><text x="34" y="${Y(eq.p) + 4}" text-anchor="end" ${TXT}>£${eq.p.toFixed(0)}</text></svg>`;
    return `<div class="card bk-card" id="bkSD"><h3>Demand, supply and the equilibrium price</h3>${s}<div class="bk-sdbtn"><button type="button" data-sd="d:1">Demand rises (a cup run)</button><button type="button" data-sd="d:-1">Demand falls (a poor season)</button><button type="button" data-sd="s:1">Supply falls (costs rise)</button><button type="button" data-sd="s:-1">Supply rises (a bigger stand)</button><button type="button" data-sd="reset">Reset</button></div><p class="bk-why">The curves meet where demand equals supply: that is the equilibrium price. Moving either curve moves the equilibrium.</p></div>`;
  }
  const SHAREHOLDERS = [
    { name: 'Ashford Supporters\' Trust', pct: 24, aim: 'Fair ticket prices and the club kept in the town. Promotion matters more to them than profit.' },
    { name: 'Halden Mutual (insurance)', pct: 18, aim: 'A steady dividend and a rising share price, with low risk.' },
    { name: 'Eleanor Whitcombe, Chairwoman', pct: 15, aim: 'Long-term growth: a bigger stadium and a higher division.' },
    { name: 'Brightwater Energy Pension Fund', pct: 14, aim: 'Reliable income for its pensioners; wary of large debts.' },
    { name: 'Kestrel Telecom (sponsor)', pct: 9, aim: 'Brand exposure and a good community image.' },
    { name: 'The founding families', pct: 8, aim: 'Pride in the club\'s history and its survival.' },
    { name: 'Small shareholders (2,400 fans)', pct: 12, aim: 'The club to do well and stay affordable.' },
  ];
  function orgChart() {
    const node = (title, who, kids, cls) => `<li class="${cls || ''}"><div class="bk-node"><b>${esc(title)}</b>${who ? `<span>${esc(who)}</span>` : ''}</div>${kids && kids.length ? '<ul>' + kids.join('') + '</ul>' : ''}</li>`;
    const tree = node('Shareholders', 'owners of the plc', [node('Board of directors', 'Chairwoman Eleanor Whitcombe', [
      node('Director of Finance', 'Rafael Morales', [node('Financial controller', '', [node('Accounts team', '3 staff', [], 'leaf'), node('Ticket office', '5 staff', [], 'leaf')])]),
      node('Manager', 'You', [node('Assistant manager', 'Francesco Moretti', [node('First-team coach', '', [node('Captain and players', '22 players', [], 'leaf')]), node('Goalkeeping coach', '', [], 'leaf'), node('Fitness coach', '', [], 'leaf')])]),
      node('Commercial director', '', [node('Sponsorship', '', [], 'leaf'), node('Club shop', '4 staff', [], 'leaf')]),
    ])]);
    return `<div class="card bk-card"><h3>The chain of command at Ashford Rovers plc</h3><div class="bk-org"><ul>${tree}</ul></div><p class="bk-why">Orders pass down the chain of command; reports pass back up. The <b>span of control</b> of the assistant manager here is 3 (the three coaches). A tall hierarchy has many levels; a flat one has few and wide spans.</p></div>`;
  }
  function stakeholders() {
    const rows = [['Shareholders', 'Dividends and a rising share price', 'Pay less to the squad, raise prices'], ['Customers (fans)', 'Fair prices, a safe stadium, good football', 'Lower prices'], ['Employees and players', 'Good pay, security, conditions', 'Higher wages'], ['Suppliers', 'Prompt payment, regular orders', 'Delay payment, cut orders'], ['Local community', 'Jobs, less noise and traffic, community projects', 'Match-day disturbance'], ['Lenders', 'Interest paid and the loan repaid', 'Avoid more debt'], ['Government', 'Tax paid and the law followed', 'Fewer tax breaks'], ['Pressure groups', 'Climate action, safe stadiums, fair pay', 'Spend on sustainability']];
    return `<div class="card bk-card"><h3>Stakeholders and what they want</h3><div class="tablewrap"><table class="data"><thead><tr><th class="l">Stakeholder</th><th class="l">Their aim</th><th class="l">Where it clashes</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="l"><b>${r[0]}</b></td><td class="l">${r[1]}</td><td class="l">${r[2]}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function sharesPage(lg) {
    const b = FM.biz ? FM.biz(lg) : { shares: { issued: 1000000, price: 10 } }, price = FM.bizApprovals ? FM.bizApprovals(lg).share : b.shares.price, issued = b.shares.issued, cap = price * issued, level = lvl(lg), terms = termsFor(level);
    const t = (name) => termBtn(name, level);
    return `<div class="bk-grid2"><div class="card bk-card"><h3>The share price</h3><div class="bk-stats"><div><small>Share price</small><b>£${price.toFixed(2)}</b></div><div><small>Shares issued</small><b>${issued.toLocaleString('en-GB')}</b></div><div><small>Market capitalisation</small><b>${gbp(cap)}</b></div></div><p>Ashford Rovers is a ${t('Public limited company')}: anyone can buy its shares. The price rises when buyers expect good ${t('Profit')} and ${t('Dividends')} and falls when they do not. ${t('Market capitalisation')} is price x shares issued.</p></div>
      <div class="card bk-card"><h3>Who owns the club</h3><div class="bk-ownership">${pie(SHAREHOLDERS)}<ul class="bk-legend">${SHAREHOLDERS.map((s, i) => `<li><i style="background:${PIECOL[i % PIECOL.length]}"></i><span><b>${esc(s.name)}</b> ${s.pct}%</span></li>`).join('')}</ul></div></div></div>
    <div class="card bk-card"><h3>What each owner wants</h3><div class="tablewrap"><table class="data"><thead><tr><th class="l">Shareholder</th><th>Share</th><th class="l">Their aim</th></tr></thead><tbody>${SHAREHOLDERS.map((s) => `<tr><td class="l"><b>${esc(s.name)}</b></td><td>${s.pct}%</td><td class="l">${esc(s.aim)}</td></tr>`).join('')}</tbody></table></div><p class="bk-why">The ${t('Shareholders')} do not all want the same thing. The trust wants low prices; the pension fund wants a dividend. The board has to balance them: that is the ${t('Shareholder versus stakeholder view')} in practice.</p></div>
    <div class="bk-grid2"><div class="card bk-card"><h3>The sustainability objective</h3><p><b>Ashford Green Pitch:</b> cut the stadium's electricity use by 30% within five years and run every home match on renewable energy. It costs money now (capital spending on lighting and boilers) and saves it later. It is also what the local community and pressure groups ask for, so it links ${t('Sustainability')} to ${t('Corporate social responsibility')}.</p></div>
    <div class="card bk-card"><h3>Short-term objectives for this season</h3><ul class="bk-obj"><li>Fill at least 85% of seats on an average match day <em>(supports growth and revenue)</em></li><li>Keep the wage bill below 65% of turnover <em>(supports profit and the dividend)</em></li><li>Finish in the top half of the table <em>(supports promotion and the trust's aim)</em></li><li>Pay a dividend of about 20% of profit <em>(keeps the pension fund and Halden Mutual)</em></li><li>Cut energy use by 6% this year <em>(the first step of Green Pitch)</em></li></ul><p class="bk-why">These ${t('Business objectives')} are the short-term steps that add up to the long-term ${t('Business aims')}.</p></div></div>
    ${stakeholders()}`;
  }

  // ---------- the topic pages ----------
  const VISUALS = {
    gcse: { '1.3': ['breakeven', 'cashflow', 'profit'], '1.5': ['stakeholders'], '2.2': ['plc'], '2.4': ['profit', 'balance'], '2.5': ['org'] },
    alevel: { '1.2': ['supplydemand'], '1.3': ['plc'], '1.4': ['org'], '2.2': ['breakeven', 'cashflow'], '2.3': ['profit'], '3.4': ['stakeholders'], '3.5': ['profit', 'balance'] },
  };
  function visual(key, lg, level) {
    if (key === 'breakeven') return breakevenCard(level, lg);
    if (key === 'plc') return plc();
    if (key === 'supplydemand') return supplyDemand();
    if (key === 'org') return orgChart();
    if (key === 'stakeholders') return stakeholders();
    const real = { cashflow: ['Ashford\'s cash-flow forecast', 'bizCashFlowHtml'], profit: ['Ashford\'s income statement', 'bizProfitHtml'], balance: ['Ashford\'s statement of financial position', 'bizBalanceHtml'] }[key];
    if (real && FM[real[1]]) { let h = ''; try { h = FM[real[1]](lg); } catch (e) { h = ''; } return h ? `<div class="card bk-card"><h3>${real[0]} <small>(the club's real figures)</small></h3>${h}</div>` : ''; }
    return '';
  }
  function themePage(lg, themeKey) {
    const level = lvl(lg), themes = FM.BOOKS[level], th = themes.find((x) => x.key === themeKey) || themes[0], terms = termsFor(level);
    const cur = th.topics.find((tp) => tp.id === S.topic[th.key]) || th.topics[0]; S.topic[th.key] = cur.id;
    const nav = `<nav class="bk-topics" aria-label="Topics">${th.topics.map((tp) => `<button type="button" class="${tp.id === cur.id ? 'on' : ''}" data-bktopic="${tp.id}"><small>${tp.id}</small>${esc(tp.t)}</button>`).join('')}</nav>`;
    const defs = cur.c.map((c) => `<div class="bk-def"><dt>${termBtn(c[0], level)}</dt><dd>${linkify(c[1], c[0], level, terms)}</dd></div>`).join('');
    const vis = ((VISUALS[level] || {})[cur.id] || []).map((k) => visual(k, lg, level)).join('');
    const live = FM.booksLive ? FM.booksLive.html(lg, level, cur.id) : '';
    return `<div class="bk-layout">${nav}<div class="bk-article"><div class="eyebrow">${LEVEL_NAME[level]} Business · ${esc(th.title)} · ${cur.id}</div><h2>${esc(cur.t)}</h2><p class="bk-lead">${esc(cur.intro)} Click any underlined word and Rafael will explain it.</p>${live}${live ? vis : ''}<details class="bk-keys"${live ? '' : ' open'}><summary>Key ideas in this topic (${cur.c.length})</summary><dl class="bk-defs">${defs}</dl></details>${live ? '' : vis}</div></div>`;
  }

  FM.booksLearn = {
    tabs(lg) { const level = lvl(lg); return [['bk:shares', 'Shareholders']].concat((FM.BOOKS[level] || []).map((th) => ['bk:' + th.key, th.title.replace(/^Theme (\d): /, 'Theme $1 · ')])); },
    termBtn: termBtn,
    isTab(k) { return typeof k === 'string' && k.indexOf('bk:') === 0; },
    html(lg, key) { return key === 'bk:shares' ? sharesPage(lg) : themePage(lg, String(key).slice(3)); },
    bind(host, lg, redo, save, go) {
      if (FM.booksLive) FM.booksLive.bind(host, lg, redo, save, go);
      host.querySelectorAll('.bk-org').forEach((o) => { o.scrollLeft = Math.max(0, (o.scrollWidth - o.clientWidth) / 2); });
      host.querySelectorAll('.bk-term').forEach((b) => b.addEventListener('click', () => { if (FM.rafaelOpen) FM.rafaelOpen(null, { prefill: b.dataset.q }); }));
      host.querySelectorAll('[data-bktopic]').forEach((b) => b.addEventListener('click', () => { const th = (FM.BOOKS[lvl(lg)] || []).find((x) => x.topics.some((tp) => tp.id === b.dataset.bktopic) && S.topic.hasOwnProperty(x.key) || x.topics.some((tp) => tp.id === b.dataset.bktopic)); const cur = host.querySelector('.bk-article .eyebrow'); const key = ((FM.BOOKS[lvl(lg)] || []).find((x) => cur && cur.textContent.indexOf(x.title) >= 0) || th).key; S.topic[key] = b.dataset.bktopic; redo(); }));
      host.querySelectorAll('[data-be]').forEach((i) => i.addEventListener('input', () => { S.be[i.dataset.be] = Math.max(0, +i.value || 0); const card = host.querySelector('#bkBreak'); if (!card) return; const fresh = document.createElement('div'); fresh.innerHTML = breakevenCard(lvl(lg), null); card.querySelector('#bkBreakSvg').innerHTML = fresh.querySelector('#bkBreakSvg').innerHTML; card.querySelector('#bkBreakNote').innerHTML = fresh.querySelector('#bkBreakNote').innerHTML; }));
      host.querySelectorAll('[data-sd]').forEach((b) => b.addEventListener('click', () => { const v = b.dataset.sd; if (v === 'reset') { S.sd.d = 0; S.sd.s = 0; } else { const [k, n] = v.split(':'); S.sd[k] = Math.max(-3, Math.min(3, S.sd[k] + +n)); } redo(); }));
    },
  };
  const css = `
    .bk-card { padding: 16px; gap: 10px; } .bk-card h3 { margin: 0; font: 700 .95rem var(--sans); } .bk-card h3 small { font-weight: 400; opacity: .6; }
    .bk-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } @media (max-width: 900px) { .bk-grid2 { grid-template-columns: minmax(0, 1fr); } }
    .bk-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; } .bk-stats small { display: block; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; opacity: .65; } .bk-stats b { font-size: 1.25rem; color: var(--gold); font-variant-numeric: tabular-nums; }
    .bk-ownership { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: center; } @media (max-width: 560px) { .bk-ownership { grid-template-columns: 1fr; } } .bk-pie { width: 200px; height: 200px; }
    .bk-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: .85rem; } .bk-legend li { display: flex; gap: 8px; align-items: center; } .bk-legend i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    .bk-obj { margin: 0; padding-left: 1.1rem; display: grid; gap: 6px; } .bk-obj em { opacity: .65; font-style: normal; font-size: .85em; }
    .bk-layout { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 22px; align-items: start; } @media (max-width: 860px) { .bk-layout { grid-template-columns: minmax(0, 1fr); } }
    .bk-topics { display: grid; gap: 4px; position: sticky; top: 10px; } @media (max-width: 860px) { .bk-topics { position: static; display: flex; overflow-x: auto; padding-bottom: 6px; } .bk-topics button { flex: none; width: 150px; } } .bk-topics button { text-align: left; padding: 9px 12px; background: transparent; border: 1px solid var(--line); display: grid; gap: 2px; } .bk-topics button small { color: var(--gold); font-size: .7rem; letter-spacing: .08em; } .bk-topics button.on { background: rgba(215,184,107,.12); border-color: var(--gold); }
    .bk-article { display: grid; gap: 14px; min-width: 0; } .bk-article h2 { margin: 0; font-size: 1.5rem; }
    .bk-defs { margin: 0; display: grid; gap: 0; border-top: 1px solid var(--line); } .bk-def { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); } @media (max-width: 700px) { .bk-def { grid-template-columns: 1fr; gap: 4px; } }
    .bk-def dt { font-weight: 700; } .bk-def dd { margin: 0; line-height: 1.6; font-size: .92rem; opacity: .92; }
    .bk-def dt .bk-term, .bk-article .bk-term, .bk-card .bk-term { display: inline; width: auto; min-height: 0; height: auto; padding: 0 1px; margin: 0; border: 0; border-bottom: 1px dashed var(--gold); border-radius: 0; background: transparent; box-shadow: none; color: var(--gold); font: inherit; letter-spacing: normal; text-transform: none; cursor: pointer; text-align: left; line-height: inherit; } .bk-article .bk-term:hover, .bk-card .bk-term:hover { background: rgba(215,184,107,.14); }
    .board-tabs { flex-wrap: wrap; }
    .bk-live h3 { font-size: 1.15rem; margin: 0; } .bk-live .eyebrow { margin: 0; } .bk-live th, .bk-live td { text-align: left; } .bk-live td.l b, .bk-live td b { font-weight: 700; } .bk-keys > summary { cursor: pointer; font-weight: 700; padding: 8px 0; color: var(--gold); } .bk-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; } .bk-ctl { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; } .bk-in select { background: var(--navy-raise, #2f3533); color: var(--cream); border: 1px solid var(--line); padding: 6px 8px; font: inherit; } .bk-live .banner { margin: 0; }
    .bk-chart { width: 100%; max-width: 560px; height: auto; } .bk-inputs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; } @media (max-width: 700px) { .bk-inputs { grid-template-columns: repeat(2, 1fr); } } .bk-in { display: grid; gap: 3px; font-size: .75rem; } .bk-in input { background: var(--navy-raise, #2f3533); color: var(--cream); border: 1px solid var(--line); padding: 6px 8px; font: inherit; }
    .bk-sdbtn { display: flex; flex-wrap: wrap; gap: 6px; }
    .bk-org ul { list-style: none; margin: 0; padding: 0; } .bk-org { overflow-x: auto; } .bk-org > ul { padding: 8px 0 14px; display: flex; width: max-content; min-width: 100%; justify-content: center; margin: 0 auto; } .bk-org li { position: relative; display: flex; flex-direction: column; align-items: center; padding: 18px 3px 0; }
    .bk-org li > ul { display: flex; justify-content: center; position: relative; padding-top: 18px; } .bk-org li > ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1px solid rgba(244,237,218,.4); height: 18px; }
    .bk-org li::before, .bk-org li::after { content: ''; position: absolute; top: 0; right: 50%; width: 50%; height: 18px; border-top: 1px solid rgba(244,237,218,.4); } .bk-org li::after { right: auto; left: 50%; border-left: 1px solid rgba(244,237,218,.4); }
    .bk-org > ul > li::before, .bk-org > ul > li::after { display: none; } .bk-org li:only-child::before, .bk-org li:only-child::after { display: none; } .bk-org li:only-child { padding-top: 0; } .bk-org li:first-child::before, .bk-org li:last-child::after { border: 0; } .bk-org li:last-child::before { border-right: 1px solid rgba(244,237,218,.4); border-radius: 0 6px 0 0; } .bk-org li:first-child::after { border-radius: 6px 0 0 0; }
    .bk-node { border: 1px solid var(--line); background: rgba(255,255,255,.04); padding: 6px 7px; text-align: center; width: 80px; display: grid; gap: 2px; font-size: .68rem; line-height: 1.25; overflow-wrap: anywhere; } .bk-node span { opacity: .7; font-size: .66rem; }
  `;
  FM.booksLearnCss = css;
})();
