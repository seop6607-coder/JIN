/* 워독스 데미지 랩 · 화면 로직 */
(function () {
  'use strict';

  var D = window.WD_DATA;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var byId = function (list, key) {
    var map = {};
    list.forEach(function (item) { map[item[key || 'id']] = item; });
    return map;
  };

  var ZONES = byId(D.zones);
  var CLASSES = byId(D.classes);
  var WEAPONS = byId(D.weapons);
  var AMMO = byId(D.ammo);
  var CALC_CLASSES = ['ar', 'smg', 'lmg', 'dmr', 'sniper', 'shotgun', 'pistol', 'bow'];
  var CLASS_ROWS = [
    { ids: ['ar'], name: '돌격소총' },
    { ids: ['smg', 'pistol'], name: '기관단총·권총' },
    { ids: ['lmg'], name: '경기관총' },
    { ids: ['dmr'], name: '지정사수소총' },
    { ids: ['sniper'], name: '저격소총' },
    { ids: ['shotgun'], name: '산탄총 (펠릿당)' },
    { ids: ['bow'], name: '활' }
  ];

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
    return { dmg: dmg, guard: guard };
  }

  function shotsToKill(dmg) {
    return dmg > 0 ? Math.ceil(D.hp / dmg - 1e-9) : Infinity;
  }

  // 실측 연사 속도가 있으면 그 값을 쓴다
  function rpmOf(w) { return w.rpmM || w.rpm || null; }

  // 첫 발부터 마지막 발까지 걸리는 시간 (ms)
  function timeToKill(w, shots) {
    var rpm = rpmOf(w);
    if (!rpm || !isFinite(shots)) return null;
    return Math.round((shots - 1) * 60000 / rpm);
  }

  function kClass(shots) {
    if (shots <= 1) return 'k1';
    if (shots === 2) return 'k2';
    if (shots === 3) return 'k3';
    if (shots <= 5) return 'k4';
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
  var money = function (n) { return n == null ? '—' : n === 0 ? '무료' : '$' + n.toLocaleString('en-US'); };
  var kg = function (n) { return n == null ? '—' : n.toFixed(1) + ' kg'; };
  var ms = function (n) { return n == null ? '—' : (n === 0 ? '즉시' : (n / 1000).toFixed(2) + '초'); };
  var pct = function (r) { return r ? '−' + Math.round(r * 100) + '%' : '0%'; };
  var num = function (n) { return n == null ? '—' : n.toLocaleString('en-US'); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var usable = function (w) { return w.dmg != null && !w.explosive; };
  var baseLabel = function (w) { return w.pellets ? w.dmg + '×' + w.pellets : String(w.dmg); };

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
   * opts.label   { zoneId: '3' }
   * opts.outline [zoneId] 방어구 보호 부위 점선
   */
  function bodySVG(opts, title) {
    var fill = opts.fill || {};
    var label = opts.label || {};
    var outline = opts.outline || [];
    var parts = [], outlines = [], texts = [];

    Object.keys(SHAPES).forEach(function (id) {
      var cls = fill[id] || '';
      var tip = ZONES[id].name + (label[id] ? ' · ' + label[id] + '발' : '');
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

    return '<svg class="body-svg" viewBox="0 0 240 476" role="img" aria-label="' + esc(title || '피격 부위 도식') + '">' +
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
    var items = [['k1', '1발'], ['k2', '2발'], ['k3', '3발'], ['k4', '4–5발'], ['k6', '6발 이상']];
    var html = items.map(function (it) {
      return '<span class="lg"><i class="' + it[0] + '"></i>' + it[1] + '</span>';
    }).join('');
    if (withArmor) html += '<span class="lg lg--armor"><i></i>방어구 보호 부위</span>';
    return html;
  }

  /* ───────── 계산기 ───────── */

  function renderCalc() {
    var w = WEAPONS[state.weapon];
    var ammo = ammoFor(w, state.ammo);
    var armor = D.armor[state.armor];
    var helmet = D.helmets[state.helmet];

    // 분류
    segment($('#calc-class'), CALC_CLASSES.map(function (id) {
      return { id: id, label: CLASSES[id].name };
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
      var meta = '기본 ' + baseLabel(x) + (rpm ? ' · ' + num(rpm) + ' RPM' : '');
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
        '<span class="opt__name">' + esc(a.name) + ' <span class="tag">' + a.code + '</span></span>' +
        '<span class="opt__desc">' + esc(off ? '이 무기는 탄종을 고를 수 없습니다.' : a.desc) + '</span></button>';
    }).join('');
    $('#calc-ammo').onclick = function (e) {
      var b = e.target.closest('button[data-id]');
      if (b && !b.disabled) { state.ammo = b.getAttribute('data-id'); renderCalc(); }
    };

    // 갑옷 / 헬멧
    function gearOpts(el, list, current, key) {
      el.innerHTML = list.map(function (g) {
        var on = g.lvl === current;
        var desc = g.lvl === 0 ? '보호 없음' : money(g.price) + ' · ' + kg(g.weight);
        return '<button type="button" class="opt' + (on ? ' is-on' : '') + '" data-lvl="' + g.lvl + '" aria-pressed="' + on + '" aria-label="' + esc(g.name) + '">' +
          '<span class="opt__name">' + g.short + '</span>' +
          '<span class="opt__big">' + pct(g.reduction) + '</span>' +
          '<span class="opt__desc">' + desc + '</span></button>';
      }).join('');
      el.onclick = function (e) {
        var b = e.target.closest('button[data-lvl]');
        if (b) { state[key] = +b.getAttribute('data-lvl'); renderCalc(); }
      };
    }
    gearOpts($('#calc-armor'), D.armor, state.armor, 'armor');
    gearOpts($('#calc-helmet'), D.helmets, state.helmet, 'helmet');

    // 결과
    var rows = D.zones.map(function (z) {
      var h = hit(w, z.id, ammo, armor, helmet);
      var n = shotsToKill(h.dmg);
      return { z: z, dmg: h.dmg, guard: h.guard, n: n, t: timeToKill(w, n) };
    });
    var byZone = {};
    rows.forEach(function (r) { byZone[r.z.id] = r; });

    var fill = {}, label = {}, outline = [];
    rows.forEach(function (r) {
      fill[r.z.id] = kClass(r.n);
      label[r.z.id] = String(r.n);
      if (r.guard) outline.push(r.z.id);
    });
    $('#calc-figure').innerHTML = bodySVG({ fill: fill, label: label, outline: outline },
      w.name + ' ' + ammo.code + ', ' + armor.name + ', ' + helmet.name + ' 기준 부위별 처치 탄수');
    $('#calc-legend').innerHTML = legendHTML(true);

    var head = byZone.head, chest = byZone.upperTorso;
    var rpm = rpmOf(w);
    $('#calc-summary').innerHTML =
      '<div class="summary__item"><span class="summary__label">머리</span><span class="summary__value">' + head.n + '<small>발</small></span><span class="summary__meta">1발 ' + fmt1(head.dmg) + '</span></div>' +
      '<div class="summary__item"><span class="summary__label">가슴</span><span class="summary__value">' + chest.n + '<small>발</small></span><span class="summary__meta">1발 ' + fmt1(chest.dmg) + '</span></div>' +
      '<div class="summary__item"><span class="summary__label">가슴 처치 시간</span><span class="summary__value">' + (chest.t == null ? '—' : (chest.t / 1000).toFixed(2) + '<small>초</small>') + '</span><span class="summary__meta">' + (rpm ? num(rpm) + ' RPM' + (w.rpmM ? ' 실측' : '') : '연사 속도 미공개') + '</span></div>';

    // 실측 대조
    var m = w.measured || {};
    var checks = Object.keys(m).map(function (zid) {
      var calc = w.dmg * (w.pellets || 1) * zoneMult(w, zid);
      return ZONES[zid].name + ' ' + m[zid] + (Math.abs(calc - m[zid]) <= 0.15 ? ' ✓' : ' (계산 ' + fmt2(calc) + ')');
    });
    $('#calc-verify').innerHTML = checks.length
      ? '<b>사격장 실측과 대조</b> ' + esc(checks.join(' · ')) + ' <span>(일반탄, 맨몸 기준)</span>'
      : '<b>사격장 실측 없음</b> <span>같은 탄과 같은 종류 배율로 계산한 값입니다.</span>';

    $('#calc-table tbody').innerHTML = rows.map(function (r) {
      var mult = zoneMult(w, r.z.id);
      var meas = m[r.z.id] != null && ammo.id === 'fmj' && !r.guard ? m[r.z.id] : null;
      return '<tr><th scope="row">' + esc(r.z.name) + '</th>' +
        '<td class="is-dim">×' + fmt2(mult) + (isEstZone(w, r.z.id) ? ' <span class="tag">추정</span>' : '') + '</td>' +
        '<td>' + (r.guard ? '<span class="tag tag--on">' + esc(r.guard.name) + '</span>' : '<span class="is-dim">—</span>') + '</td>' +
        '<td>' + fmt1(r.dmg) + '</td>' +
        '<td><span class="pill ' + kClass(r.n) + '">' + r.n + '발</span></td>' +
        '<td class="' + (r.t == null ? 'is-dim' : '') + '">' + ms(r.t) + '</td>' +
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
    segment($('#matrix-ammo'), D.ammo.map(function (a) { return { id: a.id, label: a.name }; }), matrixState.ammo, function (id) {
      matrixState.ammo = id; renderMatrix();
    });
    segment($('#matrix-metric'), [
      { id: 'stk', label: '처치 탄수' }, { id: 'dmg', label: '1발 피해' }, { id: 'ttk', label: '처치 시간' }
    ], matrixState.metric, function (id) {
      matrixState.metric = id; renderMatrix();
    });

    var ammo = AMMO[matrixState.ammo];
    var none = D.armor[0];
    var noHelmet = D.helmets[0];

    $('#matrix-table thead').innerHTML =
      '<tr><th></th><th colspan="5">머리 · 헬멧 등급</th><th class="gap"></th><th colspan="5">가슴 · 갑옷 등급</th></tr>' +
      '<tr><th scope="col" style="text-align:left">무기</th>' +
      D.helmets.map(function (h) { return '<th scope="col">' + h.short + '</th>'; }).join('') +
      '<th class="gap"></th>' +
      D.armor.map(function (a) { return '<th scope="col">' + a.short + '</th>'; }).join('') + '</tr>';

    function cell(w, zoneId, armor, helmet) {
      var h = hit(w, zoneId, ammo, armor, helmet);
      var n = shotsToKill(h.dmg);
      var v = matrixState.metric === 'stk' ? n
        : matrixState.metric === 'dmg' ? fmt1(h.dmg)
        : ms(timeToKill(w, n));
      return '<td class="t' + kClass(n).slice(1) + '" title="' + n + '발 · 1발 ' + fmt1(h.dmg) + '">' + v + '</td>';
    }

    var html = '';
    D.classes.forEach(function (c) {
      var list = D.weapons.filter(function (w) { return w.cls === c.id && usable(w); });
      if (!list.length) return;
      html += '<tr class="grp"><th colspan="12">' + esc(c.name) + '</th></tr>';
      list.forEach(function (w) {
        var lockTag = w.ammo === false && ammo.id !== 'fmj' ? ' <span class="tag">일반 탄 고정</span>' : '';
        html += '<tr class="row" data-id="' + w.id + '" tabindex="0" aria-label="' + esc(w.name) + ' 계산기에서 보기">' +
          '<th scope="row"><b>' + esc(w.name) + lockTag + '</b><span>' + esc(w.caliber) + ' · 기본 ' + baseLabel(w) + '</span></th>' +
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

    $('#matrix-legend').innerHTML = legendHTML(false) + '<span>행을 누르면 계산기에 적용됩니다</span>';
  }

  /* ───────── 방어구 비교 ───────── */

  function renderCompare() {
    segment($('#compare-kind'), [{ id: 'armor', label: '갑옷' }, { id: 'helmets', label: '헬멧' }], compareKind, function (id) {
      compareKind = id; renderCompare();
    });

    var isArmor = compareKind === 'armor';
    var list = (isArmor ? D.armor : D.helmets).slice(1);
    var ref = WEAPONS.m4;
    var fmj = AMMO.fmj;

    $('#compare').innerHTML = list.map(function (g) {
      var hl = {};
      g.covers.forEach(function (z) { hl[z] = 'is-hl'; });
      var zone = isArmor ? 'upperTorso' : 'head';
      var h = hit(ref, zone, fmj, isArmor ? g : D.armor[0], isArmor ? D.helmets[0] : g);
      var coverText = g.covers.map(function (z) { return ZONES[z].name; }).join(', ');
      return '<div class="ccol">' +
        '<div class="ccol__fig">' + bodySVG({ fill: hl }, g.name + ' 보호 부위') + '</div>' +
        '<span class="ccol__lvl">' + (g.lvl === 4 ? '최상위 등급' : g.lvl === 2 ? '가성비 추천' : (!isArmor && g.lvl === 3) ? '목 보호 시작' : '') + '</span>' +
        '<h3 class="ccol__name">' + esc(g.name) + '</h3>' +
        '<p class="ccol__price">' + money(g.price) + '</p>' +
        '<button type="button" class="btn btn--sm ccol__cta" data-kind="' + (isArmor ? 'armor' : 'helmet') + '" data-lvl="' + g.lvl + '">계산기에 적용</button>' +
        '<div class="ccol__row"><span class="ccol__big">' + pct(g.reduction) + '</span><span class="ccol__label">피해 감소</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + shotsToKill(h.dmg) + '발</span><span class="ccol__label">M4 일반탄 ' + (isArmor ? '가슴' : '머리') + ' 처치 탄수</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + (g.durability == null ? '—' : g.durability) + '</span><span class="ccol__label">내구도</span></div>' +
        '<div class="ccol__row"><span class="ccol__big">' + kg(g.weight) + '</span><span class="ccol__label">무게</span></div>' +
        '<div class="ccol__row"><span class="ccol__text">' + esc(coverText) + '</span><span class="ccol__label">보호 부위</span></div>' +
        '<div class="ccol__row"><span class="ccol__text">' + esc(g.unlock || '—') + '</span><span class="ccol__label">해금 조건</span></div>' +
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
    var items = [{ id: 'all', label: '전체 ' + D.weapons.length }].concat(D.classes.map(function (c) {
      var n = D.weapons.filter(function (w) { return w.cls === c.id; }).length;
      return { id: c.id, label: c.name + ' ' + n };
    }));
    segment($('#weapon-filter'), items, listState.cls, function (id) {
      listState.cls = id; renderWeaponFilter(); renderWeapons();
    });
  }

  function renderWeapons() {
    var q = listState.q.trim().toLowerCase();
    var none = D.armor[0], l2 = D.armor[2], l4 = D.armor[4], nh = D.helmets[0], fmj = AMMO.fmj;
    var list = D.weapons.filter(function (w) {
      if (listState.cls !== 'all' && w.cls !== listState.cls) return false;
      if (!q) return true;
      return (w.name + ' ' + (w.caliber || '') + ' ' + CLASSES[w.cls].name).toLowerCase().indexOf(q) >= 0;
    });

    $('#weapon-grid').innerHTML = list.map(function (w) {
      var ok = usable(w);
      var chest = ok ? hit(w, 'upperTorso', fmj, none, nh).dmg : null;
      var dmgBlock = ok
        ? '<div class="wcard__dmg"><b>' + fmt1(chest) + '</b><span>가슴 1발 · 기본 ' + baseLabel(w) + '</span></div>'
        : '<div class="wcard__dmg"><b>' + w.dmg + '</b><span>폭발 피해</span></div>';
      var stk = '';
      if (ok) {
        stk = '<div class="wcard__stk">' + [['맨몸', none], ['L2', l2], ['L4', l4]].map(function (p) {
          var n = shotsToKill(hit(w, 'upperTorso', fmj, p[1], nh).dmg);
          return '<span class="pill ' + kClass(n) + '">' + p[0] + ' ' + n + '발</span>';
        }).join('') + '</div>';
      }
      var note = w.note ? '<p class="wcard__note">' + esc(w.note) + '</p>' : '';
      var action = ok ? ' data-id="' + w.id + '" aria-label="' + esc(w.name) + ' 계산기에서 보기"'
        : ' data-go="#explosives" aria-label="' + esc(w.name) + ' 폭발물 항목 보기"';
      var rpm = rpmOf(w);
      return '<button type="button" class="wcard"' + action + '>' +
        '<span class="wcard__cls"><span>' + esc(CLASSES[w.cls].name) + '</span>' + (w.measured ? '<span class="tag">실측</span>' : '') + '</span>' +
        '<span class="wcard__name">' + esc(w.name) + '</span>' +
        '<span class="wcard__cal">' + esc(w.caliber) + ' · ' + esc(w.fire) + '</span>' +
        dmgBlock +
        '<dl class="wcard__stats">' +
        '<div><dt>연사' + (w.rpmM ? ' 실측' : '') + '</dt><dd>' + (rpm ? num(rpm) : '—') + '</dd></div>' +
        '<div><dt>가격</dt><dd>' + money(w.price) + '</dd></div>' +
        '<div><dt>유효 사거리</dt><dd>' + (w.range ? num(w.range) + ' m' : '—') + '</dd></div>' +
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
        '<span class="scard__role">' + esc(s.role) + '</span>' +
        '<h3 class="scard__name">' + esc(s.name) + '</h3>' +
        '<p class="scard__dmg">' + s.dmg + '<span>1발 피해</span></p>' +
        '<dl class="scard__stats">' + s.stats.map(function (p) {
          return '<div><dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        '<p class="scard__note">' + esc(s.note) + '</p></article>';
    }).join('');

    var maxHp = Math.max.apply(null, D.buildables.map(function (b) { return b.hp; }));
    $('#buildables').innerHTML = D.buildables.map(function (b) {
      return '<li><span class="hpbar__name">' + esc(b.name) + '</span>' +
        '<span class="hpbar__track"><i style="width:' + (b.hp / maxHp * 100).toFixed(1) + '%"></i></span>' +
        '<span class="hpbar__val">' + num(b.hp) + '</span></li>';
    }).join('');

    var demo = D.demolition;
    $('#demolition').innerHTML =
      '<thead><tr><th scope="col">대상</th>' + demo.tools.map(function (t) { return '<th scope="col">' + esc(t) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + demo.rows.map(function (r) {
        var min = Math.min.apply(null, r.counts);
        return '<tr><th scope="row">' + esc(r.target) + '</th>' + r.counts.map(function (c) {
          return '<td class="' + (c === min ? 'is-best' : '') + '">' + c + '개</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
  }

  var BLAST_SRC = D.explosives.filter(function (x) { return x.dmg != null && x.radius != null; })
    .concat(D.ordnance.filter(function (x) { return x.radius != null; }));

  function renderBlast() {
    var x = BLAST_SRC.filter(function (b) { return b.id === blastState.src; })[0] || BLAST_SRC[0];
    var range = $('#blast-range');
    range.max = x.radius;
    if (blastState.d > x.radius) blastState.d = x.radius;
    range.value = blastState.d;

    segment($('#blast-src'), BLAST_SRC.map(function (b) { return { id: b.id, label: b.name }; }), x.id, function (id) {
      blastState.src = id; renderBlast();
    });

    var d = blastState.d;
    var dmg = blastDamage(x, d);
    $('#blast-out').textContent = d.toFixed(1) + ' m';

    var outcome = dmg >= D.hp ? '즉사' : dmg <= 0 ? '피해 없음' : '체력 ' + Math.round(D.hp - dmg) + ' 남음';
    $('#blast-result').innerHTML =
      '<div class="blast__cell"><span>받는 피해</span><b>' + Math.round(dmg) + '</b></div>' +
      '<div class="blast__cell"><span>체력 100 기준</span><b>' + outcome + '</b></div>';
    $('#blast-meta').textContent = x.name + ' · 최대 ' + x.dmg + ', 반경 ' + x.radius + ' m' +
      (x.full ? ', 최대 피해 ' + x.full + ' m까지' : '') + (x.edge ? ', 가장자리 ' + x.edge : '');

    // 도식: 중심(200,200), 반경 x.radius → 180px
    var R = 180, scale = R / x.radius;
    var fr = (x.full || 0) * scale;
    var px = 200 + d * scale;
    var ticks = '';
    var step = x.radius > 12 ? 4 : x.radius > 6 ? 2 : 1;
    for (var m = 0; m <= x.radius; m += step) {
      var tx = 200 + m * scale;
      ticks += '<line x1="' + tx + '" y1="206" x2="' + tx + '" y2="212" stroke="currentColor" stroke-opacity=".5"/>' +
        '<text x="' + tx + '" y="226" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".6">' + m + '</text>';
    }
    $('#blast-viz').innerHTML =
      '<svg viewBox="0 0 400 400" role="img" aria-label="' + esc(x.name) + ' 폭발 반경 ' + x.radius + 'm, 거리 ' + d.toFixed(1) + 'm에서 피해 ' + Math.round(dmg) + '" style="color:var(--ink-fg)">' +
      '<defs><radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">' +
      '<stop offset="' + (fr / R * 100).toFixed(1) + '%" stop-color="#ff9f0a" stop-opacity=".9"/>' +
      '<stop offset="100%" stop-color="#ff9f0a" stop-opacity="' + (x.edge ? (x.edge / x.dmg * 0.9).toFixed(2) : 0) + '"/></radialGradient></defs>' +
      '<circle cx="200" cy="200" r="' + R + '" fill="url(#bg-grad)"/>' +
      '<circle cx="200" cy="200" r="' + R + '" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 5"/>' +
      (fr > 0 ? '<circle cx="200" cy="200" r="' + fr + '" fill="none" stroke="currentColor" stroke-opacity=".8"/>' +
        '<text x="200" y="' + (200 - fr - 8) + '" text-anchor="middle" font-size="12" fill="currentColor">최대 피해 ' + x.full + ' m</text>' : '') +
      '<text x="200" y="' + (200 - R + 18) + '" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity=".7">폭발 반경 ' + x.radius + ' m</text>' +
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
        ['가격', money(x.price)],
        ['기폭', x.trigger || '—'],
        ['해금', x.unlock || '—'],
        ['참고', x.note || '—']
      ];
      var radius = x.radius != null
        ? '폭발 반경 ' + x.radius + ' m' + (x.full ? ' · 최대 피해 ' + x.full + ' m' : '') + (x.edge ? ' · 가장자리 ' + x.edge : '')
        : '반경 미공개';
      return '<article class="ecard">' +
        '<span class="ecard__kind">' + esc(x.kind) + '</span>' +
        '<h3 class="ecard__name">' + esc(x.name) + '</h3>' +
        (x.dmg != null ? '<p class="ecard__dmg">' + x.dmg + '</p>' : '<p class="ecard__dmg ecard__dmg--na">피해 미공개</p>') +
        '<span class="ecard__radius">' + radius + '</span>' +
        '<ul class="ecard__list">' + rows.map(function (r) {
          return '<li><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></li>';
        }).join('') + '</ul></article>';
    }).join('');
  }

  function renderVehicles() {
    $('#vehicle-cards').innerHTML = D.vehicles.map(function (v) {
      var weapons = v.weapons.length
        ? '<ul class="vcard__weapons">' + v.weapons.map(function (wp) {
          var val = wp.perRound ? '탄 ' + wp.dmg : String(wp.dmg);
          return '<li><span><b>' + esc(wp.name) + '</b><small>' + esc(wp.ammo) + (wp.blast ? ' · ' + esc(wp.blast) : '') + '</small></span><span class="vcard__dmg">' + val + '</span></li>';
        }).join('') + '</ul>'
        : '<p class="vcard__note">무장 없음</p>';
      return '<article class="vcard">' +
        '<span class="vcard__kind">' + esc(v.kind) + '</span>' +
        '<h3 class="vcard__name">' + esc(v.name) + '</h3>' +
        '<dl class="vcard__stats">' +
        '<div><dt>선체 내구도</dt><dd>' + num(v.hp) + '</dd></div>' +
        '<div><dt>좌석</dt><dd>' + (v.seats || '—') + '</dd></div>' +
        '<div><dt>최고 속도</dt><dd>' + (v.speed ? v.speed + ' km/h' : '—') + '</dd></div>' +
        '</dl>' + weapons + (v.note ? '<p class="vcard__note">' + esc(v.note) + '</p>' : '') + '</article>';
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
      '<li><b>' + fmt1(base) + '</b><span>' + esc(w.name) + ' 기본 피해' + (w.pellets ? ' (' + w.dmg + ' × 펠릿 ' + w.pellets + ')' : '') + '</span></li>' +
      '<li><b>' + fmt1(afterZone) + '</b><span>' + esc(CLASSES[w.cls].name) + ' 머리 배율 ×' + fmt2(mult) + '</span></li>' +
      '<li><b>' + fmt1(final) + '</b><span>' + esc(ammo.name) + ' ×' + ammoMult.toFixed(1) +
      (guarded ? ', ' + esc(helmet.name) + ' ' + pct(helmet.reduction) : ', 헬멧 없음') + '</span></li>' +
      '<li><b>' + shotsToKill(final) + '발</b><span>체력 100 ÷ ' + fmt1(final) + ', 올림</span></li>';
  }

  function renderClassTable() {
    var groups = D.zoneGroups;
    $('#class-table').innerHTML =
      '<thead><tr><th scope="col">무기 종류</th>' + groups.map(function (g) { return '<th scope="col">' + g.name + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + CLASS_ROWS.map(function (row) {
        var cm = D.classMults[row.ids[0]];
        var est = cm.est || [];
        return '<tr><th scope="row">' + esc(row.name) + '</th>' + groups.map(function (g) {
          return '<td>×' + fmt2(cm[g.id]) + (est.indexOf(g.id) >= 0 ? ' <span class="tag">추정</span>' : '') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';

    $('#zone-ratio').innerHTML = D.zones.filter(function (z) { return z.k !== 1; }).map(function (z) {
      var g = groups.filter(function (x) { return x.id === z.group; })[0];
      return '<li><b>' + esc(z.name) + '</b> = ' + esc(g.name) + ' × ' + z.k + '</li>';
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
        return ZONES[zid].name + ' ' + meas + ' / ' + fmt2(calc);
      });
      rows.push('<tr><th scope="row">' + esc(w.name) + '</th><td>' + esc(CLASSES[w.cls].name) + '</td><td>' + esc(cells.join(' · ')) + '</td></tr>');
    });
    $('#verify-summary').textContent = '사격장 실측 ' + total + '개 값 가운데 ' + pass + '개가 계산과 일치합니다 (최대 오차 ' + fmt2(worst) + ').';
    $('#verify-table tbody').innerHTML = rows.join('');
  }

  /* ───────── 히어로 ───────── */

  function initHero() {
    var w = WEAPONS.m4, fmj = AMMO.fmj, none = D.armor[0];
    var steps = D.helmets.map(function (h) {
      var dmg = hit(w, 'head', fmj, none, h).dmg;
      return { h: h, dmg: dmg, n: shotsToKill(dmg) };
    });
    var list = $('#hero-steps');
    list.innerHTML = steps.map(function (s, i) {
      return '<li><button type="button" data-i="' + i + '" aria-label="' + esc(s.h.name) + '">' +
        '<span class="bar"><i></i></span><b>' + s.n + '발</b><span>' + s.h.short + '</span></button></li>';
    }).join('');

    var idx = 0, timer = null;
    var numEl = $('#hero-dmg');
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(i) {
      idx = i;
      var s = steps[i];
      numEl.classList.add('is-swap');
      setTimeout(function () {
        numEl.textContent = fmt1(s.dmg);
        numEl.classList.remove('is-swap');
      }, reduce ? 0 : 180);
      $('#hero-state').textContent = s.h.name + ' · ' + s.n + '발';
      Array.prototype.forEach.call(list.querySelectorAll('button'), function (b, j) {
        b.classList.toggle('is-on', j === i);
        b.classList.toggle('is-past', j < i);
        b.setAttribute('aria-pressed', String(j === i));
      });
    }
    function tick() { show((idx + 1) % steps.length); }
    function play() { if (!reduce && !timer) timer = setInterval(tick, 2600); }
    function stop() { clearInterval(timer); timer = null; }

    list.onclick = function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      stop();
      show(+b.getAttribute('data-i'));
      play();
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });

    show(0);
    play();

    $('#hero2-figure').innerHTML = bodySVG({ fill: { head: 'is-hl', neck: 'is-hl' } }, 'Level 4 헬멧 보호 부위: 머리와 목');
  }

  function initTiles() {
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

  function initChapterNav() {
    var items = D.classes.map(function (c) {
      return { count: c.total, label: c.name, href: '#weapons', cls: c.id };
    }).concat([
      { count: D.explosives.length, label: '폭발물', href: '#explosives' },
      { count: D.structures.length, label: '건축물 장비', href: '#structures' },
      { count: D.vehicles.length, label: '차량', href: '#vehicles' }
    ]);
    var ul = $('#chapternav');
    ul.innerHTML = items.map(function (it) {
      return '<li class="chapternav__item"><a href="' + it.href + '"' + (it.cls ? ' data-cls="' + it.cls + '"' : '') + '>' +
        '<span class="chapternav__count">' + it.count + '</span><span>' + esc(it.label) + '</span></a></li>';
    }).join('');
    ul.onclick = function (e) {
      var a = e.target.closest('a[data-cls]');
      if (!a) return;
      listState.cls = a.getAttribute('data-cls');
      renderWeaponFilter();
      renderWeapons();
    };
  }

  function initNav() {
    var menu = $('#gnav-menu');
    var links = $('#gnav-links');
    menu.onclick = function () {
      var open = links.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    };
    links.onclick = function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', '메뉴 열기');
      }
    };
    $('#gnav-search').addEventListener('click', function () {
      setTimeout(function () { $('#weapon-search').focus({ preventScroll: true }); }, 400);
    });

    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-compare]');
      if (c) { compareKind = c.getAttribute('data-compare'); renderCompare(); }
      var h = e.target.closest('[data-apply-helmet]');
      if (h) { state.helmet = +h.getAttribute('data-apply-helmet'); renderCalc(); }
    });
  }

  function initFooter() {
    $('#data-version').textContent = D.version;
    $('#source-list').innerHTML = D.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>';
    }).join('');
  }

  /* ───────── 시작 ───────── */

  $('#weapon-search').addEventListener('input', function (e) {
    listState.q = e.target.value;
    renderWeapons();
  });
  $('#blast-range').addEventListener('input', function (e) {
    blastState.d = +e.target.value;
    renderBlast();
  });

  initNav();
  initChapterNav();
  initHero();
  initTiles();
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
  initFooter();
})();
