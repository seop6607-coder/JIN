#!/usr/bin/env node
/*
 * 브라우저 스모크 테스트: 5개 언어 × 데스크톱·휴대폰 × 3개 탭.
 *   node tools/smoke.js
 * 페이지 오류, 가로 넘침, 번역 키 노출, 다른 언어에 섞인 한글, 탭 전환을 확인한다.
 * Playwright가 필요하다 (전역 설치본을 찾아 쓴다).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* 전역 설치본으로 */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return require(path.join(globalRoot, 'playwright'));
}
const { chromium } = loadPlaywright();

const root = path.join(__dirname, '..');
global.window = {};
eval(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8'));
const keys = Object.keys(window.WD_I18N.strings.ko).filter((k) => k.includes('.'));
const url = 'file://' + path.join(root, 'index.html');

(async () => {
  const browser = await chromium.launch();
  const fails = [];
  for (const lang of ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant']) {
    for (const vw of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.addInitScript((l) => {
        try {
          if (!sessionStorage.getItem('smoke')) { localStorage.clear(); localStorage.setItem('wd-lang', l); sessionStorage.setItem('smoke', '1'); }
        } catch (e) { /* 무시 */ }
      }, lang);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      for (const tab of ['damage', 'weight', 'patch']) {
        await page.click('#tabs a[data-tab="' + tab + '"]');
        await page.waitForTimeout(200);
        const r = await page.evaluate((keys) => {
          const text = document.body.innerText;
          return {
            ov: document.documentElement.scrollWidth - innerWidth,
            visible: [...document.querySelectorAll('.tabpanel')].filter((x) => !x.hidden).map((x) => x.id).join(),
            hangul: [...new Set(text.match(/[가-힣]+/g) || [])].filter((h) => h !== '한국어'),
            rawKeys: keys.filter((k) => text.includes(k))
          };
        }, keys);
        const where = lang + ' ' + vw + 'px ' + tab;
        if (r.visible !== 'panel-' + tab) fails.push(where + ': 열린 탭이 ' + r.visible);
        if (r.ov > 0) fails.push(where + ': 가로로 ' + r.ov + 'px 넘침');
        if (r.rawKeys.length) fails.push(where + ': 번역 키 노출 ' + r.rawKeys.slice(0, 5).join(', '));
        if (lang !== 'ko' && r.hangul.length) fails.push(where + ': 한글 섞임 ' + r.hangul.slice(0, 5).join(', '));
      }
      if (errs.length) fails.push(lang + ' ' + vw + 'px: 페이지 오류 ' + errs.join(' | '));
      await page.close();
    }
  }
  await browser.close();
  if (fails.length) {
    console.error('스모크 테스트 실패 (' + fails.length + '건)');
    fails.forEach((f) => console.error(' - ' + f));
    process.exit(1);
  }
  console.log('스모크 테스트 OK · 5개 언어 × 2개 화면 × 3개 탭');
})().catch((e) => { console.error(e); process.exit(1); });
