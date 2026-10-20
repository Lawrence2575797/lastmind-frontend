// "Recover an earlier season": finds every season this device and the account still hold, shows what each is, and lets the manager bring one back.
// Looking deletes nothing. Bringing one back keeps what is there now as an archive first, and the account's own copy is backed up by the server.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = (iso) => { try { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const sizeText = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1000) + ' KB');

  FM.recoveryPanel = function (host) {
    host.innerHTML = `<div class="card rec-card"><div class="eyebrow">Lost a season?</div><h2>Recover an earlier season</h2><p class="desc">Looks for every season saved on this device and on your account, including the ones a new game replaced. Looking changes nothing. Bringing one back keeps your current game as a backup first.</p><div class="row"><button type="button" class="primary" id="recFind">Look for saved seasons</button></div><div id="recOut"></div></div>`;
    const out = host.querySelector('#recOut'), find = host.querySelector('#recFind');
    find.addEventListener('click', async () => {
      find.disabled = true; out.innerHTML = '<p class="note">Looking…</p>';
      let res; try { res = await FM.listSavedSeasons(); } catch (e) { out.innerHTML = '<p class="note">Could not look just now. Try again in a moment.</p>'; find.disabled = false; return; }
      find.disabled = false;
      const rowHtml = (e, i) => {
        const where = e.source === 'device' ? (e.current ? 'this account\'s save on this device' : e.archive ? 'kept on this device when a new game replaced it' : 'saved on this device (under another account or an older version of the game)') : (e.backup ? 'the account\'s backup of a season that was replaced' : 'the account\'s saved game');
        const when2 = e.source === 'account' ? when(e.updatedAt) : e.at ? when(Number(e.at)) : '';
        const label = e.source === 'device' ? e.club : (String(e.title || '').replace(/^Backup: /, '').replace(/^Be the manager: /, '') || 'Your club');
        const season = e.season, played = e.played, status = played >= 14 ? 'season complete' : played + ' of 14 played';
        return `<tr><td class="l"><b>${esc(label)}</b>${e.skin ? ' <small>(' + esc(e.skin) + ')</small>' : ''}<br><small>${esc(where)}${when2 ? ' · ' + esc(when2) : ''}${e.bytes ? ' · ' + esc(sizeText(e.bytes)) : ''}</small></td><td class="n">Season ${season}<br><small>${esc(status)}</small></td><td class="n">${e.current ? '<small>in use now</small>' : `<button type="button" data-restore="${e.source}:${i}">Bring this one back</button>`}</td></tr>`;
      };
      const all = res.device.map((e) => e).concat(res.account || []);
      if (!all.length) { out.innerHTML = '<p class="note">No saved seasons were found on this device' + (res.signedIn ? ' or on this account.' : ', and you are not signed in, so the account could not be checked.') + (res.signedIn ? ' If the season was on another LastMind account, sign in to that account and look again.' : '') + '</p>'; return; }
      out.innerHTML = `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Saved season</th><th>How far</th><th></th></tr></thead><tbody>${res.device.map((e, i) => rowHtml(e, 'd' + i)).join('')}${(res.account || []).map((e, i) => rowHtml(e, 'a' + i)).join('')}</tbody></table></div>${res.account ? '' : '<p class="note">The account could not be checked just now (or you are not signed in), so only what is on this device is listed.</p>'}<p class="note" id="recMsg" role="status"></p>`;
      out.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', async () => {
        const [src, idx] = [b.dataset.restore.split(':')[0], b.dataset.restore.split(':')[1]], entry = idx[0] === 'd' ? res.device[Number(idx.slice(1))] : res.account[Number(idx.slice(1))];
        const cur = res.device.find((e) => e.current);
        if (!window.confirm('Bring back ' + (entry.club || entry.title || 'this season') + ', season ' + entry.season + ' (' + entry.played + ' of 14 played)?' + (cur ? ' Your current game (season ' + cur.season + ', ' + cur.played + ' played) will be kept as a backup you can bring back the same way.' : '') + (entry.otherAccount ? ' This season was saved under a different account on this device; it will be copied into the account you are signed in to now.' : ''))) return;
        const msg = out.querySelector('#recMsg'); out.querySelectorAll('button').forEach((x) => { x.disabled = true; }); msg.textContent = 'Bringing it back…';
        const r = await FM.restoreSavedSeason(entry);
        if (!r.ok) { msg.textContent = r.error || 'That could not be brought back.'; out.querySelectorAll('button').forEach((x) => { x.disabled = false; }); return; }
        msg.textContent = r.account ? 'Done. It is saved on this device and on your account. Opening it now…' : 'Done on this device. The account copy could not be updated just now; it will be updated the next time the game saves with a connection. Opening it now…';
        setTimeout(() => { location.href = '/create/football/'; }, 1200);
        void src;
      }));
    });
  };
})();
