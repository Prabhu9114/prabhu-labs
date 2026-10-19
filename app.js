const tg = window.Telegram && Telegram.WebApp;
const haptic = (kind, v) => { try { tg && tg.HapticFeedback && tg.HapticFeedback[kind](v); } catch (_) {} };

if (tg) {
  tg.ready(); tg.expand();
  try { tg.setHeaderColor('#07090e'); tg.setBackgroundColor('#07090e'); } catch (_) {}
}

let current = null, lastTrigger = null;

function openDrawer(id, trigger) {
  const el = document.getElementById('drawer-' + id);
  if (!el) return;
  if (current) closeDrawer(true);
  haptic('impactOccurred', 'light');
  lastTrigger = trigger && trigger.matches('.sys-card') ? trigger.querySelector('.card-title-btn') : trigger; current = el;
  el.inert = false;
  el.classList.add('active');
  document.body.classList.add('locked');
  el.querySelector('[data-close]').focus({ preventScroll: true });
  if (tg && tg.BackButton) { tg.BackButton.onClick(onBack); tg.BackButton.show(); }
}

function onBack() { closeDrawer(); }

function closeDrawer(silent) {
  if (!current) return;
  current.classList.remove('active');
  current.inert = true;
  current = null;
  document.body.classList.remove('locked');
  if (tg && tg.BackButton) { tg.BackButton.offClick(onBack); tg.BackButton.hide(); }
  if (!silent && lastTrigger) lastTrigger.focus({ preventScroll: true });
}

document.addEventListener('click', e => {
  const tgLink = e.target.closest('[data-tg]');
  if (tgLink) {
    e.stopPropagation();
    haptic('impactOccurred', 'medium');
    const targetUrl = 'https://t.me/' + tgLink.dataset.tg;
    if (tg && tg.openTelegramLink) {
      e.preventDefault();
      tg.openTelegramLink(targetUrl);
    } else if (tgLink.tagName !== 'A') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  if (e.target.closest('[data-close]') || e.target.classList.contains('drawer-overlay')) return closeDrawer();
  const opener = e.target.closest('[data-open]');
  if (opener) openDrawer(opener.dataset.open, opener);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeDrawer();
  if (e.key === 'Tab' && current) {
    const f = [...current.querySelectorAll('a[href],button:not(:disabled),input,textarea')].filter(n => n.tabIndex >= 0);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- Contact form pointing to prabhu-labs-gateway ---------- */
const GATEWAY_URL = 'https://prabhu-labs-gateway.prabhu-y1211.workers.dev/notify';
const form = document.getElementById('concierge-form');
const submitBtn = document.getElementById('submit-btn');
const receipt = document.getElementById('form-receipt');
const rTitle = document.getElementById('receipt-title');
const rDesc = document.getElementById('receipt-desc');

function showReceipt(ok, title, desc, ticket) {
  receipt.classList.toggle('error', !ok);
  rTitle.textContent = title;
  rDesc.textContent = desc;
  if (ticket) {
    const t = document.createElement('span');
    t.className = 'receipt-ticket';
    t.textContent = String(ticket).slice(0, 40);
    rDesc.append(' ', t);
  }
  receipt.style.display = 'block';
}

if (form) form.addEventListener('submit', async e => {
  e.preventDefault();
  const contact = document.getElementById('contact-input').value.trim();
  const text = document.getElementById('message-input').value.trim();
  if (!contact || !text) return showReceipt(false, 'Missing details', 'Add a contact and a message, then send again.');
  if (document.getElementById('hp').value) return;

  submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
  receipt.style.display = 'none';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, text, initData: (tg && tg.initData) || '' }),
      signal: ctrl.signal
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (res.ok && data && data.success) {
      showReceipt(true, 'Message sent', 'Delivered to Prabhu. Reference:', data.ticket);
      form.reset();
      haptic('notificationOccurred', 'success');
    } else if (res.status === 429) {
      showReceipt(false, 'Too many messages', 'Wait a few minutes and try again.');
      haptic('notificationOccurred', 'error');
    } else {
      showReceipt(false, 'Message not sent', 'The gateway rejected it. Check your details, or message @prabhulabs_bot directly.');
      haptic('notificationOccurred', 'error');
    }
  } catch (err) {
    showReceipt(false, err.name === 'AbortError' ? 'Request timed out' : 'Gateway unavailable', 'Try again, or message @prabhulabs_bot directly.');
    haptic('notificationOccurred', 'error');
  } finally {
    clearTimeout(timer);
    submitBtn.disabled = false; submitBtn.textContent = 'Send message';
  }
});

/* open a drawer from the URL hash, e.g. portfolio.html#omnipost or index.html#contact */
(function () {
  const h = location.hash.slice(1), id = h === 'contact' ? 'desk' : h;
  if (id && document.getElementById('drawer-' + id)) openDrawer(id, null);
})();
