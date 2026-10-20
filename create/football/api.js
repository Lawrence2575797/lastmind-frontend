// Talking to the LastMind backend from the football page. The sign-in is the same one the rest of LastMind uses (it is kept in this browser by Supabase),
// so a manager who is signed in elsewhere is signed in here. Used only to turn a typed instruction into rules: see instructions_ui.js.
(function () {
  const FM = (window.FM = window.FM || {});
  const BACKEND = 'https://lastmind-compile-backend.onrender.com';
  const BILLING_BACKEND = 'https://lastmind-stripe-backend.onrender.com';
  const SUPABASE_URL = 'https://evgdecewwmkupiadgfop.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Bb-f61P1zqy_xW63D26nUw_VTOVXaub';   // the public (publishable) key, the same one every LastMind page carries
  let client = null;
  // When the server says the Locks are used up, the game remembers it for ten minutes and stops making the automatic AI requests (the analysis after a game, the
  // opposition manager's plans) instead of asking again and again. "Check again" on the analysis clears it.
  FM.locksOut = () => !!FM.locksOutAt && Date.now() - FM.locksOutAt < 10 * 60 * 1000;
  FM.locksReset = () => { FM.locksOutAt = 0; };
  FM.api = async function (path, body) {
    if (!window.supabase || !window.supabase.createClient) throw new Error('The sign-in could not load. Check your connection and try again.');
    if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await client.auth.getSession();
    if (!data || !data.session || data.session.user && data.session.user.is_anonymous) { const e = new Error('Sign in to LastMind to write instructions in your own words. You can still build one with the options.'); e.code = 'NO_SESSION'; throw e; }
    let resp;
    try { resp = await fetch(BACKEND + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token }, body: JSON.stringify(body) }); }
    catch (err) { throw new Error('LastMind could not be reached. Check your connection, or build the instruction with the options.'); }
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) { const e = new Error(json.detail || json.error || 'LastMind could not read that just now. Try again, or build it with the options.'); e.code = json.code || String(resp.status); if (e.code === 'LOCK_LIMIT_REACHED') FM.locksOutAt = Date.now(); throw e; }
    return json;
  };
  // Any method, for saving the game to the account: resolves { ok, status, json, uid }, or null when nobody is signed in or the server is unreachable.
  FM.apiCall = async function (method, path, body) {
    try {
      if (!window.supabase || !window.supabase.createClient) return null;
      if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await client.auth.getSession();
      if (!data || !data.session || data.session.user && data.session.user.is_anonymous) return null;
      const uid = data.session.user && data.session.user.id;
      let resp;
      try { resp = await fetch(BACKEND + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token }, body: body ? JSON.stringify(body) : undefined }); }
      catch (err) { return { ok: false, status: 0, json: {}, uid, netError: true }; }   // signed in, but the server could not be reached
      const json = await resp.json().catch(() => ({}));
      if (resp.status === 402 && json && json.code === 'LOCK_LIMIT_REACHED') FM.locksOutAt = Date.now();
      return { ok: resp.ok, status: resp.status, json, uid };
    } catch (e) { return null; }
  };
  // The football manager is free for a limited time (the backend's FOOTBALL_FREE switch). While this is true the purchase button just takes the person into the game;
  // the checkout code below is untouched. Set it to false, with FOOTBALL_FREE=false on the backend, to bring the paywall back.
  FM.FREE_FOR_NOW = true;
  FM.purchaseFootball = async function () {
    if (!window.supabase || !window.supabase.createClient) throw new Error('The sign-in could not load. Check your connection and try again.');
    if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await client.auth.getSession();
    if (!data || !data.session || data.session.user && data.session.user.is_anonymous) { location.href = '/account/?mode=signup&returnTo=' + encodeURIComponent('/learn/?needs=football'); return; }
    if (FM.FREE_FOR_NOW) { location.href = '/create/football/?new=1'; return; }
    const resp = await fetch(BILLING_BACKEND + '/checkout/project', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token }, body: JSON.stringify({ project: 'football' }) });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.url) { location.href = json.url; return; }
    if (resp.ok && json.alreadySubscribed) { location.href = '/create/football/?new=1'; return; }
    throw new Error(json.error || 'Could not open the secure checkout. Try again in a moment.');
  };
})();
