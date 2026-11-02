/* FABY Keeper – نسخة خفيفة. البيانات تُحفظ في localStorage. */
'use strict';
const KEY = 'faby-keeper-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- البيانات ---------- */
function seed() {
  return {
    lockers: [
      { id: uid(), name: 'خزانة #1', desc: 'أدوات القص والتفصيل', items: [
        { id: uid(), name: 'شفرات قص', desc: 'مقاس 9مم', qty: 40, min: 10 },
        { id: uid(), name: 'مسطرة معدنية', desc: '', qty: 3, min: 5 }] },
      { id: uid(), name: 'خزانة #2', desc: 'مواد استهلاكية', items: [
        { id: uid(), name: 'ورق A4', desc: 'علبة 500 ورقة', qty: 12, min: 4 },
        { id: uid(), name: 'أقلام ماركر', desc: '', qty: 0, min: 6 }] }],
    zones: [{ id: uid(), name: 'المنطقة A', areas: [
      { id: uid(), name: 'رف 1', items: [{ id: uid(), name: 'ألواح خشب MDF', desc: '', qty: 20, min: 5 }] },
      { id: uid(), name: 'رف 2', items: [] }] }],
    depts: [{ id: uid(), name: 'CNC / ليزر', items: [{ id: uid(), name: 'جهاز ليزر', desc: 'CO2 60W', qty: 1, min: 0 }] }],
    emps: [] // يضاف الموظفون من الواجهة
  };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast('تعذر الحفظ'); } }, 150); };
const find = (arr, id) => arr.find(x => x.id === id);
const status = i => i.qty <= 0 ? 'out' : i.qty <= i.min ? 'low' : 'ok';
const stLabel = { ok: 'متوفر', low: 'منخفض', out: 'نفد' };

/* ---------- أدوات الواجهة ---------- */
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
function modal(html, lg) { const w = $('#modal'); $('#modalBox').className = 'modal' + (lg ? ' lg' : ''); $('#modalBox').innerHTML = html; w.hidden = false; const f = $('#modalBox input'); f && f.focus(); }
function closeModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* نموذج عام: fields = [{k,label,type,value,options}] */
function form(title, fields, onOk, okText = 'حفظ') {
  modal(`<h3>${esc(title)}</h3><form id="f">${fields.map(f => `<div class="field"><label>${esc(f.label)}</label>${
    f.type === 'select' ? `<select name="${f.k}">${f.options.map(o => `<option value="${esc(o[0])}" ${o[0] == f.value ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
      : `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.req ? 'required' : ''}>`}</div>`).join('')
    }<div class="actions"><button type="button" class="btn" data-close>إلغاء</button><button class="btn primary">${okText}</button></div></form>`);
  $('#f').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); closeModal(); onOk(d); };
}
const confirmDo = (msg, fn) => { modal(`<h3>${esc(msg)}</h3><div class="actions"><button class="btn" data-close>إلغاء</button><button class="btn danger" id="yes">تأكيد</button></div>`); $('#yes').onclick = () => { closeModal(); fn(); }; };
const itemFields = (i = {}) => [
  { k: 'name', label: 'اسم العنصر', value: i.name, req: 1 }, { k: 'desc', label: 'الوصف', value: i.desc },
  { k: 'qty', label: 'الكمية', type: 'number', min: 0, value: i.qty ?? 1 }, { k: 'min', label: 'حد التنبيه', type: 'number', min: 0, value: i.min ?? 0 }];
const toItem = d => ({ name: d.name.trim(), desc: d.desc.trim(), qty: Math.max(0, +d.qty || 0), min: Math.max(0, +d.min || 0) });

/* ---------- حالة التنقل ---------- */
let page = 'home', ctx = {}, q = '', tab = 'items';
const titles = { home: 'الرئيسية', lockers: 'الخزائن', warehouse: 'المستودع', departments: 'الأقسام', employees: 'الموظفون' };
function go(p, c = {}) { page = p; ctx = c; q = ''; $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); render(); scrollTo(0, 0); }

/* ---------- عناصر مشتركة ---------- */
function itemRows(items, kind) {
  const list = items.filter(i => !q || (i.name + i.desc).toLowerCase().includes(q));
  if (!list.length) return '<div class="empty">لا توجد عناصر</div>';
  return `<div class="list">${list.map(i => { const s = status(i); return `<div class="row ${s}">
    <div class="info"><b>${esc(i.name)}</b><small>${esc(i.desc)}</small></div>
    ${kind === 'dept' ? '' : `<span class="chip ${s}">${stLabel[s]}</span>`}
    <div class="qty"><button data-a="dec" data-id="${i.id}">−</button><span>${i.qty}</span><button data-a="inc" data-id="${i.id}">+</button></div>
    <button class="btn sm" data-a="edit" data-id="${i.id}">✏️</button><button class="btn sm danger" data-a="del" data-id="${i.id}">🗑</button></div>`; }).join('')}</div>`;
}
/* ربط أحداث قائمة عناصر داخل حاوية مع مصفوفة */
function bindItems(root, items, rerender) {
  root.onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const it = find(items, b.dataset.id); if (!it) return;
    const a = b.dataset.a;
    if (a === 'inc') it.qty++; else if (a === 'dec') it.qty = Math.max(0, it.qty - 1);
    else if (a === 'del') return confirmDo(`حذف "${it.name}"؟`, () => { items.splice(items.indexOf(it), 1); save(); rerender(); });
    else if (a === 'edit') return form('تعديل عنصر', itemFields(it), d => { Object.assign(it, toItem(d)); save(); rerender(); });
    save(); rerender();
  };
}
function addItemBtn(items, rerender) {
  form('إضافة عنصر', itemFields(), d => { items.push({ id: uid(), ...toItem(d) }); save(); rerender(); toast('تمت الإضافة'); });
}
const sumQty = items => items.reduce((n, i) => n + i.qty, 0);
const lowItems = () => {
  const out = [];
  db.lockers.forEach(l => l.items.forEach(i => status(i) !== 'ok' && out.push({ i, where: l.name })));
  db.zones.forEach(z => z.areas.forEach(a => a.items.forEach(i => status(i) !== 'ok' && out.push({ i, where: `${z.name} / ${a.name}` }))));
  return out;
};

/* ---------- الصفحات ---------- */
const V = $('#view');
function render() {
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.go === (page === 'dept' ? 'departments' : page === 'emp' ? 'employees' : page === 'locker' ? 'lockers' : page)));
  $('#pageTitle').textContent = titles[page] || ctx.title || '';
  const adds = { lockers: 'خزانة', warehouse: ctx.zone ? 'منطقة' : 'منطقة', departments: 'قسم', employees: 'موظف' };
  $('#addBtn').hidden = !adds[page]; $('#addBtn').textContent = '＋ ' + (adds[page] ? 'إضافة ' + adds[page] : '');
  const n = lowItems().length; $('#alertCount').textContent = n; $('#alertCount').hidden = !n;
  ({ home, lockers, locker: lockerDetail, warehouse, departments, dept: deptDetail, employees, emp: empDetail }[page])();
}

function home() {
  const cards = [['lockers', '📦', 'الخزائن', 'إدارة خزائن التخزين وعناصر المخزون', db.lockers.length], ['warehouse', '🏭', 'المستودع', 'مناطق المستودع والأرفف', db.zones.length],
    ['departments', '🏢', 'الأقسام', 'الأقسام والمعدات', db.depts.length], ['employees', '🪪', 'الموظفون', 'الموظفون والعهدة', db.emps.length]];
  V.innerHTML = `<div class="hero"><h2>FABY Keeper</h2><p>إدارة التخزين والمستودعات والأقسام</p></div><div class="grid">${cards.map(c =>
    `<div class="card click home-card" data-go="${c[0]}"><div class="ic">${c[1]}</div><h3>${c[2]}</h3><p>${c[3]}</p><div class="n">${c[4]}</div></div>`).join('')}</div>`;
}

function search(ph) { return `<div class="tools"><input id="q" placeholder="${ph}" value="${esc(q)}"></div>`; }
function bindSearch(fn) { const el = $('#q'); if (!el) return; el.oninput = () => { q = el.value.trim().toLowerCase(); fn(); const n = $('#q'); n.focus(); n.setSelectionRange(99, 99); }; }

function lockers() {
  const list = db.lockers.filter(l => !q || (l.name + l.desc + l.items.map(i => i.name).join(' ')).toLowerCase().includes(q));
  V.innerHTML = `<div class="stats">
    <div class="card stat"><div class="ic">📦</div><div><b>${db.lockers.length}</b><small>إجمالي الخزائن</small></div></div>
    <div class="card stat"><div class="ic">🧱</div><div><b>${sumQty(db.lockers.flatMap(l => l.items))}</b><small>إجمالي المخزون</small></div></div>
    <div class="card stat click" id="goAlerts"><div class="ic">⚠️</div><div><b>${lowItems().length}</b><small>التنبيهات</small></div></div></div>
    ${search('البحث في الخزائن والعناصر...')}
    <div class="grid">${list.map(l => { const low = l.items.filter(i => status(i) !== 'ok').length, pct = l.items.length ? 100 - low / l.items.length * 100 : 100;
      return `<div class="card click" data-open="${l.id}"><div class="corner"><button data-edit="${l.id}">✏️</button><button data-del="${l.id}">🗑</button></div>
      <h3>📦 ${esc(l.name)}</h3><div class="sub">${esc(l.desc) || '—'}</div><div class="sub">${l.items.length} عناصر · ${sumQty(l.items)} قطعة</div>
      <div class="bar"><i class="${low ? 'low' : ''}" style="width:${pct}%"></i></div></div>`; }).join('') || '<div class="empty">لا توجد خزائن</div>'}</div>`;
  bindSearch(lockers); $('#goAlerts').onclick = alerts;
  V.onclick = e => {
    const el = e.target.closest('[data-edit],[data-del],[data-open]'); if (!el) return;
    if (el.dataset.edit) { e.stopPropagation(); const l = find(db.lockers, el.dataset.edit); return form('تعديل خزانة', [{ k: 'name', label: 'الاسم', value: l.name, req: 1 }, { k: 'desc', label: 'الوصف', value: l.desc }], d => { l.name = d.name; l.desc = d.desc; save(); render(); }); }
    if (el.dataset.del) { e.stopPropagation(); const l = find(db.lockers, el.dataset.del); return confirmDo(`حذف ${l.name} بكل عناصرها؟`, () => { db.lockers = db.lockers.filter(x => x !== l); save(); render(); }); }
    go('locker', { id: el.dataset.open, title: find(db.lockers, el.dataset.open).name });
  };
}
function lockerDetail() {
  const l = find(db.lockers, ctx.id); if (!l) return go('lockers');
  const draw = () => { $('#list').innerHTML = itemRows(l.items); };
  V.innerHTML = `<button class="btn back" data-go="lockers">→ رجوع</button><div class="head"><h2>📦 ${esc(l.name)}</h2><span class="sub">${esc(l.desc)}</span><span class="grow"></span><button class="btn primary" id="addI">＋ عنصر</button></div>${search('البحث في العناصر...')}<div id="list"></div>`;
  draw(); bindItems($('#list'), l.items, () => { draw(); updAlerts(); });
  $('#addI').onclick = () => addItemBtn(l.items, draw);
  bindSearch(() => { draw(); }); V.onclick = null;
}

function warehouse() {
  const z = find(db.zones, ctx.zone) || db.zones[0]; ctx.zone = z && z.id;
  V.innerHTML = `${search('البحث في المناطق والعناصر...')}<div class="tabs">${db.zones.map(x => `<button class="${x === z ? 'on' : ''}" data-z="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  ${z ? `<div class="head"><h2>${esc(z.name)}</h2><span class="grow"></span><button class="btn" id="renZ">✏️ تسمية</button><button class="btn danger" id="delZ">🗑 حذف المنطقة</button><button class="btn primary" id="addA">＋ منطقة فرعية</button></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${z.areas.map(a => `<div class="card" data-area="${a.id}"><div class="head" style="margin:0 0 10px"><h3>${esc(a.name)}</h3><span class="grow"></span>
    <button class="btn sm" data-addi="${a.id}">＋</button><button class="btn sm" data-rena="${a.id}">✏️</button><button class="btn sm danger" data-dela="${a.id}">🗑</button></div><div class="alist" data-id="${a.id}"></div></div>`).join('') || '<div class="empty">لا توجد مناطق فرعية</div>'}</div>` : '<div class="empty">أضف منطقة للبدء</div>'}`;
  bindSearch(warehouse);
  if (!z) return;
  z.areas.forEach(a => { const box = V.querySelector(`.alist[data-id="${a.id}"]`); const draw = () => box.innerHTML = itemRows(a.items); draw(); bindItems(box, a.items, () => { draw(); updAlerts(); }); });
  V.onclick = e => {
    const t = e.target, g = k => t.closest(`[${k}]`)?.getAttribute(k);
    if (g('data-z')) { ctx.zone = g('data-z'); return warehouse(); }
    if (g('data-addi')) { const a = find(z.areas, g('data-addi')); return addItemBtn(a.items, () => { save(); warehouse(); }); }
    if (g('data-rena')) { const a = find(z.areas, g('data-rena')); return form('تسمية', [{ k: 'name', label: 'الاسم', value: a.name, req: 1 }], d => { a.name = d.name; save(); warehouse(); }); }
    if (g('data-dela')) { const a = find(z.areas, g('data-dela')); return confirmDo(`حذف ${a.name}؟`, () => { z.areas = z.areas.filter(x => x !== a); save(); warehouse(); }); }
  };
  $('#addA').onclick = () => form('منطقة فرعية', [{ k: 'name', label: 'الاسم', req: 1 }], d => { z.areas.push({ id: uid(), name: d.name, items: [] }); save(); warehouse(); });
  $('#renZ').onclick = () => form('تسمية المنطقة', [{ k: 'name', label: 'الاسم', value: z.name, req: 1 }], d => { z.name = d.name; save(); warehouse(); });
  $('#delZ').onclick = () => confirmDo(`حذف ${z.name} بكل محتوياتها؟`, () => { db.zones = db.zones.filter(x => x !== z); ctx.zone = null; save(); warehouse(); });
}

function departments() {
  const list = db.depts.filter(d => !q || (d.name + d.items.map(i => i.name).join(' ')).toLowerCase().includes(q));
  V.innerHTML = `<div class="stats"><div class="card stat"><div class="ic">🏢</div><div><b>${db.depts.length}</b><small>الأقسام</small></div></div>
    <div class="card stat"><div class="ic">🛠</div><div><b>${sumQty(db.depts.flatMap(d => d.items))}</b><small>المعدات</small></div></div>
    <div class="card stat"><div class="ic">👥</div><div><b>${db.emps.length}</b><small>الموظفون</small></div></div></div>${search('البحث في الأقسام...')}
    <div class="grid">${list.map(d => `<div class="card click" data-open="${d.id}"><div class="corner"><button data-edit="${d.id}">✏️</button><button data-del="${d.id}">🗑</button></div>
    <h3>🏢 ${esc(d.name)}</h3><div class="sub">${d.items.length} معدات · ${db.emps.filter(e => e.deptId === d.id).length} موظفين</div></div>`).join('') || '<div class="empty">لا توجد أقسام</div>'}</div>`;
  bindSearch(departments);
  V.onclick = e => {
    const el = e.target.closest('[data-edit],[data-del],[data-open]'); if (!el) return;
    if (el.dataset.edit) { e.stopPropagation(); const d = find(db.depts, el.dataset.edit); return form('تعديل قسم', [{ k: 'name', label: 'الاسم', value: d.name, req: 1 }], x => { d.name = x.name; save(); render(); }); }
    if (el.dataset.del) { e.stopPropagation(); const d = find(db.depts, el.dataset.del); return confirmDo(`حذف قسم ${d.name}؟`, () => { db.depts = db.depts.filter(x => x !== d); db.emps.forEach(m => m.deptId === d.id && (m.deptId = '')); save(); render(); }); }
    go('dept', { id: el.dataset.open, title: find(db.depts, el.dataset.open).name });
  };
}
function deptDetail() {
  const d = find(db.depts, ctx.id); if (!d) return go('departments');
  const staff = db.emps.filter(e => e.deptId === d.id);
  V.innerHTML = `<button class="btn back" data-go="departments">→ رجوع</button><div class="head"><h2>🏢 ${esc(d.name)}</h2><span class="grow"></span><button class="btn" onclick="print()">🖨 طباعة</button><button class="btn primary" id="addI">＋ معدة</button></div>
  <div class="tabs"><button class="${tab === 'items' ? 'on' : ''}" data-t="items">المعدات</button><button class="${tab === 'staff' ? 'on' : ''}" data-t="staff">الموظفون (${staff.length})</button></div>
  ${tab === 'items' ? `${search('البحث في المعدات...')}<div id="list"></div>` : `<div class="grid">${staff.map(e => `<div class="card click" data-emp="${e.id}"><h3>${esc(e.name)}</h3><div class="sub">${esc(e.title)}</div></div>`).join('') || '<div class="empty">لا يوجد موظفون</div>'}</div>`}`;
  V.onclick = e => { const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; deptDetail(); } const m = e.target.closest('[data-emp]'); if (m) go('emp', { id: m.dataset.emp, title: find(db.emps, m.dataset.emp).name }); };
  if (tab === 'items') { const draw = () => $('#list').innerHTML = itemRows(d.items, 'dept'); draw(); bindItems($('#list'), d.items, draw); bindSearch(draw); $('#addI').onclick = () => addItemBtn(d.items, draw); } else $('#addI').hidden = true;
}

function employees() {
  const list = db.emps.filter(e => !q || (e.name + e.title).toLowerCase().includes(q));
  V.innerHTML = `<div class="stats"><div class="card stat"><div class="ic">🪪</div><div><b>${db.emps.length}</b><small>الموظفون</small></div></div>
  <div class="card stat"><div class="ic">🤲</div><div><b>${db.emps.reduce((n, e) => n + e.custody.length, 0)}</b><small>عناصر العهدة</small></div></div></div>${search('البحث عن موظفين...')}
  <div class="grid">${list.map(e => `<div class="card click" data-open="${e.id}"><div class="corner"><button data-del="${e.id}">🗑</button></div><div class="avatar">${esc(e.name[0] || '؟')}</div>
  <h3>${esc(e.name)}</h3><div class="sub">${esc(e.title)} ${e.deptId && find(db.depts, e.deptId) ? '· ' + esc(find(db.depts, e.deptId).name) : ''}</div><div class="sub">${e.custody.length} عناصر عهدة</div></div>`).join('') || '<div class="empty">لا يوجد موظفون. اضغط "إضافة موظف"</div>'}</div>`;
  bindSearch(employees);
  V.onclick = e => {
    const el = e.target.closest('[data-del],[data-open]'); if (!el) return;
    if (el.dataset.del) { e.stopPropagation(); const m = find(db.emps, el.dataset.del); return confirmDo(`حذف ${m.name}؟`, () => { db.emps = db.emps.filter(x => x !== m); save(); render(); }); }
    go('emp', { id: el.dataset.open, title: find(db.emps, el.dataset.open).name });
  };
}
function empDetail() {
  const m = find(db.emps, ctx.id); if (!m) return go('employees');
  const dept = find(db.depts, m.deptId);
  const body = tab === 'history'
    ? (m.history.length ? `<div class="list">${m.history.slice().reverse().map(h => `<div class="row"><div class="info"><b>${esc(h.name)} × ${h.qty}</b><small>استلام: ${esc(h.from)} · إرجاع: ${esc(h.to)} ${h.note ? '· ' + esc(h.note) : ''}</small></div></div>`).join('')}</div>` : '<div class="empty">لا يوجد سجل</div>')
    : (m.custody.length ? `<div class="list">${m.custody.map(c => `<div class="row"><div class="info"><b>${esc(c.name)} × ${c.qty}</b><small>منذ ${esc(c.date)} ${c.note ? '· ' + esc(c.note) : ''}</small></div>
      <button class="btn sm" data-ret="${c.id}">↩ إرجاع</button></div>`).join('')}</div>` : '<div class="empty">لا توجد عهدة حالية</div>');
  V.innerHTML = `<button class="btn back" data-go="employees">→ رجوع</button><div class="head"><div class="avatar" style="margin:0">${esc(m.name[0])}</div><div><h2>${esc(m.name)}</h2><span class="sub">${esc(m.title)} ${dept ? '· ' + esc(dept.name) : ''}</span></div>
  <span class="grow"></span><button class="btn" onclick="print()">🖨 طباعة</button><button class="btn" id="edE">✏️ تعديل</button><button class="btn primary" id="addC">＋ عهدة</button></div>
  <div class="tabs"><button class="${tab !== 'history' ? 'on' : ''}" data-t="current">العهدة الحالية (${m.custody.length})</button><button class="${tab === 'history' ? 'on' : ''}" data-t="history">السجل (${m.history.length})</button></div>${body}`;
  V.onclick = e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; return empDetail(); }
    const r = e.target.closest('[data-ret]'); if (r) { const c = find(m.custody, r.dataset.ret); return form('إرجاع عهدة', [{ k: 'note', label: 'ملاحظات' }], d => { m.history.push({ name: c.name, qty: c.qty, from: c.date, to: today(), note: d.note }); m.custody = m.custody.filter(x => x !== c); save(); empDetail(); toast('تم الإرجاع'); }, 'إرجاع'); }
  };
  $('#addC').onclick = () => form('إضافة عهدة', [{ k: 'name', label: 'اسم العنصر', req: 1 }, { k: 'qty', label: 'الكمية', type: 'number', min: 1, value: 1 }, { k: 'date', label: 'تاريخ الاستلام', type: 'date', value: today() }, { k: 'note', label: 'ملاحظات' }],
    d => { m.custody.push({ id: uid(), name: d.name, qty: Math.max(1, +d.qty || 1), date: d.date, note: d.note }); save(); empDetail(); });
  $('#edE').onclick = () => form('تعديل موظف', empFields(m), d => { Object.assign(m, { name: d.name, title: d.title, deptId: d.deptId }); save(); render(); });
}
const empFields = (m = {}) => [{ k: 'name', label: 'الاسم', value: m.name, req: 1 }, { k: 'title', label: 'المسمى الوظيفي', value: m.title },
  { k: 'deptId', label: 'القسم', type: 'select', value: m.deptId || '', options: [['', '— بدون —'], ...db.depts.map(d => [d.id, d.name])] }];

/* ---------- التنبيهات والبحث العام ---------- */
function updAlerts() { const n = lowItems().length; $('#alertCount').textContent = n; $('#alertCount').hidden = !n; }
function alerts() {
  const l = lowItems();
  modal(`<h3>⚠️ التنبيهات (${l.length})</h3>${l.length ? `<div class="list">${l.map(({ i, where }) => `<div class="row ${status(i)}"><div class="info"><b>${esc(i.name)}</b><small>${esc(where)}</small></div><span class="chip ${status(i)}">${stLabel[status(i)]} · ${i.qty}</span></div>`).join('')}</div>` : '<div class="empty">لا توجد تنبيهات 🎉</div>'}
  <div class="actions"><button class="btn" data-close>إغلاق</button></div>`, true);
}
function globalSearch(v) {
  const box = $('#globalResults'); v = v.trim().toLowerCase(); if (!v) return box.hidden = true;
  const r = [];
  db.lockers.forEach(l => { if ((l.name + l.desc).toLowerCase().includes(v)) r.push(['خزانة', l.name, () => go('locker', { id: l.id, title: l.name })]); l.items.forEach(i => (i.name + i.desc).toLowerCase().includes(v) && r.push([l.name, i.name, () => go('locker', { id: l.id, title: l.name })])); });
  db.zones.forEach(z => z.areas.forEach(a => a.items.forEach(i => i.name.toLowerCase().includes(v) && r.push([`${z.name} / ${a.name}`, i.name, () => go('warehouse', { zone: z.id })]))));
  db.depts.forEach(d => (d.name.toLowerCase().includes(v)) && r.push(['قسم', d.name, () => go('dept', { id: d.id, title: d.name })]));
  db.emps.forEach(m => (m.name + m.title).toLowerCase().includes(v) && r.push(['موظف', m.name, () => go('emp', { id: m.id, title: m.name })]));
  box.hidden = false; box.innerHTML = r.slice(0, 12).map((x, n) => `<div data-n="${n}">${esc(x[1])}<small>${esc(x[0])}</small></div>`).join('') || '<div>لا نتائج</div>';
  box.onclick = e => { const d = e.target.closest('[data-n]'); if (d) { box.hidden = true; $('#globalSearch').value = ''; r[d.dataset.n][2](); } };
}

/* ---------- ربط عام ---------- */
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
$('#globalSearch').oninput = e => globalSearch(e.target.value);
$('#alertBtn').onclick = alerts;
$('#menuBtn').onclick = () => { $('#sidebar').classList.toggle('open'); $('#overlay').classList.toggle('show'); };
$('#overlay').onclick = () => { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); };
$('#addBtn').onclick = () => {
  if (page === 'lockers') form('إضافة خزانة', [{ k: 'name', label: 'الاسم', value: `خزانة #${db.lockers.length + 1}`, req: 1 }, { k: 'desc', label: 'الوصف' }], d => { db.lockers.push({ id: uid(), name: d.name, desc: d.desc, items: [] }); save(); render(); });
  else if (page === 'warehouse') form('إضافة منطقة', [{ k: 'name', label: 'الاسم', req: 1 }], d => { const z = { id: uid(), name: d.name, areas: [] }; db.zones.push(z); ctx.zone = z.id; save(); render(); });
  else if (page === 'departments') form('إضافة قسم', [{ k: 'name', label: 'الاسم', req: 1 }], d => { db.depts.push({ id: uid(), name: d.name, items: [] }); save(); render(); });
  else if (page === 'employees') form('إضافة موظف', empFields(), d => { db.emps.push({ id: uid(), name: d.name, title: d.title, deptId: d.deptId, custody: [], history: [] }); save(); render(); });
};
/* السمة */
const applyTheme = t => { document.documentElement.dataset.theme = t; $('#themeBtn').textContent = t === 'dark' ? '🌙' : '☀️'; try { localStorage.setItem('faby-theme', t); } catch { } };
$('#themeBtn').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
try { applyTheme(localStorage.getItem('faby-theme') || 'dark'); } catch { }
/* تصدير / استيراد */
$('#exportBtn').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })); a.download = `faby-keeper-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); };
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!d.lockers || !d.zones || !d.depts || !d.emps) throw 0; confirmDo('استبدال كل البيانات الحالية؟', () => { db = d; save(); render(); toast('تم الاستيراد'); }); } catch { toast('ملف غير صالح'); } e.target.value = ''; };

render();
