const el = (id) => document.getElementById(id);
const state = { hub: null };

function qrSrc(url) {
  return '/api/hub/qr?data=' + encodeURIComponent(url);
}

function publicPhoneUrl(base) {
  if (!base) return '';
  return base.replace(/\/$/, '') + '/?table=A01';
}

function renderPages() {
  const origin = location.origin;
  const pages = [
    ['顾客点餐', '/'],
    ['商家登录', '/login.html'],
    ['商家订单', '/merchant.html'],
    ['菜品管理', '/menu-admin.html'],
    ['订单查询', '/order.html']
  ];
  el('pages').innerHTML = pages.map(([name, path]) => `
    <a class="page" href="${origin}${path}" target="_blank">
      <div class="name">${name}</div>
      <div class="path">${path}</div>
    </a>`).join('');
}

function renderLan(list) {
  const container = el('lanList');
  if (!list || !list.length) {
    container.innerHTML = '<div class="public-card empty">没有检测到局域网地址，请检查网络连接。</div>';
    return;
  }
  container.innerHTML = list.map((item) => `
    <div class="lan-card">
      <div>
        <div class="net">${item.name}</div>
        <div class="url">${item.url}</div>
        <a class="open" href="${item.url}" target="_blank">在浏览器打开</a>
      </div>
    </div>`).join('');
}

function renderPublic(publicUrl) {
  const container = el('publicCard');
  if (!publicUrl) {
    container.className = 'public-card empty';
    container.textContent = '未检测到公网隧道。启动 cloudflared 后会自动显示地址和二维码。';
    return;
  }
  const phoneUrl = publicPhoneUrl(publicUrl);
  container.className = 'public-card';
  container.innerHTML = `
    <div>
      <div class="label">公网手机点餐 <span style="color:var(--muted)">（临时）</span></div>
      <div class="url">${phoneUrl}</div>
      <div class="note">隧道重启后地址会变化，页面会在 5 秒内自动更新。</div>
      <a class="open" href="${phoneUrl}" target="_blank">在浏览器打开</a>
    </div>`;
}

function setImgSrc(img, url) {
  if (!url) {
    img.removeAttribute('src');
    delete img.dataset.loaded;
    return;
  }
  if (img.dataset.loaded !== url) {
    img.dataset.loaded = url;
    img.src = qrSrc(url);
  }
}

function renderDualQr() {
  const data = state.hub;
  if (!data) return;
  const table = el('tableInput').value.trim() || 'A01';
  const lanBase = data.lan && data.lan.length ? new URL(data.lan[0].url).origin : '';
  const publicBase = data.publicUrl ? new URL(data.publicUrl).origin : '';
  const lanUrl = lanBase ? lanBase + '/?table=' + encodeURIComponent(table) : '';
  const publicUrl = publicBase ? publicBase + '/?table=' + encodeURIComponent(table) : '';

  setImgSrc(el('lanQr'), lanUrl);
  el('lanQrUrl').textContent = lanUrl || '未检测到局域网地址';
  const lanDownload = el('lanQrDownload');
  if (lanUrl) {
    lanDownload.classList.remove('hidden');
    lanDownload.href = qrSrc(lanUrl);
    lanDownload.download = '同网二维码-' + table + '.png';
  } else {
    lanDownload.classList.add('hidden');
    lanDownload.removeAttribute('href');
  }

  const publicImg = el('publicQr');
  const publicDownload = el('publicQrDownload');
  if (publicUrl) {
    publicImg.classList.remove('hidden');
    setImgSrc(publicImg, publicUrl);
    el('publicQrUrl').textContent = publicUrl;
    publicDownload.classList.remove('hidden');
    publicDownload.href = qrSrc(publicUrl);
    publicDownload.download = '不同网二维码-' + table + '.png';
  } else {
    publicImg.classList.add('hidden');
    el('publicQrUrl').textContent = '未检测到公网隧道';
    publicDownload.classList.add('hidden');
    publicDownload.removeAttribute('href');
  }
}

function updateDualQr() {
  renderDualQr();
}

async function loadHub() {
  try {
    const res = await fetch('/api/hub/info', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.hub = data;
    renderLan(data.lan);
    renderPublic(data.publicUrl);
    renderDualQr();
    el('statusDot').classList.add('ok');
    el('statusText').textContent = data.publicUrl ? '局域网 + 公网可用' : '局域网可用';
    el('updatedAt').textContent = '自动更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (e) {
    el('statusDot').classList.remove('ok');
    el('statusText').textContent = '连接失败';
    el('updatedAt').textContent = '无法读取项目地址：' + e.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderPages();
  loadHub();
  el('tableInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') updateDualQr();
  });
  setInterval(() => {
    if (!document.hidden) loadHub();
  }, 5000);
});
