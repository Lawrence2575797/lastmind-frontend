// Plays last season once, for the shared league, and writes prior_data.js. Run from create/football:  node tools/gen_prior.js
// It loads the game's own scripts (in the order index.html does, up to main.js) in a bare context, builds the league with no user choices,
// and runs FM.simulatePriorSeason, which is deterministic. Run it again whenever the squads, ratings or prior.js change.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="\/create\/football\/([a-z_0-9]+\.js)/g)].map((m) => m[1]);
const stop = files.indexOf('main.js') - 1;   // everything but the page itself, so the league is built exactly as it is in the browser
const noop = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], setAttribute() {} });
const win = { addEventListener() {}, location: { href: '', search: '', origin: '' }, localStorage: { getItem: () => null, setItem() {} }, navigator: {}, performance };
const ctx = vm.createContext(Object.assign(win, { window: win, document: Object.assign(noop(), { getElementById: () => null, createElement: noop, head: noop(), body: noop(), documentElement: noop() }), console, Math, JSON, Date, setTimeout, clearTimeout, fetch: () => Promise.reject(new Error('no network')), requestAnimationFrame: () => 0, localStorage: win.localStorage, navigator: {} }));
files.slice(0, stop + 1).forEach((f) => {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); } catch (e) { console.error('! ' + f + ': ' + e.message); }
});
const FM = ctx.window.FM;
const league = FM.createLeague({ userIndex: 0, tier: 'alevel', runSeed: 0 });
const t0 = Date.now(); const prior = FM.simulatePriorSeason(league);
// the figures as they are shipped: names are put back from the current clubs when a game starts, so only what the tables and profiles read is kept
const out = 'window.FM = window.FM || {};\nFM.PRIOR_DATA = ' + JSON.stringify(prior) + ';\n';
fs.writeFileSync(path.join(root, 'prior_data.js'), out);
console.log('prior season played in ' + (Date.now() - t0) + ' ms; ' + Object.keys(prior.players).length + ' players; ' + (out.length / 1024).toFixed(0) + ' KB');
