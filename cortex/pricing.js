(() => {
const PRICING_API = 'https://lastmind-stripe-backend.onrender.com';
const LOCKS_API = 'https://lastmind-compile-backend.onrender.com';
async function getAuthToken() {
  const client = window.supabaseClient;
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || null;
}
// Tokens always come from the current session, never a stale shared storage key.
function setAuthToken() {}
function showLoginRequired() { window.location.href = '/'; }
async function fetchLockBalance() {
  const token = await getAuthToken();
  if (!token) return null;
  const res = await fetch(`${LOCKS_API}/locks/balance`, {headers:{Authorization:`Bearer ${token}`}});
  if (!res.ok) return null;
  return res.json();
}
// Create upgrade checkout session
async function createUpgradeSession(tier) {
  const token = await getAuthToken();
  if (!token) {
    showLoginRequired();
    return;
  }

  try {
    const res = await fetch(`${PRICING_API}/checkout/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = `Server error: ${res.status} ${res.statusText}`;
      try { message = JSON.parse(text).error || message; } catch {}
      throw new Error(message);
    }
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error('Checkout error:', err);
    alert(err.message);
  }
}

// Create extra locks checkout session
async function createExtraLocksSession(amountUsd) {
  const token = await getAuthToken();
  if (!token) {
    showLoginRequired();
    return;
  }

  try {
    const res = await fetch(`${PRICING_API}/checkout/extra-locks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amountUsd: Math.round(amountUsd) }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = `Server error: ${res.status} ${res.statusText}`;
      try { message = JSON.parse(text).error || message; } catch {}
      throw new Error(message);
    }
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error('Extra locks checkout error:', err);
    alert(err.message);
  }
}

// Show upgrade modal
function showUpgradeModal() {
  if (document.querySelector('.upgrade-overlay')) return;
  const modal = createUpgradeModalHTML();
  document.body.appendChild(modal);

  // Close on overlay click (modal is the overlay div itself)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on X button
  modal.querySelector('.upgrade-close').addEventListener('click', () => {
    modal.remove();
  });

  // Upgrade buttons
  modal.querySelector('[data-tier="light"]').addEventListener('click', () => {
    createUpgradeSession('light');
  });

  modal.querySelector('[data-tier="max"]').addEventListener('click', () => {
    createUpgradeSession('max');
  });
}

// Show extra locks purchase modal (Max tier only)
function showExtraLocksModal() {
  if (document.querySelector('.locks-overlay')) return;
  const modal = createExtraLocksModalHTML();
  document.body.appendChild(modal);

  const input = modal.querySelector('#locks-amount');
  const display = modal.querySelector('.locks-display');

  // Update display when amount changes
  input.addEventListener('input', (e) => {
    const amount = Math.max(1, Math.min(10, parseInt(e.target.value) || 0));
    e.target.value = amount;
    display.textContent = `${amount} \u00d7 4,500 = ${(amount * 4_500).toLocaleString()} locks`;
  });

  // Close on overlay click (modal is the overlay div itself)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on X button
  modal.querySelector('.locks-close').addEventListener('click', () => {
    modal.remove();
  });

  // Purchase button
  modal.querySelector('.locks-purchase-btn').addEventListener('click', () => {
    const amount = parseInt(input.value);
    createExtraLocksSession(amount);
  });
}

// Create upgrade modal HTML
function createUpgradeModalHTML() {
  const div = document.createElement('div');
  div.className = 'upgrade-overlay';
  div.innerHTML = `
    <div class="upgrade-modal">
      <button class="upgrade-close" aria-label="Close">&times;</button>
      <h2>Upgrade LastMind</h2>

      <div class="upgrade-plans">
        <div class="upgrade-plan">
          <h3>Lastmind Light</h3>
          <div class="price">&pound;1.99<span>/month</span></div>
          <div class="feature">6&times; more locks than Free</div>
          <div class="locks-amount">15,000 locks</div>
          <button data-tier="light" class="upgrade-btn">Upgrade to Light</button>
        </div>

        <div class="upgrade-plan featured">
          <div class="badge">Most Popular</div>
          <h3>Lastmind Max</h3>
          <div class="price">&pound;4.99<span>/month</span></div>
          <div class="feature">2&times; more locks than Light</div>
          <div class="locks-amount">30,000 locks</div>
          <button data-tier="max" class="upgrade-btn featured-btn">Upgrade to Max</button>
          <div class="bonus">+ Buy extra locks anytime</div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .upgrade-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .upgrade-modal {
      background: var(--panel, #25151b);
      border: 1px solid rgba(230, 215, 176, 0.15);
      border-radius: 12px;
      padding: 40px;
      max-width: 700px;
      width: 100%;
      position: relative;
    }

    .upgrade-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: var(--text);
      font-size: 24px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .upgrade-close:hover {
      opacity: 1;
    }

    .upgrade-modal h2 {
      color: var(--text);
      margin-bottom: 32px;
      text-align: center;
      font-size: 24px;
    }

    .upgrade-plans {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 640px) {
      .upgrade-plans {
        grid-template-columns: 1fr;
      }
    }

    .upgrade-plan {
      background: rgba(230, 215, 176, 0.05);
      border: 1px solid rgba(230, 215, 176, 0.1);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      position: relative;
    }

    .upgrade-plan.featured {
      background: rgba(230, 215, 176, 0.1);
      border-color: rgba(230, 215, 176, 0.2);
      transform: scale(1.05);
    }

    .badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: var(--bg);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .upgrade-plan h3 {
      font-size: 20px;
      margin-bottom: 12px;
      color: var(--text);
    }

    .upgrade-plan .price {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 8px;
    }

    .upgrade-plan .price span {
      font-size: 14px;
      opacity: 0.7;
    }

    .upgrade-plan .feature {
      font-size: 14px;
      color: var(--text);
      opacity: 0.7;
      margin-bottom: 12px;
    }

    .upgrade-plan .locks-amount {
      font-size: 16px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 20px;
      padding: 12px;
      background: rgba(230, 215, 176, 0.1);
      border-radius: 4px;
    }

    .upgrade-btn {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--accent);
      color: var(--accent);
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .upgrade-btn:hover {
      background: var(--accent);
      color: var(--bg);
    }

    .upgrade-btn.featured-btn {
      background: var(--accent);
      color: var(--bg);
      border-color: var(--accent);
    }

    .upgrade-btn.featured-btn:hover {
      opacity: 0.9;
    }

    .upgrade-plan .bonus {
      font-size: 12px;
      color: var(--text);
      opacity: 0.6;
      margin-top: 12px;
    }
  `;
  document.head.appendChild(style);

  return div;
}

// Create extra locks modal HTML
function createExtraLocksModalHTML() {
  const div = document.createElement('div');
  div.className = 'locks-overlay';
  div.innerHTML = `
    <div class="locks-modal">
      <button class="locks-close" aria-label="Close">&times;</button>
      <h2>Buy Extra Locks</h2>
      <p>Extra Locks expire at the next calendar-month reset.</p>

      <div class="locks-form">
        <label>Amount (USD)</label>
        <input
          type="number"
          id="locks-amount"
          min="1"
          max="10"
          value="5"
          class="locks-input"
        />

        <div class="locks-breakdown">
          <span>You'll receive:</span>
          <span class="locks-display">5 &#215; 4,500 = 22,500 locks</span>
        </div>

        <button class="locks-purchase-btn">Purchase Locks</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .locks-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .locks-modal {
      background: var(--panel, #25151b);
      border: 1px solid rgba(230, 215, 176, 0.15);
      border-radius: 12px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      position: relative;
    }

    .locks-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: var(--text);
      font-size: 24px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .locks-close:hover {
      opacity: 1;
    }

    .locks-modal h2 {
      color: var(--text);
      margin-bottom: 24px;
      font-size: 24px;
    }

    .locks-form label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.6;
      margin-bottom: 8px;
    }

    .locks-input {
      width: 100%;
      padding: 12px;
      background: rgba(230, 215, 176, 0.05);
      border: 1px solid rgba(230, 215, 176, 0.1);
      border-radius: 4px;
      color: var(--text);
      font-size: 16px;
      margin-bottom: 20px;
    }

    .locks-input:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(230, 215, 176, 0.1);
    }

    .locks-breakdown {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(230, 215, 176, 0.05);
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .locks-display {
      font-weight: 600;
      color: var(--accent);
    }

    .locks-purchase-btn {
      width: 100%;
      padding: 12px;
      background: var(--accent);
      color: var(--bg);
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .locks-purchase-btn:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);

  return div;
}

// Keep the existing app balance chip and usage bar in sync.
let confirmation = null;
async function confirmReturn() {
  const sessionId = new URLSearchParams(location.search).get('billing_session');
  if (!sessionId) return;
  const token = await getAuthToken();
  if (!token) return;
  const res = await fetch(`${PRICING_API}/checkout/confirm`, {method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sessionId})});
  if (!res.ok) throw new Error('Payment confirmation is pending. Please refresh shortly.');
  const result = await res.json();
  if (result.paid) { const url = new URL(location.href); url.searchParams.delete('billing_session'); history.replaceState(null,'',url); }
}
async function displayLockBalance() {
  if (!await getAuthToken()) return;
  try {
    if (!confirmation) confirmation = confirmReturn().catch(err => { console.warn(err.message); confirmation=null; });
    await confirmation;
    const balance = await fetchLockBalance();
    if (!balance) return;
    const chip = document.getElementById('locksBalanceAmount');
    if (chip) chip.textContent = balance.balance.toLocaleString();
    const upgrade = document.getElementById('upgradeTopbarBtn');
    if (upgrade) { upgrade.style.display = balance.tier==='max'?'none':''; upgrade.onclick=showUpgradeModal; }
    const extra = document.getElementById('buyMoreTokensBtn');
    if (extra) { extra.style.display=balance.tier==='max'?'':'none'; extra.textContent='Buy Extra Locks'; }
  } catch(err) { console.warn('Could not refresh pricing:',err.message); }
}
async function openPurchaseOptions() {
  try { const balance = await fetchLockBalance();
    if (balance?.tier === 'max') showExtraLocksModal(); else showUpgradeModal();
  } catch { showUpgradeModal(); }
}
function initPricing() { displayLockBalance(); }
window.LastMindPricing = {showUpgradeModal,showExtraLocksModal,fetchLockBalance,
  displayLockBalance,createUpgradeSession,createExtraLocksSession,initPricing,setAuthToken,openPurchaseOptions};
})();
