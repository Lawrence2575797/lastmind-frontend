// A season already played. Every new game is set in the season after one that has been played in all four divisions: it is worked out here, match by match, from the
// squads as they are, so that every player has a record to be judged on (appearances, goals, assists, shots, passing, defending, a rating for each match) and every club has a
// finishing place. The recruitment pages read it. Nothing here touches the real fixtures: the season about to be played starts clean.
//
// It is a statistical simulation, not the match engine: the engine takes seconds for a match and there are two hundred and twenty-four to play. Each match gives the two clubs
// an expected-goals figure from the quality of their best elevens, plays out the goals and the shots, and then shares everything between the players who were on the pitch
// according to their position and their own ratings. So a striker with high finishing scores more, a midfielder with high passing makes more chances, and so on.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const POS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];
  // how much of each kind of thing a player does for his position, at a rating of about 60 (per match played in full)
  const W = {
    shot: { GK: 0, CB: 0.25, FB: 0.3, DM: 0.35, CM: 0.7, AM: 1.4, WF: 1.7, ST: 2.4 },
    key: { GK: 0, CB: 0.1, FB: 0.6, DM: 0.5, CM: 1.0, AM: 1.7, WF: 1.4, ST: 0.6 },
    pass: { GK: 22, CB: 52, FB: 44, DM: 58, CM: 54, AM: 40, WF: 30, ST: 18 },
    tackle: { GK: 0, CB: 1.7, FB: 2.2, DM: 2.9, CM: 2.0, AM: 1.0, WF: 1.0, ST: 0.5 },
    inter: { GK: 0, CB: 1.6, FB: 1.4, DM: 1.9, CM: 1.2, AM: 0.6, WF: 0.5, ST: 0.3 },
    clear: { GK: 0, CB: 4.2, FB: 2.2, DM: 1.6, CM: 0.8, AM: 0.3, WF: 0.3, ST: 0.5 },
    aerial: { GK: 0, CB: 3.6, FB: 1.4, DM: 1.8, CM: 1.2, AM: 0.9, WF: 0.8, ST: 3.2 },
    drib: { GK: 0, CB: 0.4, FB: 1.6, DM: 0.9, CM: 1.6, AM: 2.8, WF: 3.8, ST: 1.8 },
    foul: { GK: 0.05, CB: 0.9, FB: 0.9, DM: 1.2, CM: 1.0, AM: 0.7, WF: 0.6, ST: 0.8 },
  };
  const att = (p, k) => { const r = p.baseRatings || p.ratings || {}; return r[k] != null ? r[k] : 50; };
  const pick = (rng, list, wf) => { let tot = 0; const w = list.map((x) => { const v = Math.max(0, wf(x)); tot += v; return v; }); if (tot <= 0) return list[Math.floor(rng() * list.length)] || null; let r = rng() * tot; for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; };
  const poisson = (rng, lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 14); return k - 1; };
  const gauss = (rng) => { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const blank = () => ({ ap: 0, st: 0, mn: 0, g: 0, a: 0, sh: 0, sot: 0, xg: 0, xa: 0, kp: 0, ps: 0, pok: 0, tk: 0, tkw: 0, ic: 0, cl: 0, aw: 0, al: 0, dr: 0, drw: 0, fl: 0, yc: 0, rc: 0, sv: 0, ga: 0, cs: 0, rs: 0, rt: [] });

  // who plays: the usual eleven, with rotation (a rest, a knock) and three substitutions
  function lineup(team, rng) {
    const xi = (team.players && team.players.length ? team.players : team.squad.slice(0, 11)).slice();
    const bench = team.squad.filter((p) => xi.indexOf(p) < 0).sort((a, b) => FM.playerRating(b, b.natural) - FM.playerRating(a, a.natural));
    const used = new Set(), start = [];
    xi.forEach((p) => {
      let q = p;
      if (rng() < (p.natural === 'GK' ? 0.03 : 0.1)) {   // a rest or a knock: the best bench player in his position, or the best there is
        const sub = bench.find((b) => !used.has(b) && b.natural === p.natural) || bench.find((b) => !used.has(b) && b.natural !== 'GK' && p.natural !== 'GK');
        if (sub) q = sub;
      }
      used.add(q); start.push({ p: q, from: 0, to: 90 });
    });
    // three substitutions: outfield players off between the 55th and 85th minute, bench players on for the rest
    const offs = start.filter((s) => s.p.natural !== 'GK').sort(() => rng() - 0.5).slice(0, 3), subs = [];
    offs.forEach((o) => {
      const minute = Math.round(55 + rng() * 30), on = bench.find((b) => !used.has(b) && b.natural !== 'GK');
      if (!on) return; used.add(on); o.to = minute; subs.push({ p: on, from: minute, to: 90 });
    });
    return start.concat(subs);
  }

  function playMatch(league, home, away, rng, prior, bias) {
    const quality = (t) => { const r = (t.squad || []).map((p) => FM.playerRating(p, p.natural)).sort((a, b) => b - a).slice(0, 11); return (r.length ? r.reduce((a, b) => a + b, 0) / r.length : 6) + ((bias && bias[t.id]) || 0); };
    const qh = quality(home), qa = quality(away);
    const lh = clamp(1.4 * Math.exp(0.5 * (qh - qa)), 0.3, 3.8), la = clamp(1.1 * Math.exp(0.5 * (qa - qh)), 0.25, 3.4);
    const hg = poisson(rng, lh), ag = poisson(rng, la);
    const sides = [[home, away, hg, ag, lh, la, qh, qa], [away, home, ag, hg, la, lh, qa, qh]];
    const out = {};
    sides.forEach(([t, opp, gf, ga, xgF, xgA, qF, qA]) => {
      const lu = lineup(t, rng), share = clamp(0.5 + 0.35 * (qF - qA), 0.3, 0.7);
      const outfield = lu.filter((s) => s.p.natural !== 'GK');
      const mins = (s) => s.to - s.from;
      // team totals for the match
      const shots = Math.max(gf, Math.round(xgF * 7 + rng() * 5)), sot = Math.max(gf, Math.min(shots, Math.round(shots * 0.38 + rng() * 2)));
      const oppShotsOnTarget = Math.max(ga, Math.min(Math.round(xgA * 7 + rng() * 5), Math.round((xgA * 7 + 2) * 0.4) + ga));
      const passes = Math.round(330 + 300 * share + rng() * 60), passAcc = clamp(0.72 + 0.14 * share + 0.02 * (qF - 6.5), 0.62, 0.92);
      const tackles = Math.round(15 + 8 * (1 - share) + rng() * 5), inter = Math.round(9 + 5 * (1 - share) + rng() * 4), clears = Math.round(12 + 12 * (1 - share) + rng() * 5);
      const fouls = Math.round(9 + rng() * 6), yellows = Math.round(rng() * 2.4), reds = rng() < 0.035 ? 1 : 0;
      const w = (k, s, f) => mins(s) / 90 * W[k][s.p.natural] * Math.exp((att(s.p, f) - 60) / (k === 'shot' ? 36 : 28));
      // the goals and who scored them, and the passes that made them
      const goals = {}, assists = {};
      for (let i = 0; i < gf; i++) {
        const sc = pick(rng, outfield, (s) => w('shot', s, 'finishing'));
        if (!sc) continue; goals[sc.p.id] = (goals[sc.p.id] || 0) + 1;
        if (rng() < 0.68) { const as = pick(rng, outfield.filter((s) => s !== sc), (s) => w('key', s, 'passing')); if (as) assists[as.p.id] = (assists[as.p.id] || 0) + 1; }
      }
      // the rest of the team figures shared among the players on the pitch
      const share1 = (k, f, total, which) => { const list = which || outfield, ws = list.map((s) => w(k, s, f)), tot = ws.reduce((a, b) => a + b, 0) || 1; return list.map((s, i) => total * ws[i] / tot); };
      const shotShare = share1('shot', 'finishing', shots), xgShare = share1('shot', 'finishing', xgF);
      const keyShare = share1('key', 'passing', Math.round(xgF * 5 + rng() * 3)), xaShare = share1('key', 'passing', xgF * 0.7);
      const tkShare = share1('tackle', 'tackling', tackles, lu), icShare = share1('inter', 'tackling', inter, lu), clShare = share1('clear', 'heading', clears, lu);
      const awShare = share1('aerial', 'heading', Math.round(10 + rng() * 6), lu), drShare = share1('drib', 'dribbling', Math.round(9 + 5 * share + rng() * 4), lu);
      const flShare = share1('foul', 'tackling', fouls, lu), psShare = lu.map((s) => mins(s) / 90 * W.pass[s.p.natural] * Math.exp((att(s.p, 'passing') - 60) / 60));
      const psTot = psShare.reduce((a, b) => a + b, 0) || 1;
      const result = gf > ga ? 1 : gf < ga ? -1 : 0;
      const yellowsTo = []; for (let i = 0; i < yellows; i++) { const y = pick(rng, lu, (s) => w('foul', s, 'tackling')); if (y) yellowsTo.push(y.p.id); }
      const redTo = reds ? pick(rng, lu, (s) => w('foul', s, 'tackling')) : null;
      const oi = (s) => outfield.indexOf(s);
      lu.forEach((s, i) => {
        const p = s.p, st = (prior.players[p.id] = prior.players[p.id] || blank()), m = mins(s), gk = p.natural === 'GK';
        st.ap++; if (s.from === 0) st.st++; st.mn += m;
        const g = goals[p.id] || 0, a = assists[p.id] || 0, k = oi(s);
        st.g += g; st.a += a;
        if (k >= 0) {
          const sh = Math.max(g, Math.round(shotShare[k] + (rng() - 0.5) * 0.8)); st.sh += sh; st.sot += Math.min(sh, Math.max(g, Math.round(sh * 0.4 + rng() * 0.6)));
          st.xg += xgShare[k]; st.xa += xaShare[k]; st.kp += Math.max(a, Math.round(keyShare[k] + (rng() - 0.5)));
        }
        const pp = Math.max(1, Math.round(passes * psShare[i] / psTot)); st.ps += pp; st.pok += Math.round(pp * clamp(passAcc + (att(p, 'passing') - 60) / 400 + (rng() - 0.5) * 0.04, 0.5, 0.97));
        const tk = Math.max(0, Math.round(tkShare[i] + (rng() - 0.5))); st.tk += tk; st.tkw += Math.round(tk * clamp(0.58 + (att(p, 'tackling') - 60) / 150 + (rng() - 0.5) * 0.1, 0.3, 0.9));
        st.ic += Math.max(0, Math.round(icShare[i] + (rng() - 0.5))); st.cl += Math.max(0, Math.round(clShare[i] + (rng() - 0.5)));
        const aw = Math.max(0, Math.round(awShare[i] + (rng() - 0.5))); const awWon = Math.round(aw * clamp(0.5 + (att(p, 'heading') - 60) / 120 + (rng() - 0.5) * 0.1, 0.2, 0.85)); st.aw += awWon; st.al += aw - awWon;
        const dr = Math.max(0, Math.round(drShare[i] + (rng() - 0.5))); st.dr += dr; st.drw += Math.round(dr * clamp(0.5 + (att(p, 'dribbling') - 60) / 120 + (rng() - 0.5) * 0.1, 0.2, 0.85));
        st.fl += Math.max(0, Math.round(flShare[i] + (rng() - 0.5) * 0.6));
        if (yellowsTo.indexOf(p.id) >= 0) st.yc++; if (redTo && redTo.p === p) st.rc++;
        if (gk) { st.sv += Math.max(0, oppShotsOnTarget - ga); st.ga += ga; if (ga === 0 && m >= 60) st.cs++; }
        // the match rating: what he did, how the team did, and the ordinary ups and downs
        let rt = 6.1 + 0.3 * result + 0.9 * g + 0.55 * a + 0.04 * (st.tkw ? 1 : 0) * 0 + 0.06 * tk * 0.5 + (gk ? 0.08 * Math.max(0, oppShotsOnTarget - ga) + (ga === 0 ? 0.4 : -0.2 * ga) : (ga === 0 && ['CB', 'FB', 'DM'].indexOf(p.natural) >= 0 ? 0.3 : 0));
        rt += (FM.playerRating(p, p.natural) - qF) * 0.25 + gauss(rng) * 0.4; rt = clamp(rt, 4.2, 9.9);
        const rr = Math.round(rt * 10) / 10; st.rs += rr * (m / 90); st.rt.push(Math.round(rr * 10) + ',' + m);
      });
      out[t.id] = { gf, ga, shots, sot, passes, passOk: Math.round(passes * passAcc), tackles, xg: r1(xgF), poss: Math.round(share * 100) };
    });
    return { hg, ag, st: out };
  }

  // a double round robin of its own (the real fixtures differ from game to game, last season must not), by the circle method
  function roundRobin(ids) {
    const n = ids.length, ring = ids.slice(), out = [];
    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) { const a = ring[i], b = ring[n - 1 - i]; out.push({ round: r, homeId: r % 2 ? b : a, awayId: r % 2 ? a : b }); out.push({ round: r + n - 1, homeId: r % 2 ? a : b, awayId: r % 2 ? b : a }); }
      ring.splice(1, 0, ring.pop());
    }
    return out;
  }
  // Who was in each division last season. The clubs in a division now are the ones that stayed, plus two promoted from the division below and two relegated from
  // the division above, so last season's divisions are those same clubs the other way round: the stayers, plus the two now in the division above (they went up from
  // here) and the two now in the division below (they went down from here). Promoted clubs are the weaker ones in their new division, relegated clubs the stronger ones
  // in theirs, which is also what this season's expectations say.
  function lastSeasonDivisions(league) {
    const divs = FM.allDivisions(league).slice().sort((a, b) => a.level - b.level), n = divs.length;
    const q = (t) => { const r = (t.squad || []).map((p) => FM.playerRating(p, p.natural)).sort((a, b) => b - a).slice(0, 11); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 6; };
    const info = divs.map((d, i) => {
      const by = d.teams.slice().sort((a, b) => q(a) - q(b) || a.id.localeCompare(b.id));
      const promotedIn = i < n - 1 ? by.slice(0, 2) : [], relegatedIn = i > 0 ? by.slice(-2) : [];
      return { d, promotedIn, relegatedIn, stayed: d.teams.filter((t) => promotedIn.indexOf(t) < 0 && relegatedIn.indexOf(t) < 0) };
    });
    return info.map((x, i) => {
      const wentUp = i > 0 ? info[i - 1].promotedIn : [], wentDown = i < n - 1 ? info[i + 1].relegatedIn : [];
      return { level: x.d.level, name: x.d.name, teams: x.stayed.concat(wentUp, wentDown), mustTop: wentUp.map((t) => t.id), mustBottom: wentDown.map((t) => t.id), now: {} };
    });
  }
  // The season, for every division.
  FM.simulatePriorSeason = function (league) {
    const prior = { v: 2, divisions: [], players: {}, season: 0 };
    const rng = FM.mulberry32((league.seed || 1) + 20231);   // the same dice for every game: last season is one fixed history
    const nowLevel = {}; FM.allDivisions(league).forEach((d) => d.teams.forEach((t) => { nowLevel[t.id] = d.level; }));
    lastSeasonDivisions(league).forEach((d) => {
      const play = (bias) => {
        const scratch = { players: {} }, rows = {}; d.teams.forEach((t) => { rows[t.id] = { id: t.id, name: t.name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, xg: 0, sh: 0, sot: 0, ps: 0, pok: 0, poss: 0 }; });
        const results = [];
        roundRobin(d.teams.map((t) => t.id).sort()).forEach((fx) => {
          const h = d.teams.find((t) => t.id === fx.homeId), a = d.teams.find((t) => t.id === fx.awayId); if (!h || !a) return;
          const m = playMatch(league, h, a, rng, scratch, bias);
          [[fx.homeId, m.hg, m.ag], [fx.awayId, m.ag, m.hg]].forEach(([id, gf, ga]) => { const r = rows[id]; r.P++; r.GF += gf; r.GA += ga; if (gf > ga) { r.W++; r.Pts += 3; } else if (gf === ga) { r.D++; r.Pts++; } else r.L++; const s = m.st[id]; r.xg += s.xg; r.sh += s.shots; r.sot += s.sot; r.ps += s.passes; r.pok += s.passOk; r.poss += s.poss; });
          results.push([fx.round, fx.homeId, fx.awayId, m.hg, m.ag]);
        });
        const table = Object.keys(rows).map((k) => rows[k]).sort((x, y) => y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.name.localeCompare(y.name));
        return { table, results, scratch };
      };
      // the clubs that went up must have finished in the top two and the ones that went down in the bottom two: the dice are rolled again, with the clubs' form
      // nudged a little further each time, until the table says so
      const same = (ids, rowsOf) => ids.length === rowsOf.length && ids.every((id) => rowsOf.some((r) => r.id === id));
      let out = null;
      for (let k = 0; k < 400; k++) {
        const b = Math.min(1.4, 0.1 + k * 0.01), bias = {}; d.mustTop.forEach((id) => { bias[id] = b; }); d.mustBottom.forEach((id) => { bias[id] = -b; });
        out = play(bias);
        const t = out.table; if ((!d.mustTop.length || same(d.mustTop, t.slice(0, 2))) && (!d.mustBottom.length || same(d.mustBottom, t.slice(-2)))) break;
      }
      Object.keys(out.scratch.players).forEach((id) => { prior.players[id] = out.scratch.players[id]; });
      out.table.forEach((r, i) => { r.pos = i + 1; r.xg = r1(r.xg); r.poss = r.P ? Math.round(r.poss / r.P) : 50; r.now = nowLevel[r.id]; });   // now: the division the club is in this season
      prior.divisions.push({ level: d.level, name: d.name, table: out.table, results: out.results });
    });
    // tidy the player lines: round the figures that were added in fractions, and keep the rating as an average
    Object.keys(prior.players).forEach((id) => { const s = prior.players[id]; s.xg = r1(s.xg); s.xa = r1(s.xa); s.rs = s.mn ? r2(s.rs / (s.mn / 90)) : 0; });
    league.prior = prior;
    return prior;
  };
  // Last season is the same for every game, so it is played once in advance (prior_data.js) and simply handed over: nobody waits for it. The clubs keep their
  // current names (a league setting from history renames them), and anything missing falls back to playing it out.
  FM.applyBakedPrior = function (league) {
    const D = FM.PRIOR_DATA; if (!D || !D.divisions) return false;
    const prior = JSON.parse(JSON.stringify(D)), names = {}; FM.allTeams(league).forEach((t) => { names[t.id] = t.name; });
    prior.divisions.forEach((d) => d.table.forEach((r) => { if (names[r.id]) r.name = names[r.id]; }));
    league.prior = prior; return true;
  };
  FM.ensurePrior = function (league) { if (!league.prior || league.prior.v !== 2) { if (!FM.applyBakedPrior(league)) FM.simulatePriorSeason(league); } return league.prior; };

  // ---------- reading it ----------
  FM.priorLine = function (league, p) { const pr = FM.ensurePrior(league); return pr.players[p.id] || null; };
  // the figures as rates per 90 minutes
  FM.per90 = function (line) {
    if (!line || !line.mn) return null; const k = 90 / line.mn, pct = (a, b) => (b ? 100 * a / b : 0);
    return { goals: line.g * k, assists: line.a * k, shots: line.sh * k, sot: line.sot * k, xg: line.xg * k, xa: line.xa * k, keyPasses: line.kp * k, passes: line.ps * k, passPct: pct(line.pok, line.ps), tackles: line.tk * k, tackleWin: pct(line.tkw, line.tk), interceptions: line.ic * k, clearances: line.cl * k, aerialsWon: line.aw * k, aerialPct: pct(line.aw, line.aw + line.al), dribbles: line.dr * k, dribblePct: pct(line.drw, line.dr), fouls: line.fl * k, saves: line.sv * k, savePct: pct(line.sv, line.sv + line.ga), conceded: line.ga * k, rating: line.rs };
  };
  FM.priorTable = function (league, level) { const pr = FM.ensurePrior(league); const d = pr.divisions.find((x) => x.level === level); return d ? d.table : []; };
})();
