// The analysis page, as Francesco Moretti (the assistant manager) tells it. Everything on it is worked out by code from the match and the tactics:
// a humane round-up of the last match and of the next one, and one piece of maths about the manager's own build-up: where the opposition's
// press can reach (a circle) against where our passes go (straight lines), with the working shown at the manager's level and an Apply button for the fix.
// The old analysis page is kept in analysis.js as FM.renderAnalysisOld.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  if (FM.renderAnalysis && !FM.renderAnalysisOld) FM.renderAnalysisOld = FM.renderAnalysis;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, key) => arr[hash(String(key)) % arr.length];

  // ---------- the club and the match ----------
  const overall = (p) => { const r = p.ratings || {}; return p.natural === 'GK' ? (r.gk || 60) : ((r.pace || 60) + (r.dribbling || 60) + (r.passing || 60) + (r.finishing || 60) + (r.tackling || 60)) / 5; };
  const strength = (team) => { const ps = team.players || []; return ps.length ? ps.reduce((a, p) => a + overall(p), 0) / ps.length : 60; };
  function userFixtures(lg) {
    const all = (lg.fixtures || []).concat((lg.cup && lg.cup.fixtures) || []).concat(lg.preseason ? [lg.preseason] : []).filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId));
    return all.sort((a, b) => (a.round - b.round) || (a.cup ? 1 : 0) - (b.cup ? 1 : 0));
  }
  function expectation(lg, fx) {
    const me = FM.teamById(lg, lg.userId), oppId = fx.homeId === lg.userId ? fx.awayId : fx.homeId, opp = FM.teamById(lg, oppId);
    const gap = strength(me) - strength(opp), home = fx.homeId === lg.userId ? 0.25 : -0.1;
    return { gap, expGd: gap * 0.1 + home, opp };
  }
  // ---------- Francesco's words ----------
  const HELLO = ['Salve, mister.', 'Buongiorno, mister.', 'Ciao, mister.', 'Allora, mister.', 'Buonasera, mister.'];
  function previousNote(lg, fx) {
    const mine = fx.homeId === lg.userId, gf = mine ? fx.hg : fx.ag, ga = mine ? fx.ag : fx.hg, gd = gf - ga;
    const ex = expectation(lg, fx), opp = ex.opp.name, over = gd - ex.expGd, key = fx.id + '|prev';
    const hello = pick(HELLO, key + 'h'), score = `${gf}-${ga} against ${opp}`;
    if (fx.preseason) return `${hello} ${score} in the pre-season friendly, against a club from a lower division. Nothing is at stake, so it is how we played that matters, not the score. Let us see what the match shows us.`;
    const fav = ex.expGd > 0.6 ? 'favourites' : ex.expGd < -0.6 ? 'underdogs' : 'an even match';
    let body;
    if (gd >= 4) body = pick([`Che partita! ${score}. I have rarely seen us so good. Enjoy it tonight, and tomorrow we will ask ourselves what worked, so that we can do it again.`, `${score}: a real statement. The lads were superb. But keep your feet on the ground, mister: a big win is also when we get careless.`], key);
    else if (gd <= -4) body = pick([`Mister, this one hurts: ${score}. There is no sense dressing it up. But a heavy defeat is also very clear information, and we will go through it together, calmly.`, `${score}. I will be honest: that was a difficult night. Nobody in the dressing room needs shouting at. They need a plan, and I think we can build one.`], key);
    else if (gd > 0 && ex.expGd < -0.6) body = pick([`Bravo, mister! ${score}, and as ${fav} we were not meant to win this one. The result is better than the numbers said it would be, so let us find out how we did it.`, `A fine win: ${score}. We were the underdogs here and we beat them. Let us look at exactly what we did well.`], key);
    else if (gd > 0 && ex.expGd > 0.6) body = pick([`${score}: the win we expected, as ${fav}. It was not a surprise, so the question is whether we were as good as the score, or only as good as the opposition let us be.`, `We did what we were supposed to do: ${score}. Three points are three points, but I want to see whether we made it harder than it needed to be.`], key);
    else if (gd > 0) body = pick([`A good win, ${score}, in a game that could have gone either way. Well done.`, `${score}. A close match and we came out on top. Let us see how much of that was us.`], key);
    else if (gd === 0) body = pick([`${score}: a draw. Against ${ex.opp.name} that is ${over > 0.4 ? 'a good point' : over < -0.4 ? 'a little disappointing' : 'about fair'}. Let us see where the points slipped, or where they were saved.`, `A draw, ${score}. ${over > 0.4 ? 'I am happy enough with it.' : 'We wanted more, but it was not without reason.'}`], key);
    else if (ex.expGd > 0.6) body = pick([`${score}, and we were the favourites. This one stings, mister. It is not a disaster, but we must find out why the better team lost.`, `We should have won this: ${score}. I do not blame anyone yet. Let us see what happened.`], key);
    else body = pick([`${score}. A defeat, but against ${ex.opp.name} we were ${fav}, so it is not a surprise. Let us look at what we can take from it.`, `We lost ${score}. It was close to what we expected, mister. The question is what we do next.`], key);
    return `${hello} ${body}`;
  }
  function nextNote(lg, nx, prev) {
    const me = FM.teamById(lg, lg.userId), oppId = nx.homeId === lg.userId ? nx.awayId : nx.homeId, opp = FM.teamById(lg, oppId), key = nx.id + '|next';
    const gap = strength(opp) - strength(me), home = nx.homeId === lg.userId;
    const last = prev ? ((prev.homeId === lg.userId ? prev.hg - prev.ag : prev.ag - prev.hg)) : null;
    const ctx = last == null ? '' : last >= 3 ? 'After that big win the lads will be flying, but ' : last > 0 ? 'After the win, ' : last === 0 ? 'After the draw, ' : last <= -3 ? 'After that heavy defeat we have to be careful, and ' : 'After the defeat, ';
    let body;
    if (gap >= 4) body = pick([`${opp.name} are a much harder opponent than the last one, so the approach may have to change. I would not simply do the same again.`, `This will be a tough one: ${opp.name} are clearly stronger than us. We should think about what we can do to make life difficult for them, not only about what we do well.`], key);
    else if (gap >= 1.5) body = pick([`${opp.name} are a little stronger than us, so I think we have to be a bit smarter. Small changes can matter.`, `${opp.name} are a step above, so the approach may need some care.`], key);
    else if (gap <= -4) body = pick([`${opp.name} should be easier than the last team, but it is exactly these matches that trip us up. Let us stay disciplined.`, `We are the stronger side against ${opp.name}. We should expect to have the ball, so the question is how we use it.`], key);
    else body = pick([`${opp.name} are a similar level to us, so the details will decide it: our shape, and how we start.`, `It looks even against ${opp.name}. Preparation is what will make the difference.`], key);
    const hm = home ? 'We are at home, which helps. ' : 'We are away, so the early minutes will be quiet and difficult. ';
    return `${pick(HELLO, key + 'h')} ${ctx.length ? ctx.charAt(0).toUpperCase() + ctx.slice(1) : ''}${body} ${hm}Here is what I would work on.`;
  }

  // ---------- the geometry ----------
  const R = 4;   // how far a defender can get in the half second a pass takes to set off: about 7 m/s x 0.55 s, so a circle of radius 4 m around him
  function pointsOf(lg) {
    const L = FM.PITCH.L, W = FM.PITCH.W, me = FM.teamById(lg, lg.userId), nx = FM.nextUserFixture(lg), played = userFixtures(lg), last = played[played.length - 1];
    const oppId = nx ? (nx.homeId === lg.userId ? nx.awayId : nx.homeId) : last ? (last.homeId === lg.userId ? last.awayId : last.homeId) : null, opp = oppId ? FM.teamById(lg, oppId) : null;
    const ours = me.players.filter((p) => p.group !== 'GK').map((p) => { const q = FM.phasePos(me, p, 'build'); return { p, x: q.d * L, y: q.w * W }; });
    const theirs = opp ? opp.players.filter((p) => p.group !== 'GK').map((p) => { const q = FM.phasePos(opp, p, 'press'); return { p, x: (1 - q.d) * L, y: (1 - q.w) * W }; }) : [];
    return { L, W, me, opp, ours, theirs };
  }
  function segDist(A, B, C) {
    const dx = B.x - A.x, dy = B.y - A.y, t = Math.max(0, Math.min(1, ((C.x - A.x) * dx + (C.y - A.y) * dy) / (dx * dx + dy * dy || 1)));
    return { d: Math.hypot(A.x + t * dx - C.x, A.y + t * dy - C.y), t };
  }
  function findCase(g) {
    const cbs = g.ours.filter((o) => o.p.group === 'CB').sort((a, b) => a.y - b.y), carrier = cbs[0] || g.ours.slice().sort((a, b) => a.x - b.x)[0];
    if (!carrier) return null;
    const lines = g.ours.filter((o) => o !== carrier && Math.hypot(o.x - carrier.x, o.y - carrier.y) > 8 && Math.hypot(o.x - carrier.x, o.y - carrier.y) < 45).map((o) => {
      let worst = null; g.theirs.forEach((c) => { const s = segDist(carrier, o, c); if (!worst || s.d < worst.d) worst = { c, d: s.d, t: s.t }; });
      return { to: o, worst, blocked: !!worst && worst.d < R, prog: o.x - carrier.x };
    });
    const blocked = lines.filter((l) => l.blocked).sort((a, b) => b.prog - a.prog);
    const chosen = blocked[0] || lines.filter((l) => l.worst).sort((a, b) => a.worst.d - b.worst.d)[0] || null;
    return { carrier, lines, chosen, nBlocked: blocked.length };
  }
  // the receiver is moved along the normal to the pass, away from the circle, until the line clears it with half a metre to spare
  function fixFor(g, cs) {
    const l = cs.chosen; if (!l || !l.blocked) return null;
    const A = cs.carrier, B = l.to, C = l.worst.c, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, cross = dx * (C.y - A.y) - dy * (C.x - A.x), away = cross > 0 ? -1 : 1;   // the normal points left of the pass; the receiver goes to the side away from the defender
    const need = (R + 0.5 - l.worst.d) / Math.max(0.25, l.worst.t), mv = Math.min(14, need);
    const nb = { x: Math.max(2, Math.min(g.L - 2, B.x + nx * away * mv)), y: Math.max(2, Math.min(g.W - 2, B.y + ny * away * mv)) };
    let after = 99; g.theirs.forEach((c) => { after = Math.min(after, segDist(A, nb, c).d); });
    return { to: nb, moved: mv, clearance: after, ok: after >= R };
  }

  // ---------- drawing ----------
  function pitchSvg(g, cs, fix) {
    const S = 5, w = g.L * S, h = g.W * S, kit = g.me.kit || { shirt: '#2a6df0', number: '#fff' }, oppKit = (g.opp && g.opp.kit) || { shirt: '#d33', number: '#fff' };
    const X = (v) => (v * S).toFixed(1), ln = 'stroke="rgba(255,255,255,.55)" stroke-width="1.4" fill="none"';
    let s = `<svg class="an2-pitch" viewBox="-6 -6 ${w + 12} ${h + 12}" role="img" aria-label="Our build-up shape, our passing lines and the circles the opposition can reach"><rect x="0" y="0" width="${w}" height="${h}" fill="#3A4A40"/>`;
    s += `<rect x="0" y="0" width="${w}" height="${h}" ${ln}/><line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" ${ln}/><circle cx="${w / 2}" cy="${h / 2}" r="${9.15 * S}" ${ln}/>`;
    s += `<rect x="0" y="${X(g.W / 2 - 20.16)}" width="${X(16.5)}" height="${X(40.32)}" ${ln}/><rect x="${X(g.L - 16.5)}" y="${X(g.W / 2 - 20.16)}" width="${X(16.5)}" height="${X(40.32)}" ${ln}/>`;
    g.theirs.forEach((c) => { s += `<circle cx="${X(c.x)}" cy="${X(c.y)}" r="${X(R)}" fill="rgba(231,128,120,.13)" stroke="rgba(231,128,120,.75)" stroke-dasharray="4 4" stroke-width="1.4"/>`; });
    const draw = (A, B, cls) => `<line x1="${X(A.x)}" y1="${X(A.y)}" x2="${X(B.x)}" y2="${X(B.y)}" stroke="${cls}" stroke-width="2.2"/>`;
    cs.lines.forEach((l) => { if (l !== cs.chosen) s += draw(cs.carrier, l.to, 'rgba(244,237,218,.25)'); });
    const ch = cs.chosen;
    if (ch) { s += draw(cs.carrier, fix ? fix.to : ch.to, fix ? '#7fd49a' : (ch.blocked ? '#ff8a7a' : '#d7b86b')); if (!fix && ch.blocked && ch.worst) { const A = cs.carrier, B = ch.to, p = { x: A.x + ch.worst.t * (B.x - A.x), y: A.y + ch.worst.t * (B.y - A.y) }; s += `<circle cx="${X(p.x)}" cy="${X(p.y)}" r="5" fill="#ff8a7a" stroke="#1f2322" stroke-width="2"/>`; } }
    g.theirs.forEach((c) => { s += `<circle cx="${X(c.x)}" cy="${X(c.y)}" r="9" fill="${oppKit.shirt}" stroke="#fff" stroke-width="1.5"/>`; });
    g.ours.forEach((o) => { const isB = ch && o === ch.to, pos = isB && fix ? fix.to : o; s += `<circle cx="${X(pos.x)}" cy="${X(pos.y)}" r="10" fill="${kit.shirt}" stroke="${o === cs.carrier ? '#d7b86b' : '#fff'}" stroke-width="${o === cs.carrier || isB ? 3 : 1.5}"/><text x="${X(pos.x)}" y="${(pos.y * S + 3.6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${kit.number}" font-family="Arial">${o.p.number}</text>`; });
    if (fix && ch) s += `<circle cx="${X(ch.to.x)}" cy="${X(ch.to.y)}" r="10" fill="none" stroke="rgba(244,237,218,.4)" stroke-dasharray="3 3"/>`;
    return s + '</svg>';
  }

  // ---------- the maths, from first principles ----------
  const pre = (label, q) => `<button type="button" class="an2-pre" data-q="${esc(q)}">${esc(label)}</button>`;
  function maths(g, cs, level) {
    const ch = cs.chosen; if (!ch) return '<p>There is not enough of a shape to look at yet. Set up the build-up on the tactics page and come back.</p>';
    const A = cs.carrier, B = ch.to, C = ch.worst.c, name = (o) => '#' + o.p.number + ' ' + (o.p.name.split(' ').slice(1).join(' ') || o.p.name), cname = '#' + C.p.number + ' ' + (C.p.name.split(' ').slice(1).join(' ') || C.p.name);
    const dx = B.x - A.x, dy = B.y - A.y;
    const q = (t) => `Can you explain ${t} from first principles, with a simple example from a football pitch? Please send me a question to try afterwards.`;
    let h = `<p>Here is a picture of our build-up, taken at the moment ${esc(name(A))} has the ball. Each of our passes is a <b>straight line</b> between two players. The opposition cannot move to a point instantly, so around each of them I draw a <b>circle</b> of radius ${R} m: a defender can cover about 7 m/s for about half a second before the pass is away. If a passing line goes through a circle, that pass can be cut out.</p>`;
    h += `<p class="an2-ask">Words in <span class="an2-pre-demo">this style</span> are ideas you need for this: click one and I will explain it.</p>`;
    h += `<h4>1. Put the players on coordinates</h4><p>Measure from our own goal along the pitch (<i>x</i>) and from the touchline across it (<i>y</i>), in metres. ${esc(name(A))} is at <b>(${f1(A.x)}, ${f1(A.y)})</b>, the receiver ${esc(name(B))} at <b>(${f1(B.x)}, ${f1(B.y)})</b>, and ${esc(cname)} of ${esc(g.opp ? g.opp.name : 'the opposition')} at <b>(${f1(C.x)}, ${f1(C.y)})</b>. ${pre('coordinates', q('what coordinates are and how to read a point (x, y)'))} ${pre('distance between two points', q('how to find the distance between two points using Pythagoras'))}</p>`;
    if (level === 'gcse') {
      const m = dy / (dx || 1e-9), c0 = A.y - m * A.x;
      h += `<h4>2. The equation of the passing line</h4><p>The gradient is the change in <i>y</i> over the change in <i>x</i>: <i>m</i> = (${f1(B.y)} − ${f1(A.y)}) ÷ (${f1(B.x)} − ${f1(A.x)}) = <b>${f2(m)}</b>. The line goes through (${f1(A.x)}, ${f1(A.y)}), so <i>y</i> = ${f2(m)}<i>x</i> + <i>c</i> gives <i>c</i> = ${f1(A.y)} − ${f2(m)} × ${f1(A.x)} = ${f2(c0)}. The pass is the line <b><i>y</i> = ${f2(m)}<i>x</i> ${c0 < 0 ? '−' : '+'} ${f2(Math.abs(c0))}</b>, between <i>x</i> = ${f1(A.x)} and <i>x</i> = ${f1(B.x)}. ${pre('gradient of a line', q('how to find the gradient of a straight line'))} ${pre('equation of a straight line', q('how to find the equation y = mx + c of a straight line through two points'))}</p>`;
      h += `<h4>3. The circle, and where the line meets it</h4><p>A circle with centre (${f1(C.x)}, ${f1(C.y)}) and radius ${R} has equation <b>(<i>x</i> − ${f1(C.x)})² + (<i>y</i> − ${f1(C.y)})² = ${R * R}</b>. ${pre('equation of a circle', q('the equation of a circle (x - a)^2 + (y - b)^2 = r^2'))} To find where the line meets the circle, put <i>y</i> = ${f2(m)}<i>x</i> ${c0 < 0 ? '−' : '+'} ${f2(Math.abs(c0))} into the circle and collect terms: a quadratic in <i>x</i>. If it has solutions that lie between <i>x</i> = ${f1(Math.min(A.x, B.x))} and ${f1(Math.max(A.x, B.x))}, the pass goes through the circle. ${pre('simultaneous equations (line and circle)', q('how to solve a line and a circle simultaneously by substitution'))} ${pre('quadratic equation and its discriminant', q('how the discriminant b^2 - 4ac tells you how many solutions a quadratic has'))}</p>`;
    } else {
      const aa = dx * dx + dy * dy, fx = A.x - C.x, fy = A.y - C.y, bb = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - R * R, disc = bb * bb - 4 * aa * cc;
      h += `<h4>2. The pass as a vector equation</h4><p>The pass runs along the <b>direction vector</b> <b>d</b> = B − A = (${f1(dx)}, ${f1(dy)}). Every point on it is <b>r</b>(<i>t</i>) = A + <i>t</i><b>d</b>, with 0 ≤ <i>t</i> ≤ 1: <i>t</i> = 0 is the passer, <i>t</i> = 1 the receiver. ${pre('vectors', q('vectors, direction vectors and adding them'))} ${pre('vector equation of a line', q('the vector equation of a line r = a + t d'))}</p>`;
      h += `<h4>3. Where the line meets the circle</h4><p>A point is on the circle when its distance from the centre C is ${R}: |<b>r</b>(<i>t</i>) − C|² = ${R * R}. Write <b>f</b> = A − C = (${f1(fx)}, ${f1(fy)}). Then |<b>f</b> + <i>t</i><b>d</b>|² = ${R * R}, which expands to <b>d·d</b> <i>t</i>² + 2(<b>f·d</b>) <i>t</i> + (<b>f·f</b> − ${R * R}) = 0, a quadratic in <i>t</i> with <i>a</i> = ${f1(aa)}, <i>b</i> = ${f1(bb)}, <i>c</i> = ${f1(cc)}. ${pre('equation of a circle', q('the equation of a circle and the vector form |r - c| = radius'))} ${pre('dot product', q('the dot product of two vectors and what d·d means'))} ${pre('quadratic equation and its discriminant', q('how the discriminant b^2 - 4ac tells you how many solutions a quadratic has'))}</p>`;
      const t1 = disc >= 0 ? (-bb - Math.sqrt(disc)) / (2 * aa) : null, t2 = disc >= 0 ? (-bb + Math.sqrt(disc)) / (2 * aa) : null;
      h += `<h4>4. Reading the discriminant</h4><p><i>b</i>² − 4<i>ac</i> = ${f1(disc)}. ${disc < 0 ? 'It is negative: the line never meets the circle at all, so the pass is clear.' : `It is positive, so the <i>whole</i> line meets the circle at <i>t</i> = ${f2(t1)} and <i>t</i> = ${f2(t2)}. Only values between 0 and 1 are on the pass itself: ${(t2 < 0 || t1 > 1) ? 'both are outside, so the pass is clear.' : 'at least one is inside, so <b>the pass passes through the circle</b>: ' + esc(cname) + ' can reach it.'}`}</p>`;
    }
    h += `<p>${ch.blocked ? `Result: the line comes within <b>${f1(ch.worst.d)} m</b> of ${esc(cname)}, closer than the ${R} m he can cover. This pass is not safe as we are set up.` : `Result: the closest any defender gets to this line is <b>${f1(ch.worst.d)} m</b>, outside the ${R} m circle, so this pass is safe. ${cs.nBlocked ? `But ${cs.nBlocked} of our other passing options are blocked.` : 'None of our passing options in this shape are blocked, which is what we want.'}`}</p>`;
    return h;
  }

  // ---------- the page ----------
  const css = `
    .an2 { display: grid; gap: 14px; } .an2-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .an2-bar h2 { margin: 0; font-size: 1.05rem; } .an2-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0; border: 1px solid var(--line); } @media (max-width: 960px) { .an2-cols { grid-template-columns: minmax(0, 1fr); } }
    .an2-col { padding: 18px; display: grid; gap: 14px; align-content: start; } .an2-col + .an2-col { border-left: 1px solid var(--line); } @media (max-width: 960px) { .an2-col + .an2-col { border-left: 0; border-top: 1px solid var(--line); } }
    .an2-col > h3 { margin: 0; font-size: .78rem; letter-spacing: .14em; text-transform: uppercase; color: var(--gold); font-family: var(--sans); }
    .an2-note { display: grid; grid-template-columns: 2.6rem 1fr; gap: 12px; align-items: start; } .an2-av { width: 2.6rem; height: 2.6rem; display: grid; place-items: center; border-radius: 50%; background: #2f3533; border: 1px solid var(--line); font: 700 .78rem var(--sans); color: var(--gold); }
    .an2-note b { display: block; font-family: var(--sans); font-size: .8rem; margin-bottom: 3px; } .an2-note p { margin: 0; line-height: 1.55; font-size: .95rem; }
    .an2-pitch { width: 100%; height: auto; display: block; } .an2 h4 { margin: 12px 0 4px; font: 700 .82rem var(--sans); letter-spacing: .04em; } .an2 p { line-height: 1.6; }
    .an2-pre { display: inline; padding: 0 3px; margin: 0 1px; border: 0; border-bottom: 1px dashed var(--gold); background: transparent; color: var(--gold); font: inherit; font-weight: 700; cursor: pointer; } .an2-pre:hover { background: rgba(215,184,107,.12); }
    .an2-pre-demo { border-bottom: 1px dashed var(--gold); color: var(--gold); font-weight: 700; } .an2-ask { font-size: .82rem; opacity: .8; }
    .an2-apply { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; } .an2-wb { position: fixed; left: 0; top: 0; bottom: 0; width: min(1000px, 96vw); z-index: 80; background: #1f2322; border-right: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; box-shadow: 20px 0 60px rgba(0,0,0,.4); }
    .an2-wb-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); } .an2-wb-host { overflow: auto; }
    .an2-good { color: #7fd49a; font-weight: 700; }
  `;
  FM.renderAnalysis = function (host, league) {
    if (!document.getElementById('an2css')) { const st = document.createElement('style'); st.id = 'an2css'; st.textContent = css; document.head.appendChild(st); }
    if (FM.mountAgent && !document.getElementById('lmAgent')) FM.mountAgent(() => (FM.agentContext ? FM.agentContext(league, 'analysis') : ''));
    if (FM.agentHide) FM.agentHide(false);
    const played = userFixtures(league), prev = played[played.length - 1] || null, nx = FM.nextUserFixture(league);
    const me = FM.teamById(league, league.userId), level = league.tier === 'gcse' ? 'gcse' : 'alevel';
    const prevOpp = prev ? FM.teamById(league, prev.homeId === league.userId ? prev.awayId : prev.homeId) : null, nxOpp = nx ? FM.teamById(league, nx.homeId === league.userId ? nx.awayId : nx.homeId) : null;
    const g = pointsOf(league), cs = g.opp ? findCase(g) : null, fix = cs ? fixFor(g, cs) : null;
    const note = (html) => `<div class="an2-note"><span class="an2-av">FM</span><div><b>Francesco Moretti, assistant manager</b><p>${html}</p></div></div>`;
    const prevHead = prev ? `Previous match vs ${esc(prevOpp.name)}` : 'Previous match', nxHead = nx ? `Next match vs ${esc(nxOpp.name)}` : 'Next match';
    const prevNoteHtml = prev ? esc(previousNote(league, prev)) : `${esc(pick(HELLO, 'start'))} We have not played yet, so there is nothing to look back on. Below is a first look at the shape you have chosen: it is a good place to begin.`;
    const nxNoteHtml = nx ? esc(nextNote(league, nx, prev)) : 'There is no match to prepare for at the moment.';
    host.innerHTML = `<div class="an2">
      <div class="an2-bar"><span></span><button type="button" id="anWbOpen">Workbook</button></div>
      <div class="an2-cols">
        <section class="an2-col" id="anPrev"><h3>${prevHead}</h3>${note(prevNoteHtml)}
          <div class="card" style="padding:14px">${cs ? `<h2>Our build-up against the press</h2>${pitchSvg(g, cs, null)}${maths(g, cs, level)}` : '<p>Set up your build-up on the tactics page and I will have something to show you.</p>'}</div></section>
        <section class="an2-col" id="anNext"><h3>${nxHead}</h3>${note(nxNoteHtml)}
          <div class="card" style="padding:14px">${cs && cs.chosen ? (fix ? `<h2>A change that clears the pass</h2>${pitchSvg(g, cs, fix)}<p>I would move <b>#${cs.chosen.to.p.number} ${esc(cs.chosen.to.p.name)}</b> about <b>${f1(fix.moved)} m</b> across, to (${f1(fix.to.x)}, ${f1(fix.to.y)}). Now the line from #${cs.carrier.p.number} stays <b class="an2-good">${f1(fix.clearance)} m</b> from every circle, outside the ${R} m reach, so the pass is open. The same working as before, with the new coordinates, gives a negative discriminant.</p><div class="an2-apply"><button type="button" class="primary" id="anApply">Apply this change</button><span class="note" id="anApplied"></span></div>${nxOpp && strength(nxOpp) - strength(me) >= 3 ? `<p class="note">${esc(nxOpp.name)} are stronger than us, so we may be defending for long spells. A physically strong striker who can hold the ball up would give us an outlet when we win it back.</p>` : ''}` : (cs.chosen.blocked ? '<p>I could not find a small move that clears this pass without pulling the player out of shape. A different build-up pattern is worth a look on the tactics page.</p>' : '<h2>Nothing to change</h2><p>Every passing line in this shape stays outside the circles, so I would leave the build-up as it is and look at the next phase.</p>')) : '<p>Once the build-up shape is set up I will suggest one change here.</p>'}</div></section>
      </div>
      <aside class="an2-wb" id="anWb" hidden><div class="an2-wb-head"><b>Workbook</b><button type="button" id="anWbClose">Close</button></div><div class="an2-wb-host" id="anWbHost"></div></aside></div>`;
    host.querySelectorAll('.an2-pre').forEach((b) => b.addEventListener('click', () => { if (FM.agentOpen) FM.agentOpen(null, { prefill: b.dataset.q }); }));
    const wb = host.querySelector('#anWb'), wbHost = host.querySelector('#anWbHost');
    host.querySelector('#anWbOpen').addEventListener('click', () => { wb.hidden = false; if (!wbHost.dataset.ready && FM.renderWorkbench) { wbHost.dataset.ready = '1'; try { FM.renderWorkbench(wbHost, league, { save: () => FM.saveLeague(league) }); } catch (e) { wbHost.innerHTML = '<p style="padding:16px">The Workbook could not open here.</p>'; } } });
    host.querySelector('#anWbClose').addEventListener('click', () => { wb.hidden = true; });
    const ap = host.querySelector('#anApply');
    if (ap && fix) ap.addEventListener('click', () => {
      const o = cs.chosen.to; FM.setPhasePos(g.me, o.p, 'build', { d: fix.to.x / g.L, w: fix.to.y / g.W }); try { FM.saveLeague(league); } catch (e) { /* kept in the game */ }
      host.querySelector('#anApplied').textContent = 'Done: #' + o.p.number + ' now starts there in the build-up.'; ap.disabled = true;
    });
  };
})();
