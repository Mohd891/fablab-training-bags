/* خادم وهمي داخل المتصفح: يستبدل API.request/upload ويحفظ البيانات في localStorage.
   يُحمَّل بعد api.js وقبل app.js. لا يحتاج أي backend. */
(function () {
  'use strict';
  var KEY = 'faby-mock-db-v1';
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var db;

  function seed() {
    return {
      seq: 100,
      user: { id: 1, username: 'manager', role: 'manager', active: 1, employee_id: null, department_id: null },
      users: [{ id: 1, username: 'manager', role: 'manager', active: 1, employee_id: null, department_id: null }],
      lockers: [{ id: 1, name: 'خزانة', description: 'أدوات وملحقات', image: null }, { id: 2, name: 'خزانة', description: 'مواد استهلاكية', image: null }],
      items: [
        { id: 1, locker_id: 1, name: 'شفرات قص', description: 'مقاس 9مم', qty: 40, min_stock: 10, image: null },
        { id: 2, locker_id: 1, name: 'مسطرة معدنية', description: '', qty: 3, min_stock: 5, image: null },
        { id: 3, locker_id: 2, name: 'ورق A4', description: 'علبة 500 ورقة', qty: 12, min_stock: 4, image: null }],
      zones: [{ id: 1, name: 'المنطقة A', location: 'الدور الأرضي', description: '', color: '#7b2ff7', image: null }],
      areas: [{ id: 1, zone_id: 1, name: 'رف 1', description: '', image: null }],
      wh_items: [{ id: 1, zone_id: 1, area_id: 1, name: 'ألواح MDF', description: '', qty: 20, min_stock: 5, condition: 'new', image: null }],
      depts: [{ id: 1, name: 'CNC / ليزر', manager: '', image: null }],
      dept_rows: [], // items + equipment (kind)
      covenant: [], dept_history: [], custody: [],
      employees: []
    };
  }
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (!db || !db.lockers) db = seed();
  var st;
  function save() { clearTimeout(st); st = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }, 100); }
  function nid() { return ++db.seq; }
  function by(arr, id) { id = Number(id); return arr.find(function (x) { return Number(x.id) === id; }); }
  function fail(msg, status) { var e = new Error(msg); e.status = status || 400; throw e; }
  function ok(v) { return JSON.parse(JSON.stringify(v === undefined ? { success: true } : v)); }
  function n(v, d) { v = Number(v); return isNaN(v) ? (d || 0) : v; }
  function pick(src, keys) { var o = {}; keys.forEach(function (k) { if (src[k] !== undefined) o[k] = src[k]; }); return o; }

  /* ---------- مساعدات العرض ---------- */
  function lockerView(l) {
    var its = db.items.filter(function (i) { return i.locker_id === l.id; });
    return Object.assign({}, l, { item_count: its.length, total_qty: its.reduce(function (s, i) { return s + i.qty; }, 0), low_stock_count: its.filter(function (i) { return i.qty <= i.min_stock; }).length });
  }
  function itemView(i) {
    var l = by(db.lockers, i.locker_id) || {};
    var c = db.custody.find(function (x) { return x.entity_type === 'locker_item' && x.entity_id === i.id && x.status === 'active'; });
    var o = Object.assign({}, i, { locker_name: l.name ? l.name + ' #' + l.id : '' });
    if (c) { o.custody_id = c.id; o.custody_emp_name = c.employee_name || ''; o.custody_dept_name = c.department_name || ''; o.custody_start = c.start_date; }
    return o;
  }
  function whItemView(i) {
    var z = by(db.zones, i.zone_id) || {}, a = by(db.areas, i.area_id) || {};
    return Object.assign({}, i, { zone_name: z.name || '', area_name: a.name || '' });
  }
  function zoneView(z) {
    var its = db.wh_items.filter(function (i) { return i.zone_id === z.id; });
    return Object.assign({}, z, { area_count: db.areas.filter(function (a) { return a.zone_id === z.id; }).length, item_count: its.length, total_qty: its.reduce(function (s, i) { return s + i.qty; }, 0), low_stock_count: its.filter(function (i) { return i.qty <= i.min_stock; }).length });
  }
  function empName(id) { var e = by(db.employees, id); return e ? e.name : ''; }
  function deptName(id) { var d = by(db.depts, id); return d ? d.name : ''; }
  function rowView(r) {
    var o = Object.assign({}, r);
    o.department_name = deptName(r.department_id);
    o.employee_name = r.employee_id ? empName(r.employee_id) : '';
    o.item_name = r.name; o.entity_type = r.kind === 'equipment' ? 'dept_equipment' : 'dept_item';
    return o;
  }
  function deptView(d, full) {
    var rows = db.dept_rows.filter(function (r) { return r.department_id === d.id; });
    var o = Object.assign({}, d, { item_count: rows.length, employee_count: db.employees.filter(function (e) { return e.department_id === d.id; }).length });
    if (full) {
      o.items = rows.filter(function (r) { return r.kind === 'item'; }).map(rowView);
      o.equipment = rows.filter(function (r) { return r.kind === 'equipment'; }).map(rowView);
      o.history = db.dept_history.filter(function (h) { return h.department_id === d.id; }).map(function (h) { return Object.assign({}, h, { employee_name: empName(h.employee_id) }); });
      var inc = db.dept_rows.filter(function (r) { return r.department_id !== d.id && r.custody_dept_id === d.id; }).map(rowView);
      o.incoming_items = inc.filter(function (r) { return r.kind === 'item'; });
      o.incoming_equipment = inc.filter(function (r) { return r.kind === 'equipment'; });
      o.incoming_storage = [];
    }
    return o;
  }
  function empView(e, full) {
    var o = Object.assign({}, e, { department_name: deptName(e.department_id) });
    var mine = db.dept_rows.filter(function (r) { return r.employee_id === e.id; }).map(rowView);
    var cust = db.custody.filter(function (c) { return c.employee_id === e.id && c.status === 'active'; });
    o.item_count = mine.length + cust.length;
    if (full) {
      o.items = mine.concat(cust.map(function (c) {
        var src = c.entity_type === 'warehouse_item' ? by(db.wh_items, c.entity_id) : by(db.items, c.entity_id);
        src = src || {};
        return Object.assign({}, c, { item_name: src.name || '', name: src.name || '', description: src.description || '', image: src.image || null, qty: c.qty || 1, receipt_date: c.start_date, covenant_status: 'active', condition: src.condition || 'new' });
      }));
      o.incoming_storage_items = [];
      o.custody_history = db.covenant.filter(function (c) { return c.employee_id === e.id; });
    }
    return o;
  }
  function allItemsFlat() { return db.items.map(itemView); }

  /* ---------- جدول المسارات ---------- */
  var routes = [];
  function R(method, pattern, fn) { routes.push({ method: method, rx: new RegExp('^' + pattern.replace(/:id/g, '(\\d+)').replace(/:id2/g, '(\\d+)') + '$'), fn: fn }); }

  // auth
  R('GET', '/auth/me', function () { return { user: db.user }; });
  R('POST', '/auth/logout', function () { return {}; });
  R('PUT', '/auth/password', function () { return {}; });
  // users
  R('GET', '/users', function () { return db.users.map(function (u) { return Object.assign({}, u, { employee_name: empName(u.employee_id), department_name: deptName(u.department_id) }); }); });
  R('POST', '/users', function (m, b) { var u = Object.assign({ id: nid(), active: 1, role: 'employee' }, pick(b, ['username', 'role', 'active', 'employee_id', 'department_id'])); db.users.push(u); return u; });
  R('PUT', '/users/:id', function (m, b) { var u = by(db.users, m[1]); Object.assign(u, pick(b, ['username', 'role', 'active', 'employee_id', 'department_id'])); return u; });
  R('POST', '/users/:id/password', function () { return {}; });
  R('DELETE', '/users/:id', function (m) { db.users = db.users.filter(function (u) { return u.id !== n(m[1]); }); return {}; });
  // lockers
  R('GET', '/lockers', function () { return db.lockers.map(lockerView); });
  R('GET', '/lockers/:id', function (m) { var l = by(db.lockers, m[1]); if (!l) fail('Not found', 404); return Object.assign({}, l, { items: db.items.filter(function (i) { return i.locker_id === l.id; }).map(itemView) }); });
  R('POST', '/lockers', function (m, b) { var l = { id: nid(), name: b.name || '', description: b.description || '', image: null }; db.lockers.push(l); return l; });
  R('PUT', '/lockers/:id', function (m, b) { var l = by(db.lockers, m[1]); Object.assign(l, pick(b, ['name', 'description'])); return l; });
  R('DELETE', '/lockers/:id', function (m) { var id = n(m[1]); db.lockers = db.lockers.filter(function (l) { return l.id !== id; }); db.items = db.items.filter(function (i) { return i.locker_id !== id; }); return {}; });
  // locker items
  R('GET', '/items', function () { return allItemsFlat(); });
  R('GET', '/items/:id', function (m) { var i = by(db.items, m[1]); if (!i) fail('Not found', 404); return itemView(i); });
  R('POST', '/items/locker/:id', function (m, b) { var i = { id: nid(), locker_id: n(m[1]), name: b.name || '', description: b.description || '', qty: n(b.qty), min_stock: n(b.min_stock), image: null }; db.items.push(i); return i; });
  R('PUT', '/items/:id', function (m, b) { var i = by(db.items, m[1]); Object.assign(i, pick(b, ['name', 'description', 'qty', 'min_stock', 'locker_id'])); return itemView(i); });
  R('PATCH', '/items/:id/qty', function (m, b) { var i = by(db.items, m[1]); i.qty = Math.max(0, i.qty + n(b.delta)); return itemView(i); });
  R('PATCH', '/items/:id/move', function (m, b) { var i = by(db.items, m[1]); i.locker_id = n(b.locker_id); return itemView(i); });
  R('DELETE', '/items/:id', function (m) { var id = n(m[1]); db.items = db.items.filter(function (i) { return i.id !== id; }); return {}; });
  // alerts / search
  function alerts() {
    var out = [];
    db.items.forEach(function (i) { if (i.qty <= i.min_stock) { var l = by(db.lockers, i.locker_id) || {}; out.push(Object.assign({}, itemView(i), { locker_id: i.locker_id, locker_name: l.name ? l.name + ' #' + l.id : '' })); } });
    return out;
  }
  R('GET', '/alerts', function () { return alerts(); });
  R('GET', '/alerts/summary', function () { var a = alerts(); var s = {}; a.forEach(function (i) { s[i.locker_id] = 1; }); return { total_alerts: a.length, lockers_affected: Object.keys(s).length }; });
  R('GET', '/search\\?q=(.*)', function (m) {
    var q = decodeURIComponent(m[1]).toLowerCase(); var has = function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; };
    return {
      lockers: db.lockers.filter(function (l) { return has(l.name) || has(l.description); }),
      items: db.items.filter(function (i) { return has(i.name) || has(i.description); }).map(itemView),
      zones: db.zones.filter(function (z) { return has(z.name) || has(z.location); }),
      areas: db.areas.filter(function (a) { return has(a.name); }).map(function (a) { return Object.assign({}, a, { zone_name: (by(db.zones, a.zone_id) || {}).name }); }),
      warehouse_items: db.wh_items.filter(function (i) { return has(i.name); }).map(whItemView),
      departments: db.depts.filter(function (d) { return has(d.name); }),
      employees: db.employees.filter(function (e) { return has(e.name) || has(e.job_title); }).map(function (e) { return empView(e); })
    };
  });
  // warehouse
  R('GET', '/warehouse', function () { return db.zones.map(zoneView); });
  R('GET', '/warehouse/:id', function (m) { var z = by(db.zones, m[1]); if (!z) fail('Not found', 404); return Object.assign(zoneView(z), { areas: db.areas.filter(function (a) { return a.zone_id === z.id; }).map(function (a) { return Object.assign({}, a, { items: db.wh_items.filter(function (i) { return i.area_id === a.id; }).map(whItemView) }); }), items: db.wh_items.filter(function (i) { return i.zone_id === z.id && !i.area_id; }).map(whItemView) }); });
  R('POST', '/warehouse', function (m, b) { var z = { id: nid(), name: b.name || '', location: b.location || '', description: b.description || '', color: b.color || '#7b2ff7', image: null }; db.zones.push(z); return z; });
  R('PUT', '/warehouse/:id', function (m, b) { var z = by(db.zones, m[1]); Object.assign(z, pick(b, ['name', 'location', 'description', 'color'])); return z; });
  R('DELETE', '/warehouse/:id', function (m) { var id = n(m[1]); db.zones = db.zones.filter(function (z) { return z.id !== id; }); db.areas = db.areas.filter(function (a) { return a.zone_id !== id; }); db.wh_items = db.wh_items.filter(function (i) { return i.zone_id !== id; }); return {}; });
  R('GET', '/warehouse/:id/areas', function (m) { return db.areas.filter(function (a) { return a.zone_id === n(m[1]); }); });
  R('POST', '/warehouse/:id/areas', function (m, b) { var a = { id: nid(), zone_id: n(m[1]), name: b.name || '', description: b.description || '', image: null }; db.areas.push(a); return a; });
  R('PUT', '/warehouse/areas/:id', function (m, b) { var a = by(db.areas, m[1]); Object.assign(a, pick(b, ['name', 'description'])); return a; });
  R('DELETE', '/warehouse/areas/:id', function (m) { var id = n(m[1]); db.areas = db.areas.filter(function (a) { return a.id !== id; }); db.wh_items = db.wh_items.filter(function (i) { return i.area_id !== id; }); return {}; });
  R('GET', '/warehouse/items/:id', function (m) { var i = by(db.wh_items, m[1]); if (!i) fail('Not found', 404); return whItemView(i); });
  R('POST', '/warehouse/:id/items', function (m, b) { var i = { id: nid(), zone_id: n(m[1]), area_id: b.area_id ? n(b.area_id) : null, name: b.name || '', description: b.description || '', qty: n(b.qty, 1), min_stock: n(b.min_stock), condition: b.condition || 'new', purpose: b.purpose || '', image: null }; db.wh_items.push(i); return whItemView(i); });
  R('PUT', '/warehouse/items/:id', function (m, b) { var i = by(db.wh_items, m[1]); Object.assign(i, pick(b, ['name', 'description', 'qty', 'min_stock', 'condition', 'purpose', 'area_id', 'zone_id'])); return whItemView(i); });
  R('DELETE', '/warehouse/items/:id', function (m) { var id = n(m[1]); db.wh_items = db.wh_items.filter(function (i) { return i.id !== id; }); return {}; });
  R('PATCH', '/warehouse/items/:id/transfer', function (m, b) { var i = by(db.wh_items, m[1]); if (b.zone_id) i.zone_id = n(b.zone_id); i.area_id = b.area_id ? n(b.area_id) : null; return whItemView(i); });
  // departments
  R('GET', '/departments', function () { return db.depts.map(function (d) { return deptView(d); }); });
  R('GET', '/departments/:id', function (m) { var d = by(db.depts, m[1]); if (!d) fail('Not found', 404); return deptView(d, true); });
  R('POST', '/departments', function (m, b) { var d = { id: nid(), name: b.name || '', manager: b.manager || '', image: null }; db.depts.push(d); return d; });
  R('PUT', '/departments/:id', function (m, b) { var d = by(db.depts, m[1]); Object.assign(d, pick(b, ['name', 'manager'])); return d; });
  R('DELETE', '/departments/:id', function (m) { var id = n(m[1]); db.depts = db.depts.filter(function (d) { return d.id !== id; }); db.dept_rows = db.dept_rows.filter(function (r) { return r.department_id !== id; }); db.employees.forEach(function (e) { if (e.department_id === id) e.department_id = null; }); return {}; });
  // dept items & equipment (جدول واحد مع kind)
  function rowsRoute(base, kind, listPath) {
    R('GET', '/departments/:id/' + listPath, function (m) { return db.dept_rows.filter(function (r) { return r.department_id === n(m[1]) && r.kind === kind; }).map(rowView); });
    R('POST', '/departments/:id/' + listPath, function (m, b) { var r = Object.assign({ id: nid(), kind: kind, department_id: n(m[1]), name: '', description: '', purpose: '', qty: 1, condition: 'new', image: null, employee_id: null, custody_dept_id: null, receipt_date: today(), status: 'active' }, pick(b, ['name', 'description', 'purpose', 'qty', 'condition'])); r.qty = n(r.qty, 1); db.dept_rows.push(r); return rowView(r); });
    R('PUT', '/departments/' + base + '/:id', function (m, b) { var r = by(db.dept_rows, m[1]); Object.assign(r, pick(b, ['name', 'description', 'purpose', 'qty', 'condition', 'employee_id', 'status'])); return rowView(r); });
    R('DELETE', '/departments/' + base + '/:id', function (m) { var id = n(m[1]); db.dept_rows = db.dept_rows.filter(function (r) { return r.id !== id; }); return {}; });
    R('POST', '/departments/' + base + '/:id/move-custody', function (m, b) { var r = by(db.dept_rows, m[1]); r.employee_id = b.employee_id ? n(b.employee_id) : null; r.custody_dept_id = b.department_id ? n(b.department_id) : null; r.receipt_date = b.receipt_date || today(); db.covenant.push({ id: nid(), item_id: r.id, entity_type: r.kind === 'equipment' ? 'dept_equipment' : 'dept_item', employee_id: r.employee_id, start_date: r.receipt_date, status: 'active', notes: b.notes || '', item_name: r.name }); return rowView(r); });
    R('POST', '/departments/' + base + '/:id/return-custody', function (m, b) { var r = by(db.dept_rows, m[1]); db.covenant.forEach(function (c) { if (c.item_id === r.id && c.status === 'active') { c.status = 'returned'; c.end_date = today(); c.return_notes = (b && b.notes) || ''; } }); r.employee_id = null; r.custody_dept_id = null; return rowView(r); });
    R('POST', '/departments/' + base + '/:id/transfer-record', function (m, b) { var r = by(db.dept_rows, m[1]); if (b.department_id) r.department_id = n(b.department_id); if (b.kind) r.kind = b.kind === 'equipment' ? 'equipment' : 'item'; return rowView(r); });
    R('GET', '/departments/' + base + '/:id/covenant', function (m) { return db.covenant.filter(function (c) { return c.item_id === n(m[1]) && c.entity_type === (kind === 'equipment' ? 'dept_equipment' : 'dept_item'); }).map(function (c) { return Object.assign({}, c, { employee_name: empName(c.employee_id) }); }); });
    R('POST', '/departments/' + base + '/:id/covenant', function (m, b) { var r = by(db.dept_rows, m[1]); var c = Object.assign({ id: nid(), item_id: r.id, entity_type: kind === 'equipment' ? 'dept_equipment' : 'dept_item', status: 'active', start_date: today(), item_name: r.name }, pick(b, ['employee_id', 'start_date', 'end_date', 'notes', 'status'])); db.covenant.push(c); return c; });
  }
  rowsRoute('items', 'item', 'items');
  rowsRoute('equipment', 'equipment', 'equipment');
  R('PUT', '/departments/covenant/:id', function (m, b) { var c = by(db.covenant, m[1]); Object.assign(c, b); return c; });
  R('DELETE', '/departments/covenant/:id', function (m) { var id = n(m[1]); db.covenant = db.covenant.filter(function (c) { return c.id !== id; }); return {}; });
  R('GET', '/departments/:id/history', function (m) { return db.dept_history.filter(function (h) { return h.department_id === n(m[1]); }).map(function (h) { return Object.assign({}, h, { employee_name: empName(h.employee_id) }); }); });
  R('POST', '/departments/:id/history', function (m, b) { var h = Object.assign({ id: nid(), department_id: n(m[1]), status: 'active' }, pick(b, ['employee_id', 'start_date', 'end_date', 'status', 'notes'])); db.dept_history.push(h); return h; });
  R('PUT', '/departments/history/:id', function (m, b) { var h = by(db.dept_history, m[1]); Object.assign(h, pick(b, ['employee_id', 'start_date', 'end_date', 'status', 'notes'])); return h; });
  R('DELETE', '/departments/history/:id', function (m) { var id = n(m[1]); db.dept_history = db.dept_history.filter(function (h) { return h.id !== id; }); return {}; });
  // employees
  R('GET', '/employees', function () { return db.employees.map(function (e) { return empView(e); }); });
  R('GET', '/employees/:id', function (m) { var e = by(db.employees, m[1]); if (!e) fail('Not found', 404); return empView(e, true); });
  R('POST', '/employees', function (m, b) { var e = { id: nid(), name: b.name || '', job_title: b.job_title || '', department_id: b.department_id ? n(b.department_id) : null, photo: null }; db.employees.push(e); return e; });
  R('PUT', '/employees/:id', function (m, b) { var e = by(db.employees, m[1]); Object.assign(e, pick(b, ['name', 'job_title'])); if (b.department_id !== undefined) e.department_id = b.department_id ? n(b.department_id) : null; return e; });
  R('DELETE', '/employees/:id', function (m) { var id = n(m[1]); db.employees = db.employees.filter(function (e) { return e.id !== id; }); db.dept_rows.forEach(function (r) { if (r.employee_id === id) r.employee_id = null; }); return {}; });
  R('POST', '/employees/:id/items', function (m, b) { var e = by(db.employees, m[1]); var r = Object.assign({ id: nid(), kind: 'item', department_id: e.department_id, name: '', description: '', purpose: '', qty: 1, condition: 'new', image: null, employee_id: e.id, custody_dept_id: null, receipt_date: today(), status: 'active' }, pick(b, ['name', 'description', 'purpose', 'qty', 'condition', 'receipt_date'])); r.qty = n(r.qty, 1); db.dept_rows.push(r); return rowView(r); });
  // custody لعناصر الخزائن والمستودع
  ['items:locker_item', 'warehouse/items:warehouse_item'].forEach(function (p) {
    var base = p.split(':')[0], type = p.split(':')[1];
    R('GET', '/' + base + '/:id/custody', function (m) { return db.custody.filter(function (c) { return c.entity_type === type && c.entity_id === n(m[1]); }); });
    R('POST', '/' + base + '/:id/custody', function (m, b) { var c = { id: nid(), entity_type: type, entity_id: n(m[1]), status: 'active', start_date: b.start_date || today(), employee_id: b.employee_id ? n(b.employee_id) : null, department_id: b.department_id ? n(b.department_id) : null, notes: b.notes || '' }; c.employee_name = empName(c.employee_id); c.department_name = deptName(c.department_id); db.custody.push(c); return c; });
    function ret(m, b) { db.custody.forEach(function (c) { if (c.entity_type === type && c.entity_id === n(m[1]) && c.status === 'active') { c.status = 'returned'; c.end_date = today(); } }); return {}; }
    R('POST', '/' + base + '/:id/custody/return', ret);
    R('POST', '/' + base + '/:id/custody/return-to', ret);
    R('PATCH', '/' + base + '/:id/custody', function (m, b) { db.custody.forEach(function (c) { if (c.entity_type === type && c.entity_id === n(m[1]) && c.status === 'active') Object.assign(c, pick(b, ['notes', 'start_date'])); }); return {}; });
  });
  R('POST', '/warehouse/zones/:id/transfer', function () { return {}; });
  R('POST', '/warehouse/areas/:id/transfer', function () { return {}; });

  /* ---------- ربط بـ API ---------- */
  function handle(method, url, body) {
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i]; if (r.method !== method) continue;
      var m = url.match(r.rx); if (!m) continue;
      var out = r.fn(m, body || {}); save(); return ok(out);
    }
    fail('Not implemented: ' + method + ' ' + url, 501);
  }
  API.request = function (method, url, body) {
    return new Promise(function (res, rej) {
      try { res(handle(method, url, body)); } catch (e) { rej(e); }
    });
  };
  /* رفع الصور: نصغّرها ونخزنها كـ data URL (تبقى خفيفة) */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('read failed')); };
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 480, s = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = function () { rej(new Error('bad image')); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  API.upload = function (url, file) {
    var m = url.match(/^\/([a-z\/]+?)\/(\d+)\/(image|photo)$/);
    if (!m) return Promise.reject(new Error('Not implemented upload ' + url));
    var map = { lockers: ['lockers', 'image'], items: ['items', 'image'], 'warehouse': ['zones', 'image'], 'warehouse/areas': ['areas', 'image'], 'warehouse/items': ['wh_items', 'image'], departments: ['depts', 'image'], 'departments/items': ['dept_rows', 'image'], 'departments/equipment': ['dept_rows', 'image'], employees: ['employees', 'photo'] };
    var t = map[m[1]]; if (!t) return Promise.reject(new Error('Not implemented upload ' + url));
    return shrink(file).then(function (data) { var row = by(db[t[0]], m[2]); if (!row) throw new Error('Not found'); row[t[1]] = data; save(); return ok({ image: data, photo: data, url: data }); });
  };
  window.MOCK_DB_RESET = function () { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); };
})();
