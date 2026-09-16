(() => {
  'use strict';

  /* ================= CONFIG & STATE ================= */
  const cfg = {
    webhookKey: 'mobileInvWebhookUrl',
    get webhookUrl() {
      return localStorage.getItem(this.webhookKey) || 'http://localhost:5678/webhook/mobile-inventory';
    },
    set webhookUrl(v) { localStorage.setItem(this.webhookKey, v); }
  };

  const state = {
    products: [],
    loaded: false,
    loadError: null,
    search: '',
    statusFilter: 'all',
    categoryFilter: '',
    sortBy: 'name',
    page: 'dashboard',
    chat: { dash: [], page: [] },
    chatBusy: false,
    loading: false
  };

  /* ================= DOM HELPERS ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtCurrency(v) {
    if (v == null || isNaN(v)) return 'Unavailable';
    v = Math.round(v);
    return 'PKR ' + v.toLocaleString('en-PK');
  }
  function fmtNum(v) {
    if (v == null || isNaN(v)) return 'Unavailable';
    return Number(v).toLocaleString('en-PK');
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ================= SET CONNECTION STATUS ================= */
  function setConnection(state2) {
    const map = { connected: ['connected', 'n8n Connected'], connecting: ['connecting', 'Connecting...'], disconnected: ['disconnected', 'n8n Unavailable'], off: ['off', 'Not configured'] };
    const [dot, label] = map[state2] || map.off;
    const dots = ['#connDot', '#topbarDot'];
    dots.forEach(sel => { const el = $(sel); if (el) { el.className = 'status-dot ' + dot; } });
    const connStatus = $('#connStatus');
    if (connStatus) connStatus.classList.toggle('disconnected', state2 === 'disconnected');
    const l1 = $('#connLabel'); if (l1) l1.textContent = label;
    const l2 = $('#topbarStatus'); if (l2) l2.textContent = label.replace('n8n ', 'n8n ');
    const l3 = $('#settingsConnStatus'); if (l3) l3.textContent = label;
  }

  /* ================= SAFE API CALL ================= */
  async function sendCommand(command) {
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: command })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.text();
    if (!raw || !raw.trim()) return { text: '', empty: true };
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = { response: raw }; }
    const text = parsed.response || parsed.chatOutput || parsed.output || (typeof parsed === 'string' ? parsed : null);
    const t = text != null ? String(text).trim() : '';
    return { text: t, empty: !t };
  }

  /* ================= RESPONSE PARSERS ================= */
  function classifyText(t) {
    if (/^SUCCESS/i.test(t)) return 'success';
    if (/^ERROR/i.test(t)) return 'error';
    if (/INVENTORY SUMMARY/i.test(t)) return 'report';
    if (/(^|\n)\s*PRODUCTS?(\s*\(|$)/im.test(t)) return 'products';
    if (/No results found/.test(t)) return 'empty';
    return 'info';
  }

  function parseProductLine(line) {
    // Format: SKU | Name | Stock: N | Price: X PKR | Status: X
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 5) return null;
    const sku = parts[0];
    const name = parts[1];
    const stockM = parts[2] && parts[2].match(/Stock:\s*([\d.]+)/i);
    const priceM = parts[3] && parts[3].match(/Price:\s*([\d.]+)/i);
    const statusM = parts[4] && parts[4].match(/Status:\s*([A-Z_]+)/i);
    const status = statusM ? statusM[1].toUpperCase() : (parts[4] || '').toUpperCase();
    const current_stock = stockM ? parseInt(stockM[1], 10) : 0;
    const selling_price = priceM ? parseFloat(priceM[1]) : 0;
    return { sku, product_name: name, current_stock, selling_price, status };
  }

  function parseProducts(text) {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const prods = [];
    for (const line of lines) {
      if (/^PRODUCTS? \(|^INVENTORY|^SUCCESS|^ERROR/i.test(line)) continue;
      if (!line.includes('|')) continue;
      const p = parseProductLine(line);
      if (p && p.sku) prods.push(p);
    }
    return prods;
  }

  function parseReport(text) {
    const out = {};
    if (!text) return out;
    const m = (key) => { const r = text.match(new RegExp(key + ':\\s*([\\d.]+)')); return r ? parseFloat(r[1]) : null; };
    out.products = m('Products');
    out.units = m('Total units');
    out.inventory_cost = m('Inventory cost');
    out.inventory_value = m('Inventory value');
    out.low_stock = m('Low stock');
    out.out_of_stock = m('Out of stock');
    return out;
  }

  function statusOf(p) {
    if (p.status) return p.status.toUpperCase();
    if (p.current_stock <= 0) return 'OUT_OF_STOCK';
    return 'IN_STOCK';
  }

  /* ================= DASHBOARD RENDER ================= */
  function computeKpis(products) {
    const k = { products: products.length, units: 0, low: 0, out: 0, value: 0 };
    for (const p of products) {
      const stk = Number(p.current_stock) || 0;
      const rl = Number(p.reorder_level) || 5;
      k.units += stk;
      k.value += stk * (Number(p.selling_price) || 0);
      const s = statusOf(p);
      if (s === 'OUT_OF_STOCK') k.out++;
      else if (s === 'LOW_STOCK' || (rl > 0 && stk <= rl)) k.low++;
    }
    return k;
  }

  function renderKpis() {
    if (!state.loaded) return;
    const k = computeKpis(state.products);
    $('#kpiProducts').textContent = fmtNum(k.products);
    $('#kpiStock').textContent = fmtNum(k.units);
    $('#kpiLow').textContent = fmtNum(k.low);
    $('#kpiOut').textContent = fmtNum(k.out);
    $('#kpiValue').textContent = fmtCurrency(k.value);
  }

  function statusBadge(status) {
    const s = (status || '').toUpperCase();
    const cls = s === 'OUT_OF_STOCK' ? 'out' : (s === 'LOW_STOCK' ? 'low' : 'in');
    const label = s === 'OUT_OF_STOCK' ? 'Out of Stock' : (s === 'LOW_STOCK' ? 'Low Stock' : 'In Stock');
    return `<span class="badge ${cls}"><span class="bdot"></span>${label}</span>`;
  }

  function productRows(products) {
    if (!products.length) return '';
    return products.map((p, i) => {
      const avatar = (p.product_name || '?').charAt(0).toUpperCase();
      return `
      <tr data-sku="${esc(p.sku)}">
        <td><div class="prod-cell"><div class="prod-avatar">${esc(avatar)}</div><div class="prod-name">${esc(p.product_name)}</div></div></td>
        <td class="prod-sku">${esc(p.sku)}</td>
        <td class="cell-secondary">${esc(p.category || '—')}</td>
        <td class="price-cell">${esc(p.current_stock)}</td>
        <td class="price-cell">${fmtCurrency(p.selling_price)}</td>
        <td>${statusBadge(p.status)}</td>
      </tr>`;
    }).join('');
  }

  function renderDashTable(products = state.products) {
    const wrap = $('#dashTableWrap');
    if (!state.loaded) { wrap.innerHTML = '<div class="skeleton-table"><div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div></div>'; return; }
    if (state.loadError) { wrap.innerHTML = errorHtml('Unable to load inventory.', state.loadError); return; }
    if (!products.length) { wrap.innerHTML = `<div class="low-stock-empty">No products found.</div>`; return; }
    wrap.innerHTML = `<div class="table-wrap">
      <table class="inv-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th></tr></thead>
        <tbody>${productRows(products.slice(0, 6))}</tbody>
      </table></div>`;
    $$('#dashTableWrap .inv-table tbody tr').forEach(r => r.addEventListener('click', () => openProduct(r.dataset.sku)));
  }

  function renderLowStockPanel() {
    const panel = $('#lowStockPanel');
    if (!state.loaded) { panel.innerHTML = '<div class="skeleton-rows"><div class="sk-row short"></div><div class="sk-row short"></div></div>'; return; }
    const low = state.products.filter(p => statusOf(p) === 'LOW_STOCK' || statusOf(p) === 'OUT_OF_STOCK')
      .sort((a, b) => (Number(a.current_stock) || 0) - (Number(b.current_stock) || 0)).slice(0, 6);
    if (!low.length) { panel.innerHTML = '<div class="low-stock-empty">All products are sufficiently stocked.</div>'; return; }
    panel.innerHTML = `<ul class="low-stock-list">` + low.map(p => `
      <li data-sku="${esc(p.sku)}">
        <div class="ls-info"><span class="ls-name">${esc(p.product_name)}</span><span class="ls-sku">${esc(p.sku)}</span></div>
        <div class="ls-right"><div class="ls-qty">${esc(p.current_stock)}</div><div class="ls-label">${statusOf(p) === 'OUT_OF_STOCK' ? 'out of stock' : 'units left'}</div></div>
      </li>`).join('') + `</ul>`;
    $$('#lowStockPanel li').forEach(li => { li.style.cursor = 'pointer'; li.addEventListener('click', () => openProduct(li.dataset.sku)); });
  }

  function renderCategoryChart(products = state.products) {
    const el = $('#categoryChart');
    if (!state.loaded) { el.innerHTML = '<div class="skeleton-chart"></div>'; return; }
    const byCat = {};
    products.forEach(p => { const c = p.category || 'Other'; byCat[c] = (byCat[c] || 0) + (Number(p.current_stock) || 0); });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (!entries.length) { el.innerHTML = '<div class="low-stock-empty">No inventory data.</div>'; return; }
    const max = Math.max(...entries.map(e => e[1]), 1);
    const colors = ['#2563eb', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#64748b'];
    el.innerHTML = `<div class="chart-bars">` + entries.map((e, i) => `
      <div class="chart-row">
        <span class="chart-label" title="${esc(e[0])}">${esc(e[0])}</span>
        <div class="chart-track"><div class="chart-fill" style="width:${Math.max(4, (e[1] / max) * 100)}%;background:${colors[i % colors.length]}"></div></div>
        <span class="chart-val">${fmtNum(e[1])}</span>
      </div>`).join('') + `</div>`;
  }

  function refreshDashboard() {
    renderKpis();
    renderDashTable();
    renderLowStockPanel();
    renderCategoryChart();
  }

  /* ================= INVENTORY PAGE ================= */
  function filteredProducts() {
    let list = state.products.slice();
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(p => (p.product_name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.compatibility || '').toLowerCase().includes(q));
    }
    if (state.statusFilter !== 'all' && state.statusFilter !== '') {
      list = list.filter(p => statusOf(p) === state.statusFilter);
    }
    if (state.categoryFilter) list = list.filter(p => p.category === state.categoryFilter);
    if (state.sortBy === 'name') list.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    else if (state.sortBy === 'stock-asc') list.sort((a, b) => (Number(a.current_stock) || 0) - (Number(b.current_stock) || 0));
    else if (state.sortBy === 'stock-desc') list.sort((a, b) => (Number(b.current_stock) || 0) - (Number(a.current_stock) || 0));
    else if (state.sortBy === 'price-asc') list.sort((a, b) => (Number(a.selling_price) || 0) - (Number(b.selling_price) || 0));
    else if (state.sortBy === 'price-desc') list.sort((a, b) => (Number(b.selling_price) || 0) - (Number(a.selling_price) || 0));
    return list;
  }

  function renderInventoryTable() {
    const wrap = $('#invTableWrap');
    const footer = $('#invTableFooter');
    if (!state.loaded) { wrap.innerHTML = '<div class="skeleton-table"><div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div><div class="sk-row"></div></div>'; footer.textContent = ''; return; }
    if (state.loadError) { wrap.innerHTML = errorHtml('Unable to load inventory.', state.loadError); footer.textContent = ''; return; }
    const list = filteredProducts();
    if (!list.length) {
      wrap.innerHTML = `<div style="padding:60px 20px;text-align:center">${state.search || state.statusFilter !== 'all' || state.categoryFilter
        ? '<div style="font-size:17px;font-weight:700">No matching products</div><div style="color:var(--text-3);font-size:13px;margin-top:6px">Try another product name, SKU, or category, or clear the filters.</div>'
        : '<div style="font-size:17px;font-weight:700">No products found</div><div style="color:var(--text-3);font-size:13px;margin-top:6px">Add products using the AI assistant, e.g. "Add a new product...".</div>'}</div>`;
      footer.textContent = '';
      return;
    }
    wrap.innerHTML = `<table class="inv-table">
      <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Brand</th><th>Stock</th><th>Price</th><th>Status</th></tr></thead>
      <tbody>${productRows(list)}</tbody></table>`;
    footer.innerHTML = `<span class="count">${list.length} product${list.length === 1 ? '' : 's'}</span>` +
      (state.search ? `<span>Filtered by "${esc(state.search)}"</span>` : '');
    $$('#invTableWrap .inv-table tbody tr').forEach(r => r.addEventListener('click', () => openProduct(r.dataset.sku)));
  }

  function populateCategoryFilter() {
    const sel = $('#categoryFilter');
    const cats = Array.from(new Set(state.products.map(p => p.category).filter(Boolean))).sort();
    sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  /* ================= AI CHAT ================= */
  function addChatMsg(container, text, cls) {
    const div = document.createElement('div');
    div.className = 'chat-msg bot ' + (cls || 'info');
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }
  function addChatUser(container, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
  function showTyping(container) {
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chatTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }
  function hideTyping(container) {
    const el = container.querySelector('#chatTyping'); if (el) el.remove();
  }

  function renderAiProducts(container, text) {
    const prods = parseProducts(text);
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg bot info';
    if (!prods.length) { wrap.textContent = text || 'No products found.'; container.appendChild(wrap); return; }
    const title = document.createElement('div');
    title.style.fontWeight = '700'; title.style.marginBottom = '8px';
    title.textContent = `Found ${prods.length} product${prods.length === 1 ? '' : 's'}`;
    wrap.appendChild(title);
    const grid = document.createElement('div');
    grid.style.display = 'grid'; grid.style.gap = '8px';
    prods.forEach(p => {
      const card = document.createElement('div');
      card.style.background = '#fff'; card.style.border = '1px solid var(--border)'; card.style.borderRadius = '6px'; card.style.padding = '9px 12px';
      card.style.cursor = 'pointer';
      card.innerHTML = `<div style="font-weight:700;font-size:13px">${esc(p.product_name)}</div>
        <div style="font-size:11px;color:var(--text-3);font-family:monospace;margin:2px 0 6px">${esc(p.sku)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px"><b>Stock:</b> ${esc(p.current_stock)} &nbsp; <b>Price:</b> ${fmtCurrency(p.selling_price)}</span>
          ${statusBadge(p.status)}
        </div>`;
      card.addEventListener('click', () => openProduct(p.sku));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
  }

  function renderAiResponse(container, text) {
    const cls = classifyText(text);
    if (cls === 'products') renderAiProducts(container, text);
    else addChatMsg(container, text, cls);
  }

  async function sendChat(container, inputEl, command) {
    const text = (command || inputEl.value).trim();
    if (!text || state.chatBusy) return;
    inputEl.value = '';
    addChatUser(container, text);
    state.chatBusy = true;
    showTyping(container);
    setConnection('connecting');
    try {
      const r = await sendCommand(text);
      hideTyping(container);
      if (r.empty) addChatMsg(container, 'No response received from the inventory system.\nThe product may not exist, or the request did not match anything.\nTry "Show all products" to see what is in stock.', 'info');
      else renderAiResponse(container, r.text);
      setConnection('connected');
      if (text.toLowerCase().includes('all products') || text.toLowerCase().includes('low stock')) reloadAfterChat();
    } catch (err) {
      hideTyping(container);
      setConnection('disconnected');
      const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; wrap.style.alignItems = 'flex-start';
      const msg = addChatMsg(container, 'Unable to reach the inventory system.\nCheck that n8n is running at ' + cfg.webhookUrl + ' and the workflow is active.', 'error');
      const btn = document.createElement('button'); btn.className = 'btn btn-secondary'; btn.style.padding = '6px 14px'; btn.style.fontSize = '12px'; btn.textContent = 'Retry';
      btn.addEventListener('click', () => { msg.remove(); btn.remove(); sendChat(container, inputEl, text); });
      msg.appendChild(btn);
    }
    state.chatBusy = false;
  }

  async function reloadAfterChat() {
    try { await loadData(true); } catch (e) { /* keep existing */ }
    refreshDashboard();
    renderInventoryTable();
  }

  /* ================= PRODUCT MODAL ================= */
  function openProduct(sku) {
    const p = state.products.find(x => x.sku === sku);
    if (!p) return;
    const s = statusOf(p);
    $('#modalProductName').textContent = p.product_name;
    $('#modalBody').innerHTML = `
      <div class="pd-header">
        <div class="pd-avatar">${esc((p.product_name || '?').charAt(0).toUpperCase())}</div>
        <div><div class="pd-name">${esc(p.product_name)}</div><div class="pd-sku">${esc(p.sku)}</div></div>
      </div>
      <div class="pd-grid">
        <div class="pd-item"><div class="pd-label">Current Stock</div><div class="pd-value">${esc(p.current_stock)} units</div></div>
        <div class="pd-item"><div class="pd-label">Status</div><div class="pd-value">${statusBadge(s)}</div></div>
        <div class="pd-item"><div class="pd-label">Selling Price</div><div class="pd-value money">${fmtCurrency(p.selling_price)}</div></div>
        <div class="pd-item"><div class="pd-label">Cost Price</div><div class="pd-value money">${fmtCurrency(p.cost_price)}</div></div>
        <div class="pd-item"><div class="pd-label">Category</div><div class="pd-value">${esc(p.category || '—')}</div></div>
        <div class="pd-item"><div class="pd-label">Brand</div><div class="pd-value">${esc(p.brand || '—')}</div></div>
      </div>
      <div class="pd-section-title">Stock history</div>
      <div style="font-size:13px;color:var(--text-3)">Stock history unavailable through the current API.</div>
      <div class="pd-actions" style="margin-top:16px">
        <button class="btn btn-success" id="pdAddStock">Add Stock</button>
        <button class="btn btn-primary" id="pdRecordSale">Record Sale</button>
      </div>`;
    $('#productModal').classList.add('open');
    $('#pdAddStock').addEventListener('click', () => { $('#productModal').classList.remove('open'); openStockModal(p, 'add'); });
    $('#pdRecordSale').addEventListener('click', () => { $('#productModal').classList.remove('open'); openStockModal(p, 'sale'); });
  }

  /* ================= STOCK ACTION MODAL ================= */
  let currentStockAction = null;
  function openStockModal(product, type) {
    currentStockAction = { product, type, originalStock: Number(product.current_stock) || 0 };
    $('#stockModalTitle').textContent = type === 'add' ? 'Add Stock — ' + product.product_name : 'Record Sale — ' + product.product_name;
    $('#stockProduct').value = product.product_name + ' (' + product.sku + ')';
    $('#stockQty').value = '';
    $('#stockNote').value = '';
    $('#stockError').classList.remove('show');
    $('#stockModalConfirm').className = type === 'add' ? 'btn btn-success' : 'btn btn-primary';
    $('#stockModalConfirm').textContent = type === 'add' ? 'Add Stock' : 'Record Sale';
    $('#stockModal').classList.add('open');
    $('#stockQty').focus();
  }

  async function confirmStockAction() {
    const { product, type } = currentStockAction || {};
    if (!product) return;
    const qty = parseInt($('#stockQty').value, 10);
    const note = $('#stockNote').value.trim();
    const errEl = $('#stockError');
    errEl.classList.remove('show');
    if (!qty || qty <= 0) { errEl.textContent = 'Quantity must be a positive number.'; errEl.classList.add('show'); return; }
    if (type === 'sale' && qty > currentStockAction.originalStock) {
      errEl.textContent = 'Cannot sell ' + qty + ' units. Only ' + currentStockAction.originalStock + ' unit(s) available.';
      errEl.classList.add('show'); return;
    }
    const btn = $('#stockModalConfirm');
    btn.disabled = true; btn.textContent = 'Processing...';
    const cmd = type === 'add'
      ? (note ? 'Stock in ' + qty + ' ' + product.product_name + ', note ' + note : 'Stock in ' + qty + ' ' + product.product_name)
      : 'Sell ' + qty + ' ' + product.product_name;
    try {
      const r = await sendCommand(cmd);
      if (r.empty) throw new Error('Empty response from n8n.');
      $('#stockModal').classList.remove('open');
      await loadData(true);
      refreshDashboard(); renderInventoryTable();
      // Show result in assistant page chat
      const container = $('#pageChatMessages');
      addChatUser(container, cmd);
      renderAiResponse(container, r.text);
      switchPage('assistant');
    } catch (err) {
      errEl.textContent = 'Request failed: ' + err.message + '. Check that n8n is running and the webhook URL is correct.';
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.textContent = type === 'add' ? 'Add Stock' : 'Record Sale';
    }
  }

  /* ================= REPORTS ================= */
  function renderReports() {
    const summary = $('#reportSummary');
    const cat = $('#reportCategory');
    const dist = $('#reportStockDist');
    if (!state.loaded) return;
    const k = computeKpis(state.products);
    summary.innerHTML = `
      <div class="report-stat"><span>Total Products</span><span>${fmtNum(k.products)}</span></div>
      <div class="report-stat"><span>Total Stock Units</span><span>${fmtNum(k.units)}</span></div>
      <div class="report-stat"><span>Inventory Value</span><span>${fmtCurrency(k.value)}</span></div>
      <div class="report-stat"><span>Low Stock Products</span><span>${fmtNum(k.low)}</span></div>
      <div class="report-stat"><span>Out of Stock</span><span>${fmtNum(k.out)}</span></div>`;
    const byCat = {}; state.products.forEach(p => { const c = p.category || 'Other'; byCat[c] = (byCat[c] || 0) + (Number(p.current_stock) || 0); });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    const colors = ['#2563eb', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#64748b'];
    cat.innerHTML = entries.length
      ? `<div class="chart-bars">` + entries.map((e, i) => `<div class="chart-row"><span class="chart-label" title="${esc(e[0])}">${esc(e[0])}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.max(4, (e[1] / max) * 100)}%;background:${colors[i % colors.length]}"></div></div><span class="chart-val">${fmtNum(e[1])}</span></div>`).join('') + `</div>`
      : '<div class="low-stock-empty">No inventory data.</div>';
    const stockStatus = { IN_STOCK: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 };
    state.products.forEach(p => stockStatus[statusOf(p)]++);
    const distColors = { IN_STOCK: 'var(--green)', LOW_STOCK: 'var(--amber)', OUT_OF_STOCK: 'var(--red)' };
    const distLabels = { IN_STOCK: 'In Stock', LOW_STOCK: 'Low Stock', OUT_OF_STOCK: 'Out of Stock' };
    const maxDist = Math.max(...Object.values(stockStatus), 1);
    dist.innerHTML = Object.entries(stockStatus).map(([key, val]) => `
      <div class="chart-row"><span class="chart-label">${distLabels[key]}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.max(4, (val / maxDist) * 100)}%;background:${distColors[key]}"></div></div><span class="chart-val">${fmtNum(val)}</span></div>`).join('');
  }

  /* ================= ERROR HTML ================= */
  function errorHtml(title, detail) {
    return `<div style="padding:50px 20px;text-align:center">
      <div style="font-size:17px;font-weight:700">${esc(title)}</div>
      <div style="color:var(--text-3);font-size:13px;margin-top:8px;max-width:420px;margin-left:auto;margin-right:auto;line-height:1.5">${esc(detail)}</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">Retry</button>
    </div>`;
  }

  /* ================= NAVIGATION ================= */
  const pageMeta = {
    dashboard: ['Dashboard', 'Overview of your mobile accessories inventory'],
    inventory: ['Inventory', 'Browse and manage your mobile accessories products'],
    assistant: ['AI Assistant', 'Ask your inventory anything in plain language'],
    reports: ['Reports', 'Inventory statistics and analytics'],
    settings: ['Settings', 'Connection and configuration']
  };

  function switchPage(page) {
    state.page = page;
    $$('.page').forEach(p => p.classList.remove('active'));
    $('#page-' + page).classList.add('active');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    const meta = pageMeta[page] || pageMeta.dashboard;
    $('#pageTitle').textContent = meta[0];
    $('#pageSub').textContent = meta[1];
    if (page === 'reports') renderReports();
    if (page === 'assistant') $('#pageChatInput').focus();
  }

  /* ================= DATA LOAD ================= */
  async function loadData(silent) {
    if (state.loading) return state.loading;
    state.loading = true;
    if (!silent) { state.loaded = false; state.loadError = null; refreshDashboard(); renderInventoryTable(); setConnection('connecting'); }
    try {
      setConnection('connecting');
      const r = await sendCommand('Show all products');
      if (r.empty) throw new Error('n8n returned an empty response. Make sure the workflow is active.');
      const prods = parseProducts(r.text);
      // If no slash-lines parsed (unusual), still keep — table shows empty state
      state.products = prods;
      state.loaded = true;
      state.loadError = null;
      setConnection('connected');
    } catch (err) {
      state.loadError = err.message || 'Unknown error';
      setConnection('disconnected');
      if (!silent) {
        refreshDashboard(); renderInventoryTable();
      }
    } finally {
      state.loading = false;
    }
    refreshDashboard();
    renderInventoryTable();
    populateCategoryFilter();
    renderReports();
  }

  /* ================= SEARCH / FILTER WIRING ================= */
  function wireFilters() {
    $('#invSearch').addEventListener('input', debounce(e => { state.search = e.target.value.trim(); renderInventoryTable(); }, 200));
    $$('#statusFilter .pill').forEach(p => p.addEventListener('click', () => {
      $$('#statusFilter .pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      state.statusFilter = p.dataset.filter;
      renderInventoryTable();
    }));
    $('#categoryFilter').addEventListener('change', e => { state.categoryFilter = e.target.value; renderInventoryTable(); });
    $('#sortSelect').addEventListener('change', e => { state.sortBy = e.target.value; renderInventoryTable(); });

    // Suggestions in dashboard
    $$('#dashSuggestions .suggestion-chip').forEach(b => b.addEventListener('click', () => sendChat($('#dashChatMessages'), $('#dashChatInput'), b.dataset.cmd)));
    $('#dashChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat($('#dashChatMessages'), $('#dashChatInput')); });
    $('#dashChatSend').addEventListener('click', () => sendChat($('#dashChatMessages'), $('#dashChatInput')));
    // Suggestions AI page
    $$('#pageSuggestions .suggestion-card').forEach(b => b.addEventListener('click', () => sendChat($('#pageChatMessages'), $('#pageChatInput'), b.dataset.cmd)));
    $('#pageChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat($('#pageChatMessages'), $('#pageChatInput')); });
    $('#pageChatSend').addEventListener('click', () => sendChat($('#pageChatMessages'), $('#pageChatInput')));

    // Modals
    $('#modalClose').addEventListener('click', () => $('#productModal').classList.remove('open'));
    $('#stockModalClose').addEventListener('click', () => $('#stockModal').classList.remove('open'));
    $('#stockModalCancel').addEventListener('click', () => $('#stockModal').classList.remove('open'));
    $('#stockModalConfirm').addEventListener('click', confirmStockAction);
    $$('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

    // Settings
    $('#settingsWebhook').value = cfg.webhookUrl;
    $('#settingsSave').addEventListener('click', () => {
      const v = $('#settingsWebhook').value.trim();
      if (v) { cfg.webhookUrl = v; loadData(); }
    });

    // Sidebar nav
    $$('.nav-item').forEach(n => n.addEventListener('click', e => {
      e.preventDefault(); switchPage(n.dataset.page); $('#sidebar').classList.remove('open');
    }));
    $$('.link-btn').forEach(b => b.addEventListener('click', e => { e.preventDefault(); switchPage(b.dataset.page); }));

    // Menu / responsive
    $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

    // Global search
    $('#globalSearch').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        state.search = e.target.value.trim();
        $('#invSearch').value = state.search;
        switchPage('inventory');
        renderInventoryTable();
        e.target.value = '';
      }
    });

    // Product rows (delegated)
    document.addEventListener('click', e => {
      const tr = e.target.closest('.inv-table tbody tr');
      if (tr) openProduct(tr.dataset.sku);
    });
  }

  function startClock() {
    const update = () => {
      const now = new Date();
      const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
      $('#topbarTime').textContent = now.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + now.toLocaleTimeString('en-PK', opts).toLowerCase();
    };
    update(); setInterval(update, 30000);
  }

  /* ================= INIT ================= */
  async function init() {
    wireFilters();
    startClock();
    switchPage('dashboard');
    await loadData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();