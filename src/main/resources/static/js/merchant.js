const STATUS_LABEL = {
  PENDING: '待接单',
  PREPARING: '制作中',
  DONE: '已完成'
};

const state = {
  orders: [],
  filter: 'ALL',
  loading: false,
  initialized: false,
  knownOrderIds: new Set(),
  soundEnabled: true
};

const el = (id) => document.getElementById(id);
const money = (value) => Number(value).toFixed(2);

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    location.href = '/login.html';
    throw new Error('登录已过期');
  }
  return res;
}

let toastTimer;
function showToast(message) {
  const toast = el('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2000);
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

async function loadOrders() {
  if (state.loading) return;
  state.loading = true;
  try {
    const res = await apiFetch('/api/orders');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.orders = await res.json();
    detectNewOrders(state.orders);
    render();
    el('updatedAt').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (e) {
    showToast('加载失败：' + e.message);
  } finally {
    state.loading = false;
  }
}

function sortOrders(orders) {
  const rank = { PENDING: 0, PREPARING: 1, DONE: 2 };
  return [...orders].sort((a, b) => {
    const rankDiff = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return a.status === 'DONE' ? timeB - timeA : timeA - timeB;
  });
}

function waitMinutes(order) {
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function waitText(order) {
  if (order.status === 'DONE') return '已完成';
  return `已等待 ${waitMinutes(order)} 分钟`;
}

function render() {
  const counts = { PENDING: 0, PREPARING: 0, DONE: 0 };
  for (const order of state.orders) {
    if (counts[order.status] != null) counts[order.status] += 1;
  }
  el('countPending').textContent = counts.PENDING;
  el('countPreparing').textContent = counts.PREPARING;
  el('countDone').textContent = counts.DONE;

  const sorted = sortOrders(state.orders);
  const list = state.filter === 'ALL'
    ? sorted
    : sorted.filter((order) => order.status === state.filter);

  const container = el('orders');
  if (!list.length) {
    const empty = '<div class="empty">暂时没有订单</div>';
    if (container.innerHTML !== empty) container.innerHTML = empty;
    return;
  }
  const html = list.map(orderCard).join('');
  if (container.innerHTML !== html) container.innerHTML = html;
}

function orderCard(order) {
  const statusClass = 'status-' + String(order.status).toLowerCase();
  const overdue = order.status !== 'DONE' && waitMinutes(order) >= 10;
  const items = (order.items || []).map((item) => `
    <div class="item-row">
      <span>${item.name}${item.spiceLevel ? `（${item.spiceLevel}）` : ''} × ${item.quantity}</span>
      <span>￥${money(Number(item.price) * item.quantity)}</span>
    </div>`).join('');

  let action = '<span class="done-label">已完成</span>';
  if (order.status === 'PENDING') {
    action = `<button class="action" onclick="advance(${order.id}, 'PREPARING')">接单</button>`;
  } else if (order.status === 'PREPARING') {
    action = `<button class="action" onclick="advance(${order.id}, 'DONE')">完成出餐</button>`;
  }

  return `
    <article class="order-card ${statusClass} ${overdue ? 'overdue' : ''}">
      <header class="order-head">
        <div>
          <span class="order-id">#${order.id}</span>
          <span class="table">桌号 ${order.tableNo}</span>
        </div>
        <span class="status-badge">${STATUS_LABEL[order.status] || order.status}</span>
      </header>
      <div class="order-items">${items}</div>
      <footer class="order-foot">
        <span class="time ${overdue ? 'overdue' : ''}">${formatTime(order.createdAt)} · ${waitText(order)}</span>
        <b class="total">￥${money(order.totalPrice)}</b>
        ${action}
      </footer>
    </article>`;
}

async function advance(id, status) {
  try {
    const res = await apiFetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '操作失败');
    showToast(status === 'PREPARING' ? '已接单' : '已完成出餐');
    await loadOrders();
  } catch (e) {
    showToast(e.message);
  }
}

function detectNewOrders(orders) {
  const pending = orders.filter((order) => order.status === 'PENDING');
  if (!state.initialized) {
    orders.forEach((order) => state.knownOrderIds.add(order.id));
    state.initialized = true;
    return;
  }
  const fresh = pending.filter((order) => !state.knownOrderIds.has(order.id));
  orders.forEach((order) => state.knownOrderIds.add(order.id));
  if (!fresh.length) return;
  el('newOrderCount').textContent = fresh.length;
  el('newOrderBanner').classList.remove('hidden');
  playAlert();
  flashTitle();
}

function focusPending() {
  state.filter = 'PENDING';
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.status === 'PENDING');
  });
  el('newOrderBanner').classList.add('hidden');
  render();
}

let audioContext;
function playAlert() {
  if (!state.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext = audioContext || new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    // Audio is best-effort; the visual banner still works.
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  el('soundBtn').textContent = state.soundEnabled ? '提示音：开' : '提示音：关';
  el('soundBtn').classList.toggle('on', state.soundEnabled);
  if (state.soundEnabled) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = audioContext || new AudioContextClass();
      audioContext.resume();
    } catch (e) {}
  }
  showToast(state.soundEnabled ? '提示音已开启' : '提示音已关闭');
}

let titleTimer;
function flashTitle() {
  document.title = '【新订单】商家订单 · 小饭馆';
  clearTimeout(titleTimer);
  titleTimer = setTimeout(() => {
    document.title = '商家订单 · 小饭馆';
  }, 10000);
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    location.href = '/login.html';
  }
}

async function initAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.authenticated) {
      location.href = '/login.html';
      return;
    }
    el('merchantUser').textContent = data.username || '商家';
    await loadOrders();
    setInterval(() => {
      if (!document.hidden) loadOrders();
    }, 5000);
  } catch (e) {
    location.href = '/login.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      state.filter = tab.dataset.status;
      render();
    });
  });

  el('soundBtn').classList.add('on');
  document.addEventListener('click', () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = audioContext || new AudioContextClass();
      if (audioContext.state === 'suspended') audioContext.resume();
    } catch (e) {}
  }, { once: true });

  initAuth();
});
