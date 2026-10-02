/* 워독스 데미지 랩 · 화면 로직 */
(function () {
  'use strict';

  var D = window.WD_DATA;
  var I = window.WD_I18N;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var byId = function (list, key) {
    var map = {};
    list.forEach(function (item) { map[item[key || 'id']] = item; });
    return map;
  };

  var ZONES = byId(D.zones);
  var GROUPS = byId(D.zoneGroups);
  var CLASSES = byId(D.classes);
  var WEAPONS = byId(D.weapons);
  var AMMO = byId(D.ammo);
  var LANGS = byId(I.langs);
  var CALC_CLASSES = ['ar', 'smg', 'lmg', 'dmr', 'sniper', 'shotgun', 'pistol', 'bow'];
  var CLASS_ROWS = [
    { ids: ['ar'] },
    { ids: ['smg', 'pistol'], key: 'crow.smgPistol' },
    { ids: ['lmg'] },
    { ids: ['dmr'] },
    { ids: ['sniper'] },
    { ids: ['shotgun'], key: 'crow.shotgun' },
    { ids: ['bow'] }
  ];

  /* ───────── 언어 ───────── */

  function detectLang() {
    try {
      var saved = localStorage.getItem('wd-lang');
      if (saved && I.strings[saved]) return saved;
    } catch (e) { /* 저장소를 못 쓰면 브라우저 언어로 */ }
    var nav = String((navigator.languages && navigator.languages[0]) || navigator.language || I.fallback).toLowerCase();
    if (nav.indexOf('ko') === 0) return 'ko';
    if (nav.indexOf('ja') === 0) return 'ja';
    if (nav.indexOf('zh') === 0) return /(tw|hk|mo|hant)/.test(nav) ? 'zh-Hant' : 'zh-Hans';
    if (nav.indexOf('en') === 0) return 'en';
    return 'en';
  }

  var lang = detectLang();

  // 화면 문구. vars.n이 1이면 _one 단수형을 먼저 찾는다
  function t(key, vars) {
    var dict = I.strings[lang] || I.strings[I.fallback];
    var s = vars && vars.n === 1 && dict[key + '_one'] != null ? dict[key + '_one'] : dict[key];
    if (s == null) s = I.strings[I.fallback][key];
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }

  // 데이터의 다국어 값
  function tx(v) {
    if (v && typeof v === 'object') return v[lang] || v.en || v[I.fallback];
    return v == null ? '' : v;
  }

  var zoneName = function (id) { return tx(ZONES[id].name); };
  var groupName = function (id) { return tx(GROUPS[id].name); };
  var className = function (id) { return tx(CLASSES[id].name); };
  var fireName = function (w) { return t('fire.' + w.fire); };
  var armorName = function (g) { return g.lvl ? t('armorName', { n: g.lvl }) : t('noArmor'); };
  var helmetName = function (g) { return g.lvl ? t('helmetName', { n: g.lvl }) : t('noHelmet'); };
  var gearShort = function (g) { return g.lvl ? g.short : t('none'); };
  var shots = function (n) { return t('shots', { n: n }); };

  /* ───────── 계산 ───────── */

  // 무기 종류별 배율 × 부위 비율
  function zoneMult(w, zoneId) {
    var z = ZONES[zoneId];
    return D.classMults[w.cls][z.group] * z.k;
  }

  function isEstZone(w, zoneId) {
    var est = D.classMults[w.cls].est || [];
    return est.indexOf(ZONES[zoneId].group) >= 0;
  }

  // 무기마다 쓸 수 있는 탄종 (산탄총·활은 일반 탄만)
  function ammoFor(w, ammoId) {
    return w.ammo === false ? AMMO.fmj : AMMO[ammoId];
  }

  // 한 부위에 한 발(산탄은 전 펠릿) 맞았을 때의 피해와 그 부위를 막은 방어구
  function hit(w, zoneId, ammo, armor, helmet) {
    var guard = helmet.covers.indexOf(zoneId) >= 0 ? helmet
      : armor.covers.indexOf(zoneId) >= 0 ? armor : null;
    var a = ammoFor(w, ammo.id);
    var base = w.dmg * (w.pellets || 1) * zoneMult(w, zoneId);
    var dmg = guard ? base * a.armored * (1 - guard.reduction) : base * a.flesh;
    return { dmg: dmg, guard: guard, guardName: guard ? (guard === helmet ? helmetName(guard) : armorName(guard)) : null };
  }

  function shotsToKill(dmg) {
    return dmg > 0 ? Math.ceil(D.hp / dmg - 1e-9) : Infinity;
  }

  // 실측 연사 속도가 있으면 그 값을 쓴다
  function rpmOf(w) { return w.rpmM || w.rpm || null; }

  // 첫 발부터 마지막 발까지 걸리는 시간 (ms)
  function timeToKill(w, n) {
    var rpm = rpmOf(w);
    if (!rpm || !isFinite(n)) return null;
    return Math.round((n - 1) * 60000 / rpm);
  }

  function kClass(n) {
    if (n <= 1) return 'k1';
    if (n === 2) return 'k2';
    if (n === 3) return 'k3';
    if (n <= 5) return 'k4';
    return 'k6';
  }

  // 폭심 거리별 피해: 최대 피해 반경까지 유지, 반경 끝(edge)까지 직선 감소
  function blastDamage(x, d) {
    var full = x.full || 0;
    var edge = x.edge || 0;
    if (d <= full) return x.dmg;
    if (d > x.radius) return 0;
    return x.dmg - (x.dmg - edge) * (d - full) / (x.radius - full);
  }

  var fmt1 = function (n) { return (Math.round(n * 10) / 10).toFixed(1); };
  var fmt2 = function (n) { return (Math.round(n * 100) / 100).toFixed(2); };
  var money = function (n) { return n == null ? '—' : n === 0 ? t('free') : '$' + n.toLocaleString('en-US'); };
  var kg = function (n) { return n == null ? '—' : n.toFixed(1) + ' kg'; };
  var ms = function (n) { return n == null ? '—' : n === 0 ? t('instant') : t('sec', { n: (n / 1000).toFixed(2) }); };
  var pct = function (r) { return r ? '−' + Math.round(r * 100) + '%' : '0%'; };
  var num = function (n) { return n == null ? '—' : n.toLocaleString('en-US'); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var usable = function (w) { return w.dmg != null && !w.explosive; };
  var baseLabel = function (w) { return w.pellets ? w.dmg + '×' + w.pellets : String(w.dmg); };
  var measuredCount = D.weapons.reduce(function (sum, w) { return sum + (w.measured ? Object.keys(w.measured).length : 0); }, 0);

  /* ───────── 인체 도식 ───────── */

  var SHAPES = {
    head: [{ t: 'ellipse', cx: 120, cy: 42, rx: 25, ry: 29 }],
    neck: [{ x: 109, y: 74, w: 22, h: 16, r: 6 }],
    upperTorso: [{ x: 84, y: 94, w: 72, h: 52, r: 18 }],
    torso: [{ x: 86, y: 150, w: 68, h: 40, r: 10 }],
    lowerTorso: [{ x: 88, y: 194, w: 64, h: 34, r: 10 }],
    pelvis: [{ x: 86, y: 232, w: 68, h: 36, r: 14 }],
    shoulder: [{ x: 50, y: 96, w: 30, h: 72, r: 14 }, { x: 160, y: 96, w: 30, h: 72, r: 14 }],
    forearm: [{ x: 46, y: 172, w: 28, h: 70, r: 13 }, { x: 166, y: 172, w: 28, h: 70, r: 13 }],
    hand: [{ x: 46, y: 246, w: 28, h: 30, r: 12 }, { x: 166, y: 246, w: 28, h: 30, r: 12 }],
    thigh: [{ x: 88, y: 272, w: 31, h: 88, r: 14 }, { x: 121, y: 272, w: 31, h: 88, r: 14 }],
    shin: [{ x: 90, y: 364, w: 28, h: 80, r: 12 }, { x: 122, y: 364, w: 28, h: 80, r: 12 }],
    foot: [{ x: 84, y: 448, w: 34, h: 22, r: 10 }, { x: 122, y: 448, w: 34, h: 22, r: 10 }]
  };

  function shapeTag(s, cls, grow, title) {
    var g = grow || 0;
    var inner = title ? '<title>' + esc(title) + '</title>' : '';
    if (s.t === 'ellipse') {
      return '<ellipse class="' + cls + '" cx="' + s.cx + '" cy="' + s.cy + '" rx="' + (s.rx + g) + '" ry="' + (s.ry + g) + '">' + inner + '</ellipse>';
    }
    return '<rect class="' + cls + '" x="' + (s.x - g) + '" y="' + (s.y - g) + '" width="' + (s.w + g * 2) + '" height="' + (s.h + g * 2) + '" rx="' + (s.r + g) + '">' + inner + '</rect>';
  }

  function center(s) {
    return s.t === 'ellipse' ? [s.cx, s.cy] : [s.x + s.w / 2, s.y + s.h / 2];
  }

  /*
   * opts.fill    { zoneId: 'k1'..'k6' | 'is-hl' }
   * opts.label   { zoneId: 3 }
   * opts.outline [zoneId] 방어구 보호 부위 점선
   */
  function bodySVG(opts, title) {
    var fill = opts.fill || {};
    var label = opts.label || {};
    var outline = opts.outline || [];
    var parts = [], outlines = [], texts = [];

    Object.keys(SHAPES).forEach(function (id) {
      var cls = fill[id] || '';
      var tip = zoneName(id) + (label[id] != null ? ' · ' + shots(label[id]) : '');
      SHAPES[id].forEach(function (s) {
        parts.push(shapeTag(s, ('z ' + cls).trim(), 0, tip));
        if (outline.indexOf(id) >= 0) outlines.push(shapeTag(s, 'armor-outline', 3));
        if (label[id] != null) {
          var c = center(s);
          var tone = (cls === 'k1' || cls === 'k6') ? 'zt zt--light' : 'zt zt--dark';
          texts.push('<text class="' + tone + '" x="' + c[0] + '" y="' + c[1] + '">' + esc(label[id]) + '</text>');
        }
      });
    });

    return '<svg class="body-svg" viewBox="0 0 240 476" role="img" aria-label="' + esc(title || t('fig.default')) + '">' +
      parts.join('') + outlines.join('') + texts.join('') + '</svg>';
  }

  /* ───────── 상태 ───────── */

  var state = { cls: 'ar', weapon: 'm4', ammo: 'fmj', armor: 2, helmet: 1 };
  var matrixState = { ammo: 'fmj', metric: 'stk' };
  var listState = { q: '', cls: 'all' };
  var compareKind = 'armor';
  var blastState = { src: 'c4', d: 3 };

  try {
    var saved = JSON.parse(localStorage.getItem('wd-calc') || 'null');
    if (saved && WEAPONS[saved.weapon] && usable(WEAPONS[saved.weapon]) && AMMO[saved.ammo]) {
      state = {
        cls: WEAPONS[saved.weapon].cls,
        weapon: saved.weapon,
        ammo: saved.ammo,
        armor: Math.min(4, Math.max(0, saved.armor | 0)),
        helmet: Math.min(4, Math.max(0, saved.helmet | 0))
      };
    }
  } catch (e) { /* 저장소를 못 쓰면 기본값으로 시작 */ }

  function save() {
    try { localStorage.setItem('wd-calc', JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  /* ───────── 공통 위젯 ───────── */

  function segment(el, items, current, onPick, role) {
    el.innerHTML = items.map(function (it) {
      var on = it.id === current;
      return '<button type="button" role="' + (role || 'radio') + '" aria-' + (role === 'tab' ? 'selected' : 'checked') + '="' + on + '"' +
        (it.disabled ? ' disabled' : '') + ' class="' + (on ? 'is-on' : '') + '" data-id="' + esc(it.id) + '">' + esc(it.label) + '</button>';
    }).join('');
    el.onclick = function (e) {
      var b = e.target.closest('button[data-id]');
      if (b && !b.disabled) onPick(b.getAttribute('data-id'));
    };
  }

  function legendHTML(withArmor) {
    var items = [['k1', shots(1)], ['k2', shots(2)], ['k3', shots(3)], ['k4', t('legend.k45')], ['k6', t('legend.k6')]];
    var html = items.map(function (it) {
      return '<span class="lg"><i class="' + it[0] + '"></i>' + esc(it[1]) + '</span>';
    }).join('');
    if (withArmor) html += '<span class="lg lg--armor"><i></i>' + esc(t('legend.armor')) + '</span>';
    return html;
  }

  /* ───────── 언어 선택 바 / 고정 문구 ───────── */

  function renderLangBar() {
    $('#lang-list').innerHTML = I.langs.map(function (l) {
      var on = l.id === lang;
      return '<button type="button" class="langbtn' + (on ? ' is-on' : '') + '" role="radio" aria-checked="' + on + '" data-lang="' + l.id + '" lang="' + l.id + '" title="' + esc(l.name) + '">' +
        '<span class="flag">' + l.flag + '</span>' +
        '<span class="langbtn__full">' + esc(l.name) + '</span><span class="langbtn__short">' + esc(l.short) + '</span></button>';
    }).join('');
  }

  function loadFont(l) {
    var meta = LANGS[l];
    if (!meta || !meta.font || document.getElementById('font-' + l)) return;
    var link = document.createElement('link');
    link.id = 'font-' + l;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + meta.font + ':wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));

    $$('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });

    $('#ribbon').innerHTML = t('ribbon', { version: esc(tx(D.version)), count: measuredCount });
    $('#hero2-cover').textContent = zoneName('head') + ' + ' + zoneName('neck');
    var open = $('#gnav-links').classList.contains('is-open');
    $('#gnav-menu').setAttribute('aria-label', t(open ? 'nav.close' : 'nav.open'));
  }

  function setLang(id) {
    if (!I.strings[id] || id === lang) return;
    lang = id;
    try { localStorage.setItem('wd-lang', id); } catch (e) { /* 무시 */ }
    loadFont(id);
    applyStatic();
    renderAll();
  }

  /* ───────── 계산기 ───────── */

  function renderCalc() {
    var w = WEAPONS[state.weapon];
    var ammo = ammoFor(w, state.ammo);
    var armor = D.armor[state.armor];
    var helmet = D.helmets[state.helmet];

    // 분류
    segment($('#calc-class'), CALC_CLASSES.map(function (id) {
      return { id: id, label: className(id) };
    }), state.cls, function (id) {
      state.cls = id;
      if (WEAPONS[state.weapon].cls !== id) {
        var first = D.weapons.filter(function (x) { return x.cls === id && usable(x); })[0];
        if (first) state.weapon = first.id;
      }
      renderCalc();
    }, 'tab');

    // 무기 칩
    var list = D.weapons.filter(function (x) { return x.cls === state.cls; });
    $('#calc-weapons').innerHTML = list.map(function (x) {
      var rpm = rpmOf(x);
      var meta = t('calc.base', { v: baseLabel(x) }) + (rpm ? ' · ' + num(rpm) + ' RPM' : '');
      return '<button type="button" class="chip' + (x.id === state.weapon ? ' is-on' : '') + '" data-id="' + x.id + '" aria-pressed="' + (x.id === state.weapon) + '">' +
        '<span class="chip__name">' + esc(x.name) + '</span>' +
        '<span class="chip__meta">' + esc(meta) + '</span></button>';
    }).join('');
    $('#calc-weapons').onclick = function (e) {
      var b = e.target.closest('button[data-id]');
      if (b) { state.weapon = b.getAttribute('data-id'); renderCalc(); }
    };

    // 탄종
    var locked = w.ammo === false;
    $('#calc-ammo').innerHTML = D.ammo.map(function (a) {
      var on = a.id === ammo.id;
      var off = locked && a.id !== 'fmj';
      return '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-id="' + a.id + '" aria-pressed="' + on + '"' + (off ? ' disabled' : '') + '>' +
        '<span class="opt__name">' + esc(tx(a.name)) + ' <span class="tag">' + a.code + '</span></span>' +
        '<span class="opt__desc">' + esc(off ? t('calc.ammoLocked') : tx(a.desc)) + '</span></button>';
    }).join('');
    $('#calc-ammo').onclick = function (e) {
      var b = e.target.closest('button[data-id]');
      if (b && !b.disabled) { state.ammo = b.getAttribute('data-id'); renderCalc(); }
    };

    // 갑옷 / 헬멧
    function gearOpts(el, list, current, key, nameOf) {
      el.innerHTML = list.map(function (g) {
        var on = g.lvl === current;
        var desc = g.lvl === 0 ? t('calc.noProtection') : money(g.price) + ' · ' + kg(g.weight);
        return '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-lvl="' + g.lvl + '" aria-pressed="' + on + '" aria-label="' + esc(nameOf(g)) + '">' +
          '<span class="opt__name">' + esc(gearShort(g)) + '</span>' +
          '<span class="opt__big">' + pct(g.reduction) + '</span>' +
          '<span class="opt__desc">' + esc(desc) + '</span></button>';
      }).join('');
      el.onclick = function (e) {
        var b = e.target.closest('button[data-lvl]');
        if (b) { state[key] = +b.getAttribute('data-lvl'); renderCalc(); }
      };
    }
    gearOpts($('#calc-armor'), D.armor, state.armor, 'armor', armorName);
    gearOpts($('#calc-helmet'), D.helmets, state.helmet, 'helmet', helmetName);

    // 결과
    var rows = D.zones.map(function (z) {
      var h = hit(w, z.id, ammo, armor, helmet);
      var n = shotsToKill(h.dmg);
      return { z: z, dmg: h.dmg, guard: h.guard, guardName: h.guardName, n: n, t: timeToKill(w, n) };
    });
    var byZone = {};
    rows.forEach(function (r) { byZone[r.z.id] = r; });

    var fill = {}, label = {}, outline = [];
    rows.forEach(function (r) {
      fill[r.z.id] = kClass(r.n);
      label[r.z.id] = r.n;
      if (r.guard) outline.push(r.z.id);
    });
    $('#calc-figure').innerHTML = bodySVG({ fill: fill, label: label, outline: outline },
      t('calc.figure', { weapon: w.name, ammo: ammo.code, armor: armorName(armor), helmet: helmetName(helmet) }));
    $('#calc-legend').innerHTML = legendHTML(true);

    var head = byZone.head, chest = byZone.upperTorso;
    var rpm = rpmOf(w);
    var shotsValue = function (n) { return n + '<small>' + esc(t('shotsUnit', { n: n })) + '</small>'; };
    $('#calc-summary').innerHTML =
      '<div class="summary__item"><span class="summary__label">' + esc(zoneName('head')) + '</span><span class="summary__value">' + shotsValue(head.n) + '</span><span class="summary__meta">' + esc(t('calc.perShot', { v: fmt1(head.dmg) })) + '</span></div>' +
      '<div class="summary__item"><span class="summary__label">' + esc(groupName('chest')) + '</span><span class="summary__value">' + shotsValue(chest.n) + '</span><span class="summary__meta">' + esc(t('calc.perShot', { v: fmt1(chest.dmg) })) + '</span></div>' +
      '<div class="summary__item"><span class="summary__label">' + esc(t('calc.chestTtk')) + '</span><span class="summary__value">' + (chest.t == null ? '—' : (chest.t / 1000).toFixed(2) + '<small>' + esc(t('secUnit')) + '</small>') + '</span><span class="summary__meta">' + esc(rpm ? t(w.rpmM ? 'calc.rpmMeasured' : 'calc.rpm', { rpm: num(rpm) }) : t('calc.rpmNA')) + '</span></div>';

    // 실측 대조
    var m = w.measured || {};
    var checks = Object.keys(m).map(function (zid) {
      var calc = w.dmg * (w.pellets || 1) * zoneMult(w, zid);
      return zoneName(zid) + ' ' + m[zid] + (Math.abs(calc - m[zid]) <= 0.15 ? ' ✓' : ' ' + t('verify.calcValue', { v: fmt2(calc) }));
    });
    $('#calc-verify').innerHTML = checks.length
      ? '<b>' + esc(t('verify.calcTitle')) + '</b> ' + esc(checks.join(' · ')) + ' <span>' + esc(t('verify.basis')) + '</span>'
      : '<b>' + esc(t('verify.noneTitle')) + '</b> <span>' + esc(t('verify.noneText')) + '</span>';

    $('#calc-table tbody').innerHTML = rows.map(function (r) {
      var mult = zoneMult(w, r.z.id);
      var meas = m[r.z.id] != null && ammo.id === 'fmj' && !r.guard ? m[r.z.id] : null;
      return '<tr><th scope="row">' + esc(tx(r.z.name)) + '</th>' +
        '<td class="is-dim">×' + fmt2(mult) + (isEstZone(w, r.z.id) ? ' <span class="tag">' + esc(t('est')) + '</span>' : '') + '</td>' +
        '<td>' + (r.guard ? '<span class="tag tag--on">' + esc(r.guardName) + '</span>' : '<span class="is-dim">—</span>') + '</td>' +
        '<td>' + fmt1(r.dmg) + '</td>' +
        '<td><span class="pill ' + kClass(r.n) + '">' + esc(shots(r.n)) + '</span></td>' +
        '<td class="' + (r.t == null ? 'is-dim' : '') + '">' + esc(ms(r.t)) + '</td>' +
        '<td class="' + (meas == null ? 'is-dim' : '') + '">' + (meas == null ? '—' : meas + ' ✓') + '</td></tr>';
    }).join('');

    renderFormula();
    save();
  }

  function applyWeapon(id) {
    var w = WEAPONS[id];
    if (!w || !usable(w)) return;
    state.weapon = id;
    state.cls = w.cls;
    renderCalc();
    goTo('#calculator');
  }

  function goTo(hash) {
    var el = $(hash);
    if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* ───────── 전체 데미지 표 ───────── */

  function renderMatrix() {
    segment($('#matrix-ammo'), D.ammo.map(function (a) { return { id: a.id, label: tx(a.name) }; }), matrixState.ammo, function (id) {
      matrixState.ammo = id; renderMatrix();
    });
    segment($('#matrix-metric'), [
      { id: 'stk', label: t('metric.stk') }, { id: 'dmg', label: t('metric.dmg') }, { id: 'ttk', label: t('metric.ttk') }
    ], matrixState.metric, function (id) {
      matrixState.metric = id; renderMatrix();
    });

    var ammo = AMMO[matrixState.ammo];
    var none = D.armor[0];
    var noHelmet = D.helmets[0];

    $('#matrix-table thead').innerHTML =
      '<tr><th></th><th colspan="5">' + esc(t('matrix.headCol')) + '</th><th class="gap"></th><th colspan="5">' + esc(t('matrix.chestCol')) + '</th></tr>' +
      '<tr><th scope="col" style="text-align:left">' + esc(t('matrix.weapon')) + '</th>' +
      D.helmets.map(function (h) { return '<th scope="col">' + esc(gearShort(h)) + '</th>'; }).join('') +
      '<th class="gap"></th>' +
      D.armor.map(function (a) { return '<th scope="col">' + esc(gearShort(a)) + '</th>'; }).join('') + '</tr>';

    function cell(w, zoneId, armor, helmet) {
      var h = hit(w, zoneId, ammo, armor, helmet);
      var n = shotsToKill(h.dmg);
      var v = matrixState.metric === 'stk' ? n
        : matrixState.metric === 'dmg' ? fmt1(h.dmg)
        : ms(timeToKill(w, n));
      return '<td class="t' + kClass(n).slice(1) + '" title="' + esc(t('matrix.cellTitle', { shots: shots(n), v: fmt1(h.dmg) })) + '">' + esc(v) + '</td>';
    }

    var html = '';
    D.classes.forEach(function (c) {
      var list = D.weapons.filter(function (w) { return w.cls === c.id && usable(w); });
      if (!list.length) return;
      html += '<tr class="grp"><th colspan="12">' + esc(tx(c.name)) + '</th></tr>';
      list.forEach(function (w) {
        var lockTag = w.ammo === false && ammo.id !== 'fmj' ? ' <span class="tag">' + esc(t('matrix.lock')) + '</span>' : '';
        html += '<tr class="row" data-id="' + w.id + '" tabindex="0" aria-label="' + esc(t('aria.toCalc', { name: w.name })) + '">' +
          '<th scope="row"><b>' + esc(w.name) + lockTag + '</b><span>' + esc(tx(w.caliber)) + ' · ' + esc(t('calc.base', { v: baseLabel(w) })) + '</span></th>' +
          D.helmets.map(function (h) { return cell(w, 'head', none, h); }).join('') +
          '<td class="gap"></td>' +
          D.armor.map(function (a) { return cell(w, 'upperTorso', a, noHelmet); }).join('') +
          '</tr>';
      });
    });
    var body = $('#matrix-table tbody');
    body.innerHTML = html;
    body.onclick = function (e) {
      var tr = e.target.closest('tr.row');
      if (tr) applyWeapon(tr.getAttribute('data-id'));
    };
    body.onkeydown = function (e) {
      var tr = e.target.closest('tr.row');
      if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); applyWeapon(tr.getAttribute('data-id')); }
    };

    $('#matrix-legend').innerHTML = legendHTML(false) + '<span>' + esc(t('matrix.hint')) + '</span>';
  }

  /* ───────── 방어구 비교 ───────── */

  function renderCompare() {
    segment($('#compare-kind'), [{ id: 'armor', label: t('kind.armor') }, { id: 'helmets', label: t('kind.helmet') }], compareKind, function (id) {
      compareKind = id; renderCompare();
    });

    var isArmor = compareKind === 'armor';
    var list = (isArmor ? D.armor : D.helmets).slice(1);
    var ref = WEAPONS.m4;
    var fmj = AMMO.fmj;
    var nameOf = isArmor ? armorName : helmetName;

    $('#compare').innerHTML = list.map(function (g) {
      var hl = {};
      g.covers.forEach(function (z) { hl[z] = 'is-hl'; });
      var zone = isArmor ? 'upperTorso' : 'head';
      var h = hit(ref, zone, fmj, isArmor ? g : D.armor[0], isArmor ? D.helmets[0] : g);
      var coverText = g.covers.map(zoneName).join(', ');
      var badge = g.lvl === 4 ? t('compare.top') : g.lvl === 2 ? t('compare.value') : (!isArmor && g.lvl === 3) ? t('compare.neck') : '';
      return '<div class="ccol">' +
        '<div class="ccol__fig">' + bodySVG({ fill: hl }, t('compare.figure', { name: nameOf(g) })) + '</div>' +
        '<span class="ccol__lvl">' + esc(badge) + '</span>' +
        '<h3 class="ccol__name">' + esc(nameOf(g)) + '</h3>' +
        '<p class="ccol__price">' + money(g.price) + '</p>' +
        '<button type="button" class="btn btn--sm ccol__cta" data-kind="' + (isArmor ? 'armor' : 'helmet') + '" data-lvl="' + g.lvl + '">' + esc(t('compare.apply')) + '</button>' +
        '<div class="ccol__row"><span class="ccol__big">' + pct(g.reduction) + '</span><span class="ccol__label">' + esc(t('label.reduction')) + '</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + esc(shots(shotsToKill(h.dmg))) + '</span><span class="ccol__label">' + esc(t('compare.stk', { zone: isArmor ? groupName('chest') : zoneName('head') })) + '</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + (g.durability == null ? '—' : g.durability) + '</span><span class="ccol__label">' + esc(t('label.durability')) + '</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + kg(g.weight) + '</span><span class="ccol__label">' + esc(t('label.weight')) + '</span></div>' +
        '<div class="ccol__row"><span class="ccol__text">' + esc(coverText) + '</span><span class="ccol__label">' + esc(t('label.coverage')) + '</span></div>' +
        '<div class="ccol__row"><span class="ccol__text">' + esc(g.unlock || '—') + '</span><span class="ccol__label">' + esc(t('label.unlock')) + '</span></div>' +
        '</div>';
    }).join('');

    $('#compare').onclick = function (e) {
      var b = e.target.closest('button[data-kind]');
      if (!b) return;
      state[b.getAttribute('data-kind')] = +b.getAttribute('data-lvl');
      renderCalc();
      goTo('#calculator');
    };
  }

  /* ───────── 무기 라인업 ───────── */

  function renderWeaponFilter() {
    var items = [{ id: 'all', label: t('filterItem', { name: t('weapons.all'), n: D.weapons.length }) }].concat(D.classes.map(function (c) {
      var n = D.weapons.filter(function (w) { return w.cls === c.id; }).length;
      return { id: c.id, label: t('filterItem', { name: tx(c.name), n: n }) };
    }));
    segment($('#weapon-filter'), items, listState.cls, function (id) {
      listState.cls = id; renderWeaponFilter(); renderWeapons();
    });
  }

  function launcherNote(w) {
    var parts = [];
    if (w.blast) {
      parts.push(w.blast.radius == null ? t('launcher.radiusNA')
        : w.blast.full ? t('launcher.blast', { r: w.blast.radius, full: w.blast.full })
        : t('launcher.blastR', { r: w.blast.radius }));
    }
    if (w.note) parts.push(tx(w.note));
    return parts.join(' · ');
  }

  function renderWeapons() {
    var q = listState.q.trim().toLowerCase();
    var none = D.armor[0], l2 = D.armor[2], l4 = D.armor[4], nh = D.helmets[0], fmj = AMMO.fmj;
    var list = D.weapons.filter(function (w) {
      if (listState.cls !== 'all' && w.cls !== listState.cls) return false;
      if (!q) return true;
      // 어느 언어로 검색해도 찾을 수 있게 모든 언어의 분류명·구경을 포함
      var hay = [w.name, CLASSES[w.cls].name, w.caliber].map(function (v) {
        return v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }).join(' ') : (v || '');
      }).join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    $('#weapon-grid').innerHTML = list.map(function (w) {
      var ok = usable(w);
      var chest = ok ? hit(w, 'upperTorso', fmj, none, nh).dmg : null;
      var dmgBlock = ok
        ? '<div class="wcard__dmg"><b>' + fmt1(chest) + '</b><span>' + esc(t('card.chest', { base: baseLabel(w) })) + '</span></div>'
        : '<div class="wcard__dmg"><b>' + w.dmg + '</b><span>' + esc(t('card.blast')) + '</span></div>';
      var stk = '';
      if (ok) {
        stk = '<div class="wcard__stk">' + [[t('card.bare'), none], ['L2', l2], ['L4', l4]].map(function (p) {
          var n = shotsToKill(hit(w, 'upperTorso', fmj, p[1], nh).dmg);
          return '<span class="pill ' + kClass(n) + '">' + esc(p[0] + ' ' + shots(n)) + '</span>';
        }).join('') + '</div>';
      }
      var noteText = w.explosive ? launcherNote(w) : tx(w.note);
      var note = noteText ? '<p class="wcard__note">' + esc(noteText) + '</p>' : '';
      var action = ok ? ' data-id="' + w.id + '" aria-label="' + esc(t('aria.toCalc', { name: w.name })) + '"'
        : ' data-go="#explosives" aria-label="' + esc(t('aria.toExpl', { name: w.name })) + '"';
      var rpm = rpmOf(w);
      return '<button type="button" class="wcard"' + action + '>' +
        '<span class="wcard__cls"><span>' + esc(className(w.cls)) + '</span>' + (w.measured ? '<span class="tag">' + esc(t('card.measured')) + '</span>' : '') + '</span>' +
        '<span class="wcard__name">' + esc(w.name) + '</span>' +
        '<span class="wcard__cal">' + esc(tx(w.caliber)) + ' · ' + esc(fireName(w)) + '</span>' +
        dmgBlock +
        '<dl class="wcard__stats">' +
        '<div><dt>' + esc(t(w.rpmM ? 'card.rpmM' : 'card.rpm')) + '</dt><dd>' + (rpm ? num(rpm) : '—') + '</dd></div>' +
        '<div><dt>' + esc(t('label.price')) + '</dt><dd>' + esc(money(w.price)) + '</dd></div>' +
        '<div><dt>' + esc(t('card.range')) + '</dt><dd>' + (w.range ? num(w.range) + ' m' : '—') + '</dd></div>' +
        '</dl>' + stk + note + '</button>';
    }).join('');

    $('#weapon-empty').hidden = list.length > 0;
    $('#weapon-grid').onclick = function (e) {
      var b = e.target.closest('button.wcard');
      if (!b) return;
      if (b.getAttribute('data-id')) applyWeapon(b.getAttribute('data-id'));
      else if (b.getAttribute('data-go')) goTo(b.getAttribute('data-go'));
    };
  }

  /* ───────── 건축물 장비 / 폭발 ───────── */

  function renderStructures() {
    $('#structure-cards').innerHTML = D.structures.map(function (s) {
      return '<article class="scard">' +
        '<span class="scard__role">' + esc(tx(s.role)) + '</span>' +
        '<h3 class="scard__name">' + esc(tx(s.name)) + '</h3>' +
        '<p class="scard__dmg">' + s.dmg + '<span>' + esc(t('str.perShot')) + '</span></p>' +
        '<dl class="scard__stats">' + s.stats.map(function (p) {
          return '<div><dt>' + esc(t('stat.' + p[0])) + '</dt><dd>' + esc(tx(p[1])) + '</dd></div>';
        }).join('') + '</dl>' +
        '<p class="scard__note">' + esc(tx(s.note)) + '</p></article>';
    }).join('');

    var maxHp = Math.max.apply(null, D.buildables.map(function (b) { return b.hp; }));
    $('#buildables').innerHTML = D.buildables.map(function (b) {
      return '<li><span class="hpbar__name">' + esc(tx(b.name)) + '</span>' +
        '<span class="hpbar__track"><i style="width:' + (b.hp / maxHp * 100).toFixed(1) + '%"></i></span>' +
        '<span class="hpbar__val">' + num(b.hp) + '</span></li>';
    }).join('');

    var demo = D.demolition;
    $('#demolition').innerHTML =
      '<caption class="sr-only">' + esc(t('build.caption')) + '</caption>' +
      '<thead><tr><th scope="col">' + esc(t('demo.target')) + '</th>' + demo.tools.map(function (tool) { return '<th scope="col">' + esc(tool) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + demo.rows.map(function (r) {
        var min = Math.min.apply(null, r.counts);
        return '<tr><th scope="row">' + esc(tx(r.target)) + '</th>' + r.counts.map(function (c) {
          return '<td class="' + (c === min ? 'is-best' : '') + '">' + esc(t('pcs', { n: c })) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  var BLAST_SRC = D.explosives.filter(function (x) { return x.dmg != null && x.radius != null; })
    .concat(D.ordnance.filter(function (x) { return x.radius != null; }));

  function renderBlast() {
    var x = BLAST_SRC.filter(function (b) { return b.id === blastState.src; })[0] || BLAST_SRC[0];
    var name = tx(x.name);
    var range = $('#blast-range');
    range.max = x.radius;
    if (blastState.d > x.radius) blastState.d = x.radius;
    range.value = blastState.d;

    segment($('#blast-src'), BLAST_SRC.map(function (b) { return { id: b.id, label: tx(b.name) }; }), x.id, function (id) {
      blastState.src = id; renderBlast();
    });

    var d = blastState.d;
    var dmg = blastDamage(x, d);
    $('#blast-out').textContent = d.toFixed(1) + ' m';

    var outcome = dmg >= D.hp ? t('blast.kill') : dmg <= 0 ? t('blast.none') : t('blast.left', { n: Math.round(D.hp - dmg) });
    $('#blast-result').innerHTML =
      '<div class="blast__cell"><span>' + esc(t('blast.taken')) + '</span><b>' + Math.round(dmg) + '</b></div>' +
      '<div class="blast__cell"><span>' + esc(t('blast.hpBasis')) + '</span><b>' + esc(outcome) + '</b></div>';
    $('#blast-meta').textContent = t('blast.meta', { name: name, dmg: x.dmg, r: x.radius }) +
      (x.full ? t('blast.metaFull', { full: x.full }) : '') + (x.edge ? t('blast.metaEdge', { edge: x.edge }) : '');

    // 도식: 중심(200,200), 반경 x.radius → 180px
    var R = 180, scale = R / x.radius;
    var fr = (x.full || 0) * scale;
    var px = 200 + d * scale;
    var ticks = '';
    var step = x.radius > 12 ? 4 : x.radius > 6 ? 2 : 1;
    for (var m = 0; m <= x.radius; m += step) {
      var tickX = 200 + m * scale;
      ticks += '<line x1="' + tickX + '" y1="206" x2="' + tickX + '" y2="212" stroke="currentColor" stroke-opacity=".5"/>' +
        '<text x="' + tickX + '" y="226" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".6">' + m + '</text>';
    }
    $('#blast-viz').innerHTML =
      '<svg viewBox="0 0 400 400" role="img" aria-label="' + esc(t('blast.aria', { name: name, r: x.radius, d: d.toFixed(1), dmg: Math.round(dmg) })) + '" style="color:var(--ink-fg)">' +
      '<defs><radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">' +
      '<stop offset="' + (fr / R * 100).toFixed(1) + '%" stop-color="#ff9f0a" stop-opacity=".9"/>' +
      '<stop offset="100%" stop-color="#ff9f0a" stop-opacity="' + (x.edge ? (x.edge / x.dmg * 0.9).toFixed(2) : 0) + '"/></radialGradient></defs>' +
      '<circle cx="200" cy="200" r="' + R + '" fill="url(#bg-grad)"/>' +
      '<circle cx="200" cy="200" r="' + R + '" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 5"/>' +
      (fr > 0 ? '<circle cx="200" cy="200" r="' + fr + '" fill="none" stroke="currentColor" stroke-opacity=".8"/>' +
        '<text x="200" y="' + (200 - fr - 8) + '" text-anchor="middle" font-size="12" fill="currentColor">' + esc(t('blast.svgFull', { full: x.full })) + '</text>' : '') +
      '<text x="200" y="' + (200 - R + 18) + '" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity=".7">' + esc(t('blast.svgRadius', { r: x.radius })) + '</text>' +
      '<line x1="200" y1="209" x2="' + (200 + R) + '" y2="209" stroke="currentColor" stroke-opacity=".5"/>' + ticks +
      '<circle cx="200" cy="200" r="4" fill="currentColor"/>' +
      '<line x1="' + px + '" y1="160" x2="' + px + '" y2="200" stroke="#2997ff" stroke-width="2"/>' +
      '<circle cx="' + px + '" cy="200" r="7" fill="#2997ff" stroke="#000" stroke-width="2"/>' +
      '<text x="' + Math.min(Math.max(px, 20), 370) + '" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">' + Math.round(dmg) + '</text>' +
      '</svg>';
  }

  /* ───────── 폭발물 / 차량 ───────── */

  function renderExplosives() {
    $('#explosive-cards').innerHTML = D.explosives.map(function (x) {
      var rows = [
        [t('label.price'), money(x.price)],
        [t('expl.trigger'), tx(x.trigger) || '—'],
        [t('expl.unlock'), x.unlock || '—'],
        [t('expl.note'), tx(x.note) || '—']
      ];
      var radius = x.radius != null
        ? [t('expl.radius', { r: x.radius })].concat(x.full ? [t('expl.full', { full: x.full })] : [], x.edge ? [t('expl.edge', { edge: x.edge })] : []).join(' · ')
        : t('expl.radiusNA');
      return '<article class="ecard">' +
        '<span class="ecard__kind">' + esc(tx(x.kind)) + '</span>' +
        '<h3 class="ecard__name">' + esc(tx(x.name)) + '</h3>' +
        (x.dmg != null ? '<p class="ecard__dmg">' + x.dmg + '</p>' : '<p class="ecard__dmg ecard__dmg--na">' + esc(t('expl.dmgNA')) + '</p>') +
        '<span class="ecard__radius">' + esc(radius) + '</span>' +
        '<ul class="ecard__list">' + rows.map(function (r) {
          return '<li><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></li>';
        }).join('') + '</ul></article>';
    }).join('');
  }

  function renderVehicles() {
    $('#vehicle-cards').innerHTML = D.vehicles.map(function (v) {
      var weapons = v.weapons.length
        ? '<ul class="vcard__weapons">' + v.weapons.map(function (wp) {
          var val = wp.perRound ? t('veh.round', { v: wp.dmg }) : String(wp.dmg);
          var blast = wp.blast ? t('veh.blastR', { r: wp.blast.radius }) + (wp.blast.full ? ' · ' + t('veh.blastFull', { full: wp.blast.full }) : '') : '';
          return '<li><span><b>' + esc(tx(wp.name)) + '</b><small>' + esc(tx(wp.ammo)) + (blast ? ' · ' + esc(blast) : '') + '</small></span><span class="vcard__dmg">' + esc(val) + '</span></li>';
        }).join('') + '</ul>'
        : '<p class="vcard__note">' + esc(t('veh.unarmed')) + '</p>';
      return '<article class="vcard">' +
        '<span class="vcard__kind">' + esc(tx(v.kind)) + '</span>' +
        '<h3 class="vcard__name">' + esc(v.name) + '</h3>' +
        '<dl class="vcard__stats">' +
        '<div><dt>' + esc(t('veh.hp')) + '</dt><dd>' + num(v.hp) + '</dd></div>' +
        '<div><dt>' + esc(t('veh.seats')) + '</dt><dd>' + (v.seats || '—') + '</dd></div>' +
        '<div><dt>' + esc(t('veh.speed')) + '</dt><dd>' + (v.speed ? v.speed + ' km/h' : '—') + '</dd></div>' +
        '</dl>' + weapons + (v.note ? '<p class="vcard__note">' + esc(tx(v.note)) + '</p>' : '') + '</article>';
    }).join('');
  }

  /* ───────── 계산 방식 ───────── */

  function renderFormula() {
    var w = WEAPONS[state.weapon];
    var ammo = ammoFor(w, state.ammo);
    var helmet = D.helmets[state.helmet];
    var mult = zoneMult(w, 'head');
    var guarded = helmet.covers.indexOf('head') >= 0;
    var base = w.dmg * (w.pellets || 1);
    var afterZone = base * mult;
    var ammoMult = guarded ? ammo.armored : ammo.flesh;
    var final = hit(w, 'head', ammo, D.armor[state.armor], helmet).dmg;

    $('#formula-walk').innerHTML =
      '<li><b>' + fmt1(base) + '</b><span>' + esc(t('walk.base', { name: w.name }) + (w.pellets ? t('walk.pellets', { dmg: w.dmg, p: w.pellets }) : '')) + '</span></li>' +
      '<li><b>' + fmt1(afterZone) + '</b><span>' + esc(t('walk.mult', { cls: className(w.cls), m: fmt2(mult) })) + '</span></li>' +
      '<li><b>' + fmt1(final) + '</b><span>' + esc(t('walk.ammo', { ammo: tx(ammo.name), a: ammoMult.toFixed(1) }) +
      (guarded ? t('walk.helmet', { helmet: helmetName(helmet), pct: pct(helmet.reduction) }) : t('walk.noHelmet'))) + '</span></li>' +
      '<li><b>' + esc(shots(shotsToKill(final))) + '</b><span>' + esc(t('walk.stk', { v: fmt1(final) })) + '</span></li>';
  }

  function renderClassTable() {
    var groups = D.zoneGroups;
    $('#class-table').innerHTML =
      '<caption class="sr-only">' + esc(t('mults.title')) + '</caption>' +
      '<thead><tr><th scope="col">' + esc(t('ct.class')) + '</th>' + groups.map(function (g) { return '<th scope="col">' + esc(tx(g.name)) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + CLASS_ROWS.map(function (row) {
        var cm = D.classMults[row.ids[0]];
        var est = cm.est || [];
        var label = row.key ? t(row.key) : className(row.ids[0]);
        return '<tr><th scope="row">' + esc(label) + '</th>' + groups.map(function (g) {
          return '<td>×' + fmt2(cm[g.id]) + (est.indexOf(g.id) >= 0 ? ' <span class="tag">' + esc(t('est')) + '</span>' : '') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';

    $('#zone-ratio').innerHTML = D.zones.filter(function (z) { return z.k !== 1; }).map(function (z) {
      return '<li>' + esc(t('zoneRatio', { zone: '\u0000', group: groupName(z.group), k: z.k })).replace('\u0000', '<b>' + esc(tx(z.name)) + '</b>') + '</li>';
    }).join('');
  }

  function renderVerify() {
    var rows = [], total = 0, pass = 0, worst = 0;
    D.weapons.forEach(function (w) {
      if (!w.measured) return;
      var cells = Object.keys(w.measured).map(function (zid) {
        var meas = w.measured[zid];
        var calc = w.dmg * (w.pellets || 1) * zoneMult(w, zid);
        var diff = Math.abs(calc - meas);
        total++;
        if (diff <= 0.15) pass++;
        worst = Math.max(worst, diff);
        return zoneName(zid) + ' ' + meas + ' / ' + fmt2(calc);
      });
      rows.push('<tr><th scope="row">' + esc(w.name) + '</th><td>' + esc(className(w.cls)) + '</td><td>' + esc(cells.join(' · ')) + '</td></tr>');
    });
    $('#verify-summary').textContent = t('verify.summary', { total: total, pass: pass, worst: fmt2(worst) });
    $('#verify-table tbody').innerHTML = rows.join('');
  }

  /* ───────── 히어로 ───────── */

  var hero = { idx: 0, timer: null, steps: [] };
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function heroShow(i, animate) {
    hero.idx = i;
    var s = hero.steps[i];
    var numEl = $('#hero-dmg');
    if (animate && !reduceMotion) {
      numEl.classList.add('is-swap');
      setTimeout(function () {
        numEl.textContent = fmt1(s.dmg);
        numEl.classList.remove('is-swap');
      }, 180);
    } else {
      numEl.textContent = fmt1(s.dmg);
    }
    $('#hero-state').textContent = t('hero.state', { helmet: helmetName(s.h), shots: shots(s.n) });
    $$('#hero-steps button').forEach(function (b, j) {
      b.classList.toggle('is-on', j === i);
      b.classList.toggle('is-past', j < i);
      b.setAttribute('aria-pressed', String(j === i));
    });
  }

  function renderHero() {
    var w = WEAPONS.m4, fmj = AMMO.fmj, none = D.armor[0];
    hero.steps = D.helmets.map(function (h) {
      var dmg = hit(w, 'head', fmj, none, h).dmg;
      return { h: h, dmg: dmg, n: shotsToKill(dmg) };
    });
    $('#hero-steps').innerHTML = hero.steps.map(function (s, i) {
      return '<li><button type="button" data-i="' + i + '" aria-label="' + esc(helmetName(s.h)) + '">' +
        '<span class="bar"><i></i></span><b>' + esc(shots(s.n)) + '</b><span>' + esc(gearShort(s.h)) + '</span></button></li>';
    }).join('');
    heroShow(hero.idx, false);
    $('#hero2-figure').innerHTML = bodySVG({ fill: { head: 'is-hl', neck: 'is-hl' } }, t('fig.hero2'));
  }

  function initHero() {
    function play() { if (!reduceMotion && !hero.timer) hero.timer = setInterval(function () { heroShow((hero.idx + 1) % hero.steps.length, true); }, 2600); }
    function stop() { clearInterval(hero.timer); hero.timer = null; }
    $('#hero-steps').onclick = function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      stop();
      heroShow(+b.getAttribute('data-i'), true);
      play();
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });
    play();
  }

  function renderTiles() {
    // 분류별 가슴 1발 피해가 가장 큰 무기
    var none = D.armor[0], nh = D.helmets[0], fmj = AMMO.fmj;
    var picks = ['pistol', 'smg', 'ar', 'lmg', 'dmr', 'sniper'].map(function (c) {
      return D.weapons.filter(function (w) { return w.cls === c && usable(w); })
        .map(function (w) { return { w: w, v: hit(w, 'upperTorso', fmj, none, nh).dmg }; })
        .sort(function (a, b) { return b.v - a.v; })[0];
    }).filter(Boolean);
    var max = Math.max.apply(null, picks.map(function (p) { return p.v; }));
    $('#tile-bars').innerHTML = picks.map(function (p) {
      return '<span style="height:' + Math.round(p.v / max * 82) + '%"><em><b>' + fmt1(p.v) + '</b><br>' + esc(p.w.name) + '</em></span>';
    }).join('');
  }

  function renderChapterNav() {
    var items = D.classes.map(function (c) {
      return { count: c.total, label: tx(c.name), href: '#weapons', cls: c.id };
    }).concat([
      { count: D.explosives.length, label: t('nav.explosives'), href: '#explosives' },
      { count: D.structures.length, label: t('nav.structures'), href: '#structures' },
      { count: D.vehicles.length, label: t('nav.vehicles'), href: '#vehicles' }
    ]);
    $('#chapternav').innerHTML = items.map(function (it) {
      return '<li class="chapternav__item"><a href="' + it.href + '"' + (it.cls ? ' data-cls="' + it.cls + '"' : '') + '>' +
        '<span class="chapternav__count">' + it.count + '</span><span>' + esc(it.label) + '</span></a></li>';
    }).join('');
  }

  function renderFooter() {
    $('#source-list').innerHTML = D.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.site + ' · ' + tx(s.topic)) + '</a></li>';
    }).join('');
  }

  function initEvents() {
    var menu = $('#gnav-menu');
    var links = $('#gnav-links');
    function setMenu(open) {
      links.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.open'));
    }
    menu.onclick = function () { setMenu(!links.classList.contains('is-open')); };
    links.onclick = function (e) { if (e.target.closest('a')) setMenu(false); };

    $('#gnav-search').addEventListener('click', function () {
      setTimeout(function () { $('#weapon-search').focus({ preventScroll: true }); }, 400);
    });

    $('#lang-list').onclick = function (e) {
      var b = e.target.closest('button[data-lang]');
      if (b) setLang(b.getAttribute('data-lang'));
    };

    $('#chapternav').onclick = function (e) {
      var a = e.target.closest('a[data-cls]');
      if (!a) return;
      listState.cls = a.getAttribute('data-cls');
      renderWeaponFilter();
      renderWeapons();
    };

    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-compare]');
      if (c) { compareKind = c.getAttribute('data-compare'); renderCompare(); }
      var h = e.target.closest('[data-apply-helmet]');
      if (h) { state.helmet = +h.getAttribute('data-apply-helmet'); renderCalc(); }
    });

    $('#weapon-search').addEventListener('input', function (e) {
      listState.q = e.target.value;
      renderWeapons();
    });
    $('#blast-range').addEventListener('input', function (e) {
      blastState.d = +e.target.value;
      renderBlast();
    });
  }

  function renderAll() {
    renderLangBar();
    renderChapterNav();
    renderHero();
    renderTiles();
    renderCalc();
    renderMatrix();
    renderCompare();
    renderWeaponFilter();
    renderWeapons();
    renderStructures();
    renderBlast();
    renderExplosives();
    renderVehicles();
    renderClassTable();
    renderVerify();
    renderFooter();
  }

  /* ───────── 시작 ───────── */

  loadFont(lang);
  applyStatic();
  renderAll();
  initEvents();
  initHero();
})();
