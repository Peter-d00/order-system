const DISH_META = {
  1: { image: '/images/gongbao.webp', tag: '川味' },
  2: { image: '/images/yuxiang.webp', tag: '川味' },
  3: { image: '/images/mapo.webp', tag: '川味' },
  4: { image: '/images/tomatoegg.webp', tag: '家常' },
  5: { image: '/images/braisedpork.webp', tag: '招牌' },
  6: { image: '/images/hotsoursoup.webp', tag: '汤品' }
};

const state = {
  menu: new Map(),
  cart: new Map(),
  spiceChoices: new Map(),
  pendingDishId: null,
  pendingSpice: null,
  lastOrderId: null,
  tableNo: 'A01',
  submitting: false
};

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

async function loadMenu() {
  const list = el('list');
  list.innerHTML = '<div class="loading-card"></div><div class="loading-card"></div>';
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const items = await res.json();
    state.menu = new Map(items.map((item) => [item.id, item]));
    items.forEach((item) => {
      if (item.canChooseSpicy && item.spicyOptions?.length) {
        state.spiceChoices.set(item.id, item.spicyOptions.includes('微辣') ? '微辣' : item.spicyOptions[0]);
      }
    });
    renderMenu(items);
    el('menuCount').textContent = items.length + ' 道菜';
  } catch (e) {
    list.innerHTML = '<p class="muted">菜单加载失败，请确认服务已启动</p>';
    el('menuCount').textContent = '';
  }
}

function renderMenu(items) {
  el('list').innerHTML = items.map((dish) => {
    const meta = DISH_META[dish.id] || { image: '', tag: '推荐' };
    const soldOut = dish.status === 'SOLD_OUT';
    return `
      <article class="dish-card ${soldOut ? 'sold-out' : ''}" data-id="${dish.id}">
        <div class="dish-media">
          ${meta.image ? `<img src="${meta.image}" alt="${dish.name}" loading="lazy" decoding="async">` : ''}
          <span class="dish-tag ${soldOut ? 'soldout' : ''}">${soldOut ? '售罄' : meta.tag}</span>
        </div>
        <div class="dish-body">
          <div class="dish-title-row">
            <h3>${dish.name}</h3>
            <span class="price">￥${money(dish.price)}</span>
          </div>
          <p class="dish-desc">${dish.desc || ''}</p>
          ${dish.recommendation ? `<p class="dish-rec"><span>适合</span>${dish.recommendation}</p>` : ''}
          ${dish.notes ? `<p class="dish-note"><span>注意</span>${dish.notes}</p>` : ''}
          ${dish.canChooseSpicy ? '' : `<div class="spice-row"><span class="spice-locked">不可选择辣度</span></div>`}
          <div class="dish-actions">
            <span class="dish-qty" data-qty>${qtyText(dish.id)}</span>
            ${soldOut
              ? '<button class="add-btn" disabled>已售罄</button>'
              : `<button class="add-btn" onclick="addToCart(${dish.id})">${dish.canChooseSpicy ? '选辣度加入' : '加入订单'} <span>＋</span></button>`}
          </div>
        </div>
      </article>`;
  }).join('');
}

function qtyText(id) {
  let qty = 0;
  for (const entry of state.cart.values()) {
    if (entry.item.id === id) qty += entry.quantity;
  }
  return qty > 0 ? `已选 ${qty} 份` : '还未选择';
}

function updateDish(id) {
  const card = document.querySelector(`.dish-card[data-id="${id}"]`);
  if (!card) return;
  const qtyEl = card.querySelector('[data-qty]');
  if (qtyEl) qtyEl.textContent = qtyText(id);
}

function addToCart(id) {
  const item = state.menu.get(id);
  if (!item) return;
  if (item.status !== 'ON_SALE') {
    showToast('该菜品已售罄');
    return;
  }
  if (item.canChooseSpicy) {
    openSpicePicker(item);
    return;
  }
  addEntry(item, null);
}

function addEntry(item, spice) {
  const key = `${item.id}|${spice || ''}`;
  const entry = state.cart.get(key) || { item, quantity: 0, spice };
  entry.quantity += 1;
  state.cart.set(key, entry);
  updateDish(item.id);
  renderCart();
  bumpBadge();
}

function bumpBadge() {
  const badge = el('cartBadge');
  badge.classList.remove('bump');
  void badge.offsetWidth;
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 220);
}

function openSpicePicker(item) {
  state.pendingDishId = item.id;
  state.pendingSpice = state.spiceChoices.get(item.id) || item.spicyOptions?.[0] || null;
  el('spiceDishName').textContent = item.name;
  el('spiceDishDesc').textContent = item.desc || '';
  el('spiceDishPrice').textContent = '￥' + money(item.price);
  el('spiceDishImg').src = DISH_META[item.id]?.image || '';
  el('spiceDishImg').alt = item.name;
  el('spiceOptions').innerHTML = (item.spicyOptions || []).map((level) => `
    <button class="spice-option ${level === state.pendingSpice ? 'active' : ''}" onclick="selectPendingSpice('${level}')">${level}</button>
  `).join('');
  el('cartPanel').classList.add('hidden');
  el('successPanel').classList.add('hidden');
  el('spicePanel').classList.remove('hidden');
  el('overlay').classList.add('is-open');
}

function selectPendingSpice(level) {
  state.pendingSpice = level;
  el('spiceOptions').querySelectorAll('.spice-option').forEach((button) => {
    button.classList.toggle('active', button.textContent === level);
  });
}

function confirmSpiceAdd() {
  const item = state.menu.get(state.pendingDishId);
  if (!item || !state.pendingSpice) return;
  state.spiceChoices.set(item.id, state.pendingSpice);
  addEntry(item, state.pendingSpice);
  showToast(`已加入 ${item.name}（${state.pendingSpice}）`);
  closePanels();
}

function changeQty(key, delta) {
  const entry = state.cart.get(key);
  if (!entry) return;
  entry.quantity += delta;
  if (entry.quantity <= 0) state.cart.delete(key);
  updateDish(entry.item.id);
  renderCart();
  if (!state.cart.size) closePanels();
}

function cartTotals() {
  let count = 0;
  let total = 0;
  for (const { item, quantity } of state.cart.values()) {
    count += quantity;
    total += Number(item.price) * quantity;
  }
  return { count, total };
}

function renderCart() {
  const { count, total } = cartTotals();
  el('cartCount').textContent = count;
  el('cartBadge').textContent = count;
  el('cartTotal').textContent = money(total);
  el('panelTotal').textContent = '￥' + money(total);
  el('cartBar').classList.toggle('is-visible', count > 0);

  const list = el('cartList');
  if (!state.cart.size) {
    list.innerHTML = '<p class="muted">还没有选菜</p>';
    return;
  }
  list.innerHTML = [...state.cart.entries()].map(([key, { item, quantity, spice }]) => {
    const meta = DISH_META[item.id] || {};
    return `
      <div class="cart-row">
        ${meta.image ? `<img class="cart-thumb" src="${meta.image}" alt="${item.name}" loading="lazy">` : ''}
        <div class="cart-info">
          <div class="name">${item.name}</div>
          <div class="sub">￥${money(item.price)} / 份${spice ? ' · ' + spice : ''}</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty('${key}', -1)">−</button>
            <span>${quantity}</span>
            <button class="qty-btn" onclick="changeQty('${key}', 1)">＋</button>
          </div>
        </div>
        <div class="cart-line-total">×${quantity}<b>￥${money(Number(item.price) * quantity)}</b></div>
      </div>`;
  }).join('');
}

function openCart() {
  if (!state.cart.size) {
    showToast('请先选择菜品');
    return;
  }
  el('panelTable').textContent = state.tableNo;
  el('spicePanel').classList.add('hidden');
  el('cartPanel').classList.remove('hidden');
  el('successPanel').classList.add('hidden');
  el('overlay').classList.add('is-open');
}

function closePanels() {
  el('overlay').classList.remove('is-open');
}

function closeSuccess() {
  closePanels();
}

async function submitOrder() {
  if (state.submitting || !state.cart.size) return;
  state.submitting = true;
  try {
    const items = [...state.cart.values()].map(({ item, quantity, spice }) => ({
      menuId: item.id,
      quantity,
      spiceLevel: spice || null
    }));
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNo: state.tableNo, items })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '下单失败');

    el('orderId').textContent = data.id;
    el('orderTable').textContent = data.tableNo;
    el('orderTotal').textContent = '￥' + money(data.totalPrice);
    state.lastOrderId = data.id;
    el('orderItems').innerHTML = (data.items || []).map((item) => `
      <div class="row">
        <span>${item.name}${item.spiceLevel ? '（' + item.spiceLevel + '）' : ''} × ${item.quantity}</span>
        <span>￥${money(Number(item.price) * item.quantity)}</span>
      </div>`).join('');

    const dishIds = [...new Set([...state.cart.values()].map((entry) => entry.item.id))];
    state.cart.clear();
    dishIds.forEach(updateDish);
    renderCart();
    el('cartPanel').classList.add('hidden');
    el('spicePanel').classList.add('hidden');
    el('successPanel').classList.remove('hidden');
  } catch (e) {
    showToast(e.message);
  } finally {
    state.submitting = false;
  }
}

function viewOrderStatus() {
  if (!state.lastOrderId) {
    showToast('还没有订单');
    return;
  }
  location.href = '/order.html?id=' + encodeURIComponent(state.lastOrderId);
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const table = params.get('table');
  if (table) state.tableNo = table;
  el('tableNo').textContent = state.tableNo;
  el('panelTable').textContent = state.tableNo;
  el('overlay').addEventListener('click', (event) => {
    if (event.target === el('overlay')) closePanels();
  });
  el('cartBar').addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    openCart();
  });
  loadMenu();
});
