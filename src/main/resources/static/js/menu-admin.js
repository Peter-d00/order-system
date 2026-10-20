const DISH_META = {
  1: '/images/gongbao.webp',
  2: '/images/yuxiang.webp',
  3: '/images/mapo.webp',
  4: '/images/tomatoegg.webp',
  5: '/images/braisedpork.webp',
  6: '/images/hotsoursoup.webp'
};

const STATUS_LABEL = {
  ON_SALE: '在售',
  SOLD_OUT: '售罄',
  OFF_SHELF: '下架'
};

const STATUS_CLASS = {
  ON_SALE: 'on-sale',
  SOLD_OUT: 'sold-out',
  OFF_SHELF: 'off-shelf'
};

const state = { items: [] };
const el = (id) => document.getElementById(id);
const money = (value) => Number(value).toFixed(2);

let toastTimer;
function showToast(message) {
  const toast = el('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2000);
}

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    location.href = '/login.html';
    throw new Error('登录已过期');
  }
  return res;
}

async function loadMenu() {
  try {
    const res = await apiFetch('/api/merchant/menu');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.items = await res.json();
    render();
    el('updatedAt').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (e) {
    showToast('加载失败：' + e.message);
  }
}

function render() {
  const container = el('menuList');
  if (!state.items.length) {
    container.innerHTML = '<p class="muted">暂无菜品</p>';
    return;
  }
  container.innerHTML = state.items.map((item) => {
    const status = STATUS_CLASS[item.status] || 'off-shelf';
    const label = STATUS_LABEL[item.status] || item.status;
    return `
      <article class="menu-row">
        <img src="${DISH_META[item.id] || ''}" alt="${item.name}" loading="lazy">
        <div>
          <div class="name">${item.name}</div>
          <div class="meta">￥${money(item.price)} · ${item.recommendation || ''}</div>
        </div>
        <span class="status-pill ${status}">${label}</span>
        <div class="actions">
          <button class="status-btn ${item.status === 'ON_SALE' ? 'active' : ''}" onclick="setStatus(${item.id}, 'ON_SALE')">在售</button>
          <button class="status-btn ${item.status === 'SOLD_OUT' ? 'active' : ''}" onclick="setStatus(${item.id}, 'SOLD_OUT')">售罄</button>
          <button class="status-btn ${item.status === 'OFF_SHELF' ? 'active' : ''}" onclick="setStatus(${item.id}, 'OFF_SHELF')">下架</button>
        </div>
      </article>`;
  }).join('');
}

async function setStatus(id, status) {
  try {
    const res = await apiFetch(`/api/merchant/menu/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '操作失败');
    state.items = state.items.map((item) => item.id === id ? data : item);
    render();
    showToast(`${data.name} 已设为${STATUS_LABEL[status]}`);
  } catch (e) {
    showToast(e.message);
  }
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
    await loadMenu();
  } catch (e) {
    location.href = '/login.html';
  }
}

document.addEventListener('DOMContentLoaded', initAuth);
