#!/usr/bin/env node
/*
 * js/patches.js 형식 검사. 새 패치를 넣은 뒤 반드시 돌린다.
 *   node tools/check-patches.js
 * 문제가 있으면 목록을 출력하고 종료 코드 1로 끝난다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

global.window = { WD_DATA: {} };
eval(read('js/i18n.js'));
eval(read('js/patches.js'));
const P = window.WD_DATA.patches;
const S = window.WD_I18N.strings;
const html = read('index.html');

const LANGS = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant'];
const CATS = ['balance', 'gameplay', 'stability', 'fair', 'ui'];
const TYPES = ['season', 'patch', 'hotfix'];
const LEVELS = ['ok', 'updated', 'pending'];
const HANGUL = /[가-힣]/;
const CJK = /[぀-ヿ一-鿿]/;

const errors = [];
const err = (where, msg) => errors.push(where + ': ' + msg);

function checkT(v, where) {
  if (!v || typeof v !== 'object') return err(where, '5개 언어 객체 T(...)가 아닙니다');
  LANGS.forEach((l) => {
    const s = v[l];
    if (typeof s !== 'string' || !s.trim()) return err(where, l + ' 문구가 비었습니다');
    if (l === 'ko' && !HANGUL.test(s) && !/^[\x00-\x7f]+$/.test(s)) err(where, 'ko 문구에 한글이 없습니다');
    if (l !== 'ko' && HANGUL.test(s)) err(where, l + ' 문구에 한글이 섞였습니다');
    if (l === 'en' && CJK.test(s)) err(where, 'en 문구에 한자·가나가 섞였습니다');
  });
}
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T00:00:00Z'));

function checkLab(lab, where) {
  if (lab == null) return;
  LANGS.forEach((l) => { if (!S[l]['nav.' + lab]) err(where, 'lab "' + lab + '"에 맞는 nav.' + lab + ' 문구가 ' + l + '에 없습니다'); });
  const target = lab === 'weight' ? 'data-tab="weight"' : 'id="' + lab + '"';
  if (!html.includes(target)) err(where, 'lab "' + lab + '"이 가리킬 섹션이 index.html에 없습니다');
}

function checkEntry(p, where, isNext) {
  if (!isDate(p.date)) err(where, '날짜는 YYYY-MM-DD 형식이어야 합니다');
  if (!isNext) {
    if (!/^[a-z0-9-]+$/.test(p.id || '')) err(where, 'id는 소문자·숫자·하이픈만 씁니다');
    if (TYPES.indexOf(p.type) < 0) err(where, 'type은 ' + TYPES.join('/') + ' 중 하나');
    if (p.version != null && typeof p.version !== 'string') err(where, 'version은 문자열이나 null');
    if (p.downtime != null) checkT(p.downtime, where + '.downtime');
  }
  checkT(p.title, where + '.title');
  checkT(p.summary, where + '.summary');
  if (!p.impact || typeof p.impact.some !== 'boolean') err(where, 'impact.some(true/false)이 필요합니다');
  else checkT(p.impact.text, where + '.impact.text');
  if (!Array.isArray(p.items) || !p.items.length) err(where, 'items가 비었습니다');
  (p.items || []).forEach((it, i) => {
    const w = where + '.items[' + i + ']';
    if (CATS.indexOf(it.cat) < 0) err(w, 'cat은 ' + CATS.join('/') + ' 중 하나');
    checkT(it.text, w);
    checkLab(it.lab, w);
  });
  (p.tables || []).forEach((tb, i) => {
    const w = where + '.tables[' + i + ']';
    if (CATS.indexOf(tb.cat) < 0) err(w, 'cat이 잘못됐습니다');
    checkT(tb.title, w + '.title');
    (tb.rows || []).forEach((r, j) => {
      if (!Array.isArray(r) || r.length !== 3) return err(w + '.rows[' + j + ']', '[이름, 이전, 이후] 세 칸이어야 합니다');
      if (typeof r[0] !== 'string') checkT(r[0], w + '.rows[' + j + '][0]');
      if (typeof r[1] !== 'string' || typeof r[2] !== 'string') err(w + '.rows[' + j + ']', '이전·이후 값은 문자열');
    });
  });
  if (!Array.isArray(p.sources) || !p.sources.length) err(where, '출처(sources)가 없습니다');
  (p.sources || []).forEach((src, i) => {
    if (!src.site || !/^https:\/\/\S+$/.test(src.url || '')) err(where + '.sources[' + i + ']', 'site와 https 주소가 필요합니다');
  });
}

if (!P) {
  console.error('window.WD_DATA.patches가 없습니다');
  process.exit(1);
}

// 맨 위 요약
if (!P.check || LEVELS.indexOf(P.check.level) < 0) err('check', 'level은 ' + LEVELS.join('/') + ' 중 하나');
else { checkT(P.check.title, 'check.title'); checkT(P.check.body, 'check.body'); }

// 다음 업데이트 (없으면 null)
if (P.next) checkEntry(P.next, 'next', true);

// 목록: 최신이 위, id 중복 없음
const ids = new Set();
(P.list || []).forEach((p, i) => {
  const where = 'list[' + i + '] ' + (p.id || '?');
  checkEntry(p, where, false);
  if (ids.has(p.id)) err(where, 'id가 중복됩니다');
  ids.add(p.id);
  const prev = P.list[i - 1];
  if (prev && prev.date < p.date) err(where, '날짜가 위 항목(' + prev.date + ')보다 늦습니다. 최신 항목이 맨 위에 와야 합니다');
});
if (!P.list || !P.list.length) err('list', '비었습니다');

if (errors.length) {
  console.error('patches.js 검사 실패 (' + errors.length + '건)');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log('patches.js OK · 업데이트 ' + P.list.length + '건 · 최신 ' + P.list[0].date + ' ' + P.list[0].id + (P.next ? ' · 다음 ' + P.next.date : ''));
