/*
 * Smoke test: builds a realistic "시퀀스 01" in the mock DOM, runs PremiumEdit.jsx, then checks
 *   - original sequence untouched
 *   - story clips in the same order, no Black Video, no gaps
 *   - every frame is fully covered by an opaque story clip (no black edges from scale/rotation/position)
 *   - overlays / music handled
 * Usage: node premiere/test/run_test.js [--ko] [--fps=24] [--dump=path.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('./mock_premiere');

const args = process.argv.slice(2);
const locale = args.includes('--ko') ? 'ko' : 'en';
const fps = Number((args.find((a) => a.startsWith('--fps=')) || '--fps=30').slice(6));
const dump = (args.find((a) => a.startsWith('--dump=')) || '').slice(7);
for (const f of ['inclusiveOut', 'noUnlink', 'noQE', 'strayKey']) if (args.includes('--' + f)) M.FLAGS[f] = true;
const env = M.install();
const { TPS } = M;
const F = Math.round(TPS / fps);
const sec = (s) => Math.round(s * fps) * F;

// ---------------- build source sequence ----------------
const P = (o) => new M.ProjectItem(o);
const media = {
  city: P({ name: 'city_night.mp4', path: '/m/city_night.mp4', durSec: 20, hasAudio: true }),
  coffee: P({ name: 'coffee.mov', path: '/m/coffee.mov', durSec: 6, hasAudio: true }),
  uhd: P({ name: 'drone_4k.mp4', path: '/m/drone_4k.mp4', w: 3840, h: 2160, durSec: 30, hasAudio: false }),
  photo: P({ name: 'portrait.jpg', path: '/m/portrait.jpg', w: 4000, h: 3000, still: true }),
  full: P({ name: 'waves_full.mp4', path: '/m/waves_full.mp4', durSec: 3.5, hasAudio: true }),
  vert: P({ name: 'phone_vertical.mp4', path: '/m/phone_vertical.mp4', w: 1080, h: 1920, durSec: 12, hasAudio: true }),
  hands: P({ name: 'hands.mp4', path: '/m/hands.mp4', durSec: 8, hasAudio: true }),
  shortc: P({ name: 'flash.mp4', path: '/m/flash.mp4', durSec: 4, hasAudio: false }),
  last: P({ name: 'sunset.mp4', path: '/m/sunset.mp4', durSec: 15, hasAudio: true }),
  black: P({ name: locale === 'ko' ? '블랙 비디오' : 'Black Video', path: '', hasVideo: true }),
  logo: P({ name: 'logo.png', path: '/m/logo.png', w: 600, h: 200, still: true }),
  adj: P({ name: 'Adjustment Layer', path: '', adjust: true }),
  music: P({ name: 'bgm.mp3', path: '/m/bgm.mp3', hasVideo: false, hasAudio: true, durSec: 120, w: 0 }),
  vo: P({ name: 'city_night.mp4', path: '/m/city_night.mp4', durSec: 20, hasAudio: true }), // unlinked audio of a video file
};
media.black.still = true; media.adj.still = true;

const srcName = locale === 'ko' ? '시퀀스 01' : 'Sequence 01';
if (args.includes('--tcOffset')) { media.city.tcOffset = 3600 * TPS; media.music.tcOffset = 36000 * TPS; }  // timecode starts
const src = new M.Sequence(env.project, srcName, { frameTicks: F, locale, nV: args.includes('--oneTrack') ? 1 : 3 });
env.project.sequences.push(src);
env.project.activeSequence = src;

function put(trackKind, idx, pi, startS, inS, durS, opts = {}) {
  const tr = src[trackKind][idx];
  const it = new M.TrackItem(tr, pi, sec(startS), sec(inS), sec(inS) + sec(durS));
  tr.items.push(it);
  if (opts.motion) {
    const mo = it.components.find((c) => c.matchName === 'AE.ADBE Motion');
    for (const [k, v] of Object.entries(opts.motion)) mo.properties[k]._v = v;
  }
  return it;
}
function av(idx, pi, startS, inS, durS, opts) {
  const v = put('videoTracks', idx, pi, startS, inS, durS, opts);
  if (pi.hasAudio && !opts?.noAudio) { const a = put('audioTracks', idx, pi, startS, inS, durS); const link = { members: [v, a] }; v.link = a.link = link; }
  return v;
}

let t = 0;
const REF = args.includes('--refScenario');
const ONE = args.includes('--oneTrack');
if (REF) {
  // rhythm of the MOVLABS reference: hero shots ~3s, detail shots ~1.1s, black title gaps between groups
  const shots = [['ref_hero_front', 3.4], ['ref_bracket', 1.1], ['ref_wallmount', 1.1], null, ['ref_detail', 1.1], ['ref_base', 1.15],
    ['ref_logo', 1.2], null, ['ref_hero_back', 1.1], ['ref_logo_light', 0.95], ['ref_turntable', 5.0], ['ref_hero_end', 1.6]];
  for (const sh of shots) {
    if (!sh) { put('videoTracks', 0, media.black, t, 0, 1.1); t += 1.1; continue; }
    const pi = P({ name: sh[0] + '.mp4', path: '/m/' + sh[0] + '.mp4', durSec: sh[1] + 6, hasAudio: false });
    media[sh[0]] = pi;
    av(0, pi, t, 3.0, sh[1]); t += sh[1];
  }
} else {
put('videoTracks', 0, media.black, t, 0, 1.0); t += 1.0;                 // black at start
av(0, media.city, t, 2.0, 4.2); t += 4.2;                                  // handles both sides
av(0, media.coffee, t, 0.0, 2.6); t += 2.6;                                // no head handle
put('videoTracks', 0, media.black, t, 0, 0.8); t += 0.8;                  // black between
av(0, media.uhd, t, 5.0, 3.4, { motion: { 1: 50 } }); t += 3.4;           // 4K at 50%
av(0, media.photo, t, 0.0, args.includes('--longStill') ? 7.0 : 3.0); t += args.includes('--longStill') ? 7.0 : 3.0;   // still
t += 0.5;                                                                  // empty gap
av(0, media.full, t, 0.0, 3.5); t += 3.5;                                  // whole file, no handles
av(0, media.vert, t, 1.0, 2.8); t += 2.8;                                  // vertical in 16:9
av(0, media.hands, t, 1.5, 3.0, { noAudio: true }); t += 3.0;              // user removed clip audio
av(0, media.shortc, t, 0.5, 0.6); t += 0.6;                                // very short
if (ONE) { av(0, media.hands, t, 5.0, 2.2); t += 2.2; }
else { av(1, media.hands, t - 0.3, 5.0, 2.2); t += 1.9; }                // on V2, overlapping previous by 0.3s
av(0, media.last, t, 3.0, 6.0); t += 6.0;
put('videoTracks', 0, media.black, t, 0, 1.5); t += 1.5;                  // black at end
}
const srcEnd = t;
if (!ONE && !REF) put('videoTracks', 2, media.logo, 2.0, 0, 3.0, { motion: { 0: [0.85, 0.12], 1: 40 } });      // logo overlay (V3)
if (!ONE && !REF) put('videoTracks', 1, media.adj, 9.0, 0, 5.0);                              // adjustment layer on V2
put('audioTracks', 2, media.music, 0, 0, srcEnd);                          // music on A3 spanning all
if (!REF) put('audioTracks', 1, media.vo, 0.5, 11.0, 0.5);                 // unlinked audio from a video file

const snapshot = (seq) => JSON.stringify(seq.allItems().map((i) => [i.track.kind, i.track.idx, i._start, i._in, i._out, i._name]));
const before = snapshot(src);

// ---------------- run script ----------------
const SOFT = args.includes('--soft');
let code = fs.readFileSync(path.join(__dirname, '..', 'PremiumEdit.jsx'), 'utf8');
if (SOFT) code = code.replace('STYLE: "REFERENCE"', 'STYLE: "SOFT"');
const fadeSec = (key) => (SOFT ? 0 : Number(code.match(new RegExp(key + ':\\s*([\\d.]+)'))[1]));
const openF = Math.round(fadeSec('OPEN_FADE_SEC') * fps), endF = Math.round(fadeSec('END_FADE_SEC') * fps);
const t0 = Date.now();
const result = vm.runInThisContext(code, { filename: 'PremiumEdit.jsx' });
const elapsed = Date.now() - t0;

// ---------------- verify ----------------
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
check(snapshot(src) === before, 'original sequence was modified');
const ns = env.project.sequences.find((s) => s !== src);
check(!!ns, 'new sequence not created');
check(ns && /Premium Edit/.test(ns.name), 'new sequence name: ' + (ns && ns.name));
check(!/스크립트 오류/.test(String(result)), 'script error: ' + result);
for (const p of Object.values(media)) check(p._in === null && p._out === null, 'marks not restored on ' + p.name);

const storyTracks = SOFT ? [0, 1] : [0];
const V = storyTracks.filter((i) => ns.videoTracks[i]).flatMap((i) => ns.videoTracks[i].items).sort((a, b) => a._start - b._start);
const order = V.map((i) => i.pi.name);
const srcStory = [0, 1].flatMap((i) => src.videoTracks[i] ? src.videoTracks[i].items : [])
  .filter((i) => !/black|블랙/i.test(i.pi.name) && !i.pi.adjust).sort((a, b) => a._start - b._start);
const expected = srcStory.map((i) => i.pi.name);
check(JSON.stringify(order) === JSON.stringify(expected), 'order mismatch: ' + order.join(', '));
check(!ns.allItems().some((i) => /black|블랙/i.test(i.pi.name)), 'black video present');

const param = (it, comp, idx) => it.components.find((c) => c.matchName === comp).properties[idx];
const valAt = (it, comp, idx, seqT) => param(it, comp, idx).getValueAtTime(M.T(it._in + (seqT - it._start)));

// geometry: does the transformed clip cover the whole frame?
function covers(it, seqT) {
  const W = ns.W, H = ns.H, pi = it.pi;
  const pos = valAt(it, 'AE.ADBE Motion', 0, seqT), sc = valAt(it, 'AE.ADBE Motion', 1, seqT) / 100, rot = valAt(it, 'AE.ADBE Motion', 4, seqT) * Math.PI / 180;
  const anc = valAt(it, 'AE.ADBE Motion', 5, seqT);
  const cw = pi.w * pi.par, ch = pi.h;
  for (const [qx, qy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const vx = qx - pos[0] * W, vy = qy - pos[1] * H;
    const lx = Math.cos(rot) * vx + Math.sin(rot) * vy, ly = -Math.sin(rot) * vx + Math.cos(rot) * vy;
    const ux = lx / sc + anc[0] * cw, uy = ly / sc + anc[1] * ch;
    if (ux < -0.5 || ux > cw + 0.5 || uy < -0.5 || uy > ch + 0.5) return false;
  }
  return true;
}
const end = Math.max(...V.map((i) => i.endT()));
let black = 0, edge = 0, letterboxFrames = 0;
const stats = { maxScale: 0, maxRot: 0, minOpUpper: 100 };
for (let f = 0; f * F < end; f++) {
  const tt = f * F;
  const act = V.filter((i) => i._start <= tt && i.endT() > tt);
  if (f < openF || f >= Math.round(end / F) - endF) continue;          // intended opening fade-in / ending fade-out
  if (!act.length) { black++; continue; }
  const opaque = act.filter((i) => valAt(i, 'AE.ADBE Opacity', 0, tt) >= 99.5);
  if (!opaque.length) { black++; continue; }
  const lb = opaque.every((i) => i.pi.name === 'phone_vertical.mp4');
  if (lb) { letterboxFrames++; continue; }
  if (!opaque.some((i) => covers(i, tt))) edge++;
  for (const i of act) {
    stats.maxScale = Math.max(stats.maxScale, valAt(i, 'AE.ADBE Motion', 1, tt) / (i.pi.name === 'drone_4k.mp4' ? 50 : 100));
    stats.maxRot = Math.max(stats.maxRot, Math.abs(valAt(i, 'AE.ADBE Motion', 4, tt)));
  }
}
check(black === 0, `${black} frames with no opaque story clip (black)`);
check(edge === 0, `${edge} frames with black edges (clip does not cover frame)`);

// every placed story clip has motion keys, no stray keys
for (const it of V) {
  const sc = param(it, 'AE.ADBE Motion', 1);
  check(sc.isTimeVarying() && sc._keys.size >= 2, 'no scale keys on ' + it.pi.name);
  for (const k of sc._keys.keys()) check(k >= it._in && k <= it._out, `key outside clip ${it.pi.name}`);
}
// overlay copied with its motion on V3+
const logo = ns.allItems().find((i) => i.pi === media.logo);
if (!ONE && !REF) check(logo && logo.track.idx >= (SOFT ? 2 : 1), 'logo overlay not above story track');
if (!ONE && !REF) check(logo && Math.abs(param(logo, 'AE.ADBE Motion', 1).getValue() - 40) < 1e-6, 'logo scale not copied');
// music trimmed to video end, faded out, on its own track
const music = ns.allItems().filter((i) => i.pi === media.music);
check(music.length === 1, 'music count ' + music.length);
if (music[0]) {
  check(Math.abs(music[0].endT() - end) <= F, 'music not trimmed to video end');
  const lv = music[0].components[0].properties[1];
  check(lv.isTimeVarying() && lv.getValueAtTime(M.T(music[0]._out - 1)) < 0.01, 'music not faded out');
}
// hands.mp4 (first use) had no audio in the original -> none in the new sequence at that spot
const handsV = V.filter((i) => i.pi === media.hands)[0] || { _start: -1e18 };
check(!ns.audioTracks.some((tr) => tr.items.some((a) => a.pi === media.hands && Math.abs(a._start - handsV._start) < F && !a.disabled)), 'removed clip audio came back');

// each story clip shows the same source frames as the original (head/tail may be extended for dissolves)
srcStory.forEach((o, n) => {
  const nw = V[n];
  if (!nw || o.pi.still) return;
  // visible part in the original: a following clip on a higher track hides the tail
  const nx = srcStory[n + 1];
  const hidden = nx && nx._start < o.endT() && nx.track.idx > o.track.idx ? o.endT() - nx._start : 0;
  check(nw._in <= o._in + 1 && nw._out >= Math.min(o._out - hidden, o.pi.mediaEnd()) - F, `source range differs for ${o.pi.name}: new [${nw._in / TPS}, ${nw._out / TPS}] vs orig [${o._in / TPS}, ${o._out / TPS}]`);
});
// music keeps its source in-point
if (music[0]) check(music[0]._in === 0, 'music in-point moved: ' + music[0]._in / TPS);

const report = {
  locale, fps, elapsedMs: elapsed, newSequence: ns && ns.name, durationSec: +(end / TPS).toFixed(2), sourceDurationSec: srcEnd,
  frames: Math.round(end / F), blackFrames: black, edgeFrames: edge, letterboxFrames,
  maxScaleFactor: +stats.maxScale.toFixed(3), maxRotationDeg: +stats.maxRot.toFixed(2),
  videoItems: ns.videoTracks.map((tr) => tr.items.length), audioItems: ns.audioTracks.map((tr) => tr.items.length),
  keys: V.map((i) => ({ clip: i.pi.name, track: 'V' + (i.track.idx + 1), start: +(i._start / TPS).toFixed(2), end: +(i.endT() / TPS).toFixed(2),
    scale: param(i, 'AE.ADBE Motion', 1)._keys.size, pos: param(i, 'AE.ADBE Motion', 0)._keys.size,
    rot: param(i, 'AE.ADBE Motion', 4)._keys.size, op: param(i, 'AE.ADBE Opacity', 0)._keys.size })),
};
console.log(JSON.stringify(report, null, 1));
console.log('\n--- alert ---\n' + global.__lastAlert);
if (args.includes('--log')) console.log(env.logs.join('\n'));
if (dump) {
  const clips = V.map((i) => {
    const mo = (idx) => [...param(i, 'AE.ADBE Motion', idx)._keys.entries()].map(([k, v]) => [(k - i._in) / F, v]);
    return { name: i.pi.name, w: i.pi.w, h: i.pi.h, still: i.pi.still, track: i.track.idx, startF: i._start / F, endF: i.endT() / F, inF: i._in / F,
      pos: mo(0), scale: mo(1), rot: mo(4), op: [...param(i, 'AE.ADBE Opacity', 0)._keys.entries()].map(([k, v]) => [(k - i._in) / F, v]),
      staticPos: param(i, 'AE.ADBE Motion', 0)._v, staticScale: param(i, 'AE.ADBE Motion', 1)._v, staticRot: param(i, 'AE.ADBE Motion', 4)._v, staticOp: param(i, 'AE.ADBE Opacity', 0)._v };
  });
  fs.writeFileSync(dump, JSON.stringify({ W: ns.W, H: ns.H, fps, frames: Math.round(end / F), clips }, null, 1));
}
if (fails.length) { console.error('\nFAIL:\n - ' + fails.filter(Boolean).join('\n - ')); process.exit(1); }
console.log('\nPASS');
