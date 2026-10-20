const STATUS_SEQUENCE = ['PENDING', 'PREPARING', 'DONE'];
const STATUS_LABEL = {
  PENDING: '待接单',
  PREPARING: '制作中',
  DONE: '已完成'
};
const STATUS_HINT = {
  PENDING: '订单已提交，等待商家接单',
  PREPARING: '商家已接单，正在为你制作',
  DONE: '已出餐，祝用餐愉快'
};
const DISH_META = {
  1: '/images/gongbao.webp',
  2: '/images/yuxiang.webp',
  3: '/images/mapo.webp',
  4: '/images/tomatoegg.webp',
  5: '/images/braisedpork.webp',
  6: '/images/hotsoursoup.webp'
};

const state = {
  id: null,
  order: null,
  lastStatus: null
};

const el = (id) => document.getElementById(id);
const money = (value) => Number(value).toFixed(2);

let toastTimer;
function showToast(message) {
  const toast = el('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

async function loadOrder() {
  if (!state.id) return;
  try {
    const res = await fetch(`/api/orders/${state.id}`);
    if (res.status === 404) {
      showLookup('订单不存在，请确认订单号');
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    render(data);
    if (state.lastStatus && state.lastStatus !== data.status) {
      showToast('订单状态更新：' + STATUS_LABEL[data.status]);
    }
    state.lastStatus = data.status;
  } catch (e) {
    showToast('刷新失败：' + e.message);
  }
}

function render(order) {
  state.order = order;
  el('lookup').classList.add('hidden');
  el('orderView').classList.remove('hidden');
  el('orderTitle').textContent = '#' + order.id;
  el('tableNo').textContent = order.tableNo;
  el('createdAt').textContent = formatTime(order.createdAt);
  el('total').textContent = '￥' + money(order.totalPrice);

  const badge = el('statusBadge');
  badge.textContent = STATUS_LABEL[order.status] || order.status;
  badge.className = 'status-badge ' + String(order.status).toLowerCase();
  el('statusHint').textContent = STATUS_HINT[order.status] || '';

  const current = STATUS_SEQUENCE.indexOf(order.status);
  el('timeline').innerHTML = STATUS_SEQUENCE.map((status, index) => {
    const stateClass = index < current ? 'done' : index === current ? 'current' : '';
    return `
      <div class="step ${stateClass}">
        <span class="step-dot">${index < current ? '✓' : index + 1}</span>
        <span class="step-label">${STATUS_LABEL[status]}</span>
      </div>`;
  }).join('');

  el('items').innerHTML = (order.items || []).map((item) => `
    <div class="item">
      <img src="${DISH_META[item.menuId] || ''}" alt="${item.name}" loading="lazy">
      <div>
        <div class="name">${item.name}</div>
        <div class="meta">${item.spiceLevel ? '辣度：' + item.spiceLevel + ' · ' : ''}× ${item.quantity}</div>
      </div>
      <span class="line-total">￥${money(Number(item.price) * item.quantity)}</span>
    </div>`).join('');
}

function showLookup(message) {
  el('orderView').classList.add('hidden');
  el('lookup').classList.remove('hidden');
  if (message) showToast(message);
}

function lookup() {
  const value = el('orderIdInput').value.trim();
  if (!value) {
    showToast('请输入订单号');
    return;
  }
  location.href = '/order.html?id=' + encodeURIComponent(value);
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    showLookup();
  } else {
    state.id = id;
    loadOrder();
    setInterval(() => {
      if (!document.hidden) loadOrder();
    }, 5000);
  }

  el('orderIdInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') lookup();
  });
});
