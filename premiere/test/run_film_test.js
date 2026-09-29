/*
 * Smoke test for MELT2_BrandFilm.jsx in the mock Premiere DOM.
 * Builds a project that looks like the user's (4K camera takes C63xx, 8s AI clips hf_*, a vertical phone clip,
 * music, a logo PNG, Sequence 01 with a title graphic and black gaps), runs the film script and checks:
 *   - original sequence untouched, marks restored
 *   - new sequence: 17 contiguous slots from 0, title cards in the right places, PNGs decoded byte-exact
 *   - footage windows inside the source media, no window reused, no two consecutive shots from one source
 *   - no black edges on any footage frame; opacity below 100 only inside the planned fades
 *   - vertical clip / stills / audio never used as footage; music on A1 trimmed to the film and faded out
 *   - Lumetri saturation 0 on footage (monochrome)
 * Usage: node premiere/test/run_film_test.js [--fps=23.976] [--dump=path.json] [--noQE] [--log]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('./mock_premiere');

const args = process.argv.slice(2);
const fps = Number((args.find((a) => a.startsWith('--fps=')) || '--fps=23.976').slice(6));
const dump = (args.find((a) => a.startsWith('--dump=')) || '').slice(7);
for (const f of ['noQE', 'inclusiveOut', 'strayKey', 'noUnlink']) if (args.includes('--' + f)) M.FLAGS[f] = true;
const env = M.install({ projectPath: '/proj/멜트 실루엣.prproj' });
const { TPS } = M;
const F = Math.round(TPS / fps);
const sec = (s) => Math.round(s * fps) * F;

// ---------------- project ----------------
const P = (o) => new M.ProjectItem(o);
const cam = (n, d) => P({ name: n + '.MP4', path: '/m/' + n + '.MP4', w: 3840, h: 2160, durSec: d, hasAudio: true });
const ai = (n) => P({ name: n + '.mp4', path: '/m/' + n + '.mp4', w: 1920, h: 1080, durSec: 8.01, hasAudio: false });
const media = {
  c6340: cam('C6340', 62), c6344: cam('C6344', 80), c6342: cam('C6342', 74), c6351: cam('C6351', 49),
  c6363: cam('C6363', 65), c6362: cam('C6362', 5), c6371: cam('C6371', 30),
  hf1: ai('hf_20260923_021529_21'), hf2: ai('hf_20260923_050148_33'), hf3: ai('hf_20260923_051946_08'), hf4: ai('hf_20260928_065604_2c'),
  comp: P({ name: 'Comp 1.mp4', path: '/m/Comp 1.mp4', w: 1920, h: 1080, durSec: 12 }),
  vert: P({ name: 'phone_vertical.mp4', path: '/m/phone_vertical.mp4', w: 1080, h: 1920, durSec: 20, hasAudio: true }),
  music: P({ name: 'The Light - Alexander.mp3', path: '/m/The Light - Alexander.mp3', hasVideo: false, hasAudio: true, durSec: 213, w: 0 }),
  sfx: P({ name: 'kamhunt-typical-transition.wav', path: '/m/kamhunt.wav', hasVideo: false, hasAudio: true, durSec: 6.4, w: 0 }),
  logo: P({ name: 'MOVLABS_logo.png', path: '/m/MOVLABS_logo.png', w: 1200, h: 300, still: true }),
  adj: P({ name: 'Adjustment Layer', path: '', adjust: true, still: true }),
  black: P({ name: 'Black Video', path: '', still: true }),
  seqItem: P({ name: 'Sequence 02 - Claude', path: '', isSeq: true }),
};
const footBin = { name: 'Footage', type: 2, nodeId: 'bin1', children: [] };
Object.defineProperty(footBin.children, 'numItems', { get: () => footBin.children.length });
for (const k of ['c6340', 'c6344', 'c6342', 'c6351', 'c6363', 'c6362', 'c6371', 'hf1', 'hf2', 'hf3', 'hf4', 'comp', 'vert']) footBin.children.push(media[k]);
env.project.rootItem.children.push(footBin);
for (const k of ['music', 'sfx', 'logo', 'adj', 'black', 'seqItem']) env.project.rootItem.children.push(media[k]);

const src = new M.Sequence(env.project, 'Sequence 01', { frameTicks: F });
env.project.sequences.push(src);
env.project.activeSequence = src;
src._markers.push({ start: M.T(sec(3)), end: M.T(sec(3)), name: 'note' });
function put(kind, idx, pi, startS, inS, durS, scale) {
  const tr = src[kind][idx];
  const it = new M.TrackItem(tr, pi, sec(startS), sec(inS), sec(inS) + sec(durS));
  tr.items.push(it);
  if (scale) it.components.find((c) => c.matchName === 'AE.ADBE Motion').properties[1]._v = scale;
  return it;
}
put('videoTracks', 2, media.c6371, 0, 12, 2);                 // V3 at start
put('videoTracks', 1, media.adj, 0, 0, 6);
put('videoTracks', 0, media.c6344, 2, 30, 4, 50);
put('videoTracks', 0, media.c6342, 6, 22, 3.5, 50);
put('videoTracks', 0, P({ name: '일체형 후면 수납', path: '', still: true }), 9.5, 0, 3);   // title graphic
put('videoTracks', 0, media.black, 12.5, 0, 1.5);
put('videoTracks', 0, media.hf1, 14, 0.5, 6);
put('videoTracks', 0, media.hf2, 20, 1, 5);
put('videoTracks', 0, media.comp, 25, 0, 4);                  // sped up in the original (source 0-7.25s)
src.videoTracks[0].items[src.videoTracks[0].items.length - 1]._out = sec(7.25);
put('videoTracks', 0, media.hf4, 29, 0.5, 6);
put('videoTracks', 1, media.logo, 32, 0, 3);
put('audioTracks', 0, media.music, 0, 4, 35);
const snapshot = (seq) => JSON.stringify(seq.allItems().map((i) => [i.track.kind, i.track.idx, i._start, i._in, i._out, i._name]));
const before = snapshot(src);

// ---------------- run ----------------
const code = fs.readFileSync(path.join(__dirname, '..', 'MELT2_BrandFilm.jsx'), 'utf8');
const t0 = Date.now();
const result = vm.runInThisContext(code, { filename: 'MELT2_BrandFilm.jsx' });
const elapsed = Date.now() - t0;

// ---------------- verify ----------------
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
check(!/스크립트 오류/.test(String(result)), 'script error: ' + result);
check(snapshot(src) === before, 'original sequence modified');
const ns = env.project.sequences.find((s) => s !== src);
check(ns && ns.name === 'MELT 2세대 - Brand Film', 'sequence name: ' + (ns && ns.name));
check(ns && ns._markers.length === 0, 'markers not cleared');
const allPis = [...Object.values(media), ...env.project.rootItem.children.filter((c) => c instanceof M.ProjectItem)];
for (const p of allPis) check(p._in === null && p._out === null, 'marks not restored on ' + p.name);

const V = ns.videoTracks[0].items.slice().sort((a, b) => a._start - b._start);
const kinds = V.map((i) => (/^MELT2_/.test(i.pi.name) ? i.pi.name.replace(/\.png$/, '') : 'SHOT'));
const expectKinds = ['SHOT', 'MELT2_card1', 'SHOT', 'SHOT', 'MELT2_card2', 'SHOT', 'SHOT', 'SHOT', 'MELT2_card3', 'SHOT', 'SHOT', 'SHOT', 'MELT2_card4', 'SHOT', 'SHOT', 'MELT2_melt', 'MELT2_logo'];
check(JSON.stringify(kinds) === JSON.stringify(expectKinds), 'structure: ' + kinds.join(','));
check(V.length && V[0]._start === 0, 'does not start at 0');
for (let i = 1; i < V.length; i++) check(V[i]._start === V[i - 1].endT(), `gap/overlap between slot ${i - 1} and ${i}`);
for (let v = 1; v < ns.videoTracks.length; v++) check(ns.videoTracks[v].items.length === 0, 'extra items on V' + (v + 1));
const filmEnd = V.length ? V[V.length - 1].endT() : 0;

// PNG assets decoded byte-exact
const titleDir = path.join(__dirname, '..', 'film', 'titles');
for (const f of fs.readdirSync(titleDir)) {
  const key = Object.keys(env.files).find((k) => k.endsWith('/MELT2_titles/' + f));
  check(key, 'asset not written: ' + f);
  if (key) check(Buffer.from(env.files[key], 'latin1').equals(fs.readFileSync(path.join(titleDir, f))), 'asset bytes differ: ' + f);
}

// footage choices
const shots = V.filter((i) => !/^MELT2_/.test(i.pi.name));
const footagePis = new Set([media.c6340, media.c6344, media.c6342, media.c6351, media.c6363, media.c6362, media.c6371, media.hf1, media.hf2, media.hf3, media.hf4, media.comp]);
for (const s of shots) {
  check(footagePis.has(s.pi), 'non-footage used as shot: ' + s.pi.name);
  check(s._in >= 0 && s._out <= s.pi.mediaEnd(), `window outside media: ${s.pi.name} [${s._in / TPS}, ${s._out / TPS}]`);
}
for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
  const a = shots[i], b = shots[j];
  if (a.pi === b.pi) check(a._out <= b._in || b._out <= a._in, `reused source range ${a.pi.name}`);
}
for (let i = 1; i < V.length; i++) {
  if (/^MELT2_/.test(V[i].pi.name) || /^MELT2_/.test(V[i - 1].pi.name)) continue;
  check(V[i].pi !== V[i - 1].pi, `same source twice in a row: ${V[i].pi.name} at ${(V[i]._start / TPS).toFixed(2)}s`);
}
check(shots[0].pi === shots[shots.length - 1].pi, 'ending hero does not reuse opening source');

// frame-by-frame: black edges / unintended transparency
const param = (it, comp, idx) => it.components.find((c) => c.matchName === comp).properties[idx];
const valAt = (it, comp, idx, t) => param(it, comp, idx).getValueAtTime(M.T(it._in + (t - it._start)));
function covers(it, t) {
  const W = ns.W, H = ns.H, pi = it.pi;
  const pos = valAt(it, 'AE.ADBE Motion', 0, t), sc = valAt(it, 'AE.ADBE Motion', 1, t) / 100, rot = valAt(it, 'AE.ADBE Motion', 4, t) * Math.PI / 180;
  for (const [qx, qy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const vx = qx - pos[0] * W, vy = qy - pos[1] * H;
    const lx = Math.cos(rot) * vx + Math.sin(rot) * vy, ly = -Math.sin(rot) * vx + Math.cos(rot) * vy;
    const ux = lx / sc + pi.w / 2, uy = ly / sc + pi.h / 2;
    if (ux < -0.5 || ux > pi.w + 0.5 || uy < -0.5 || uy > pi.h + 0.5) return false;
  }
  return true;
}
const fadeFrames = (s) => Math.round(s * fps);
const plannedFade = { 0: [fadeFrames(1.0), 0], 14: [fadeFrames(0.35), fadeFrames(0.35)] };   // slot index -> [in, out]
let edge = 0, transp = 0, maxScale = 0, maxRot = 0;
V.forEach((it, idx) => {
  if (/^MELT2_/.test(it.pi.name)) return;
  const Lf = Math.round((it.endT() - it._start) / F);
  const [fi, fo] = plannedFade[idx] || [0, 0];
  for (let f = 0; f < Lf; f++) {
    const t = it._start + f * F;
    const op = valAt(it, 'AE.ADBE Opacity', 0, t);
    if (op < 99.5 && !(f < fi || f >= Lf - fo)) transp++;
    if (!covers(it, t)) edge++;
    const base = it.pi.w === 3840 ? 50 : 100;
    maxScale = Math.max(maxScale, valAt(it, 'AE.ADBE Motion', 1, t) / base);
    maxRot = Math.max(maxRot, Math.abs(valAt(it, 'AE.ADBE Motion', 4, t)));
  }
});
check(edge === 0, edge + ' footage frames with black edges');
check(transp === 0, transp + ' footage frames unexpectedly transparent');
// title cards fade in, scaled to frame
for (const it of V.filter((i) => /^MELT2_/.test(i.pi.name))) {
  check(Math.abs(param(it, 'AE.ADBE Motion', 1).getValue() - 100) < 1e-6, 'card scale ' + it.pi.name);
  check(param(it, 'AE.ADBE Opacity', 0).isTimeVarying(), 'card has no fade ' + it.pi.name);
}
// monochrome
if (!M.FLAGS.noQE) for (const s of shots) {
  const lum = s.components.find((c) => /Lumetri/.test(c.matchName));
  check(lum && lum.properties.find((p) => p.displayName === 'Saturation').getValue() === 0, 'no monochrome on ' + s.pi.name);
}
// audio: only music on A1
const A = ns.audioTracks.flatMap((t) => t.items);
check(A.length === 1 && A[0].pi === media.music && A[0].track.idx === 0, 'audio: ' + A.map((a) => a.pi.name + '@A' + (a.track.idx + 1)).join(','));
if (A[0]) {
  check(A[0]._start === 0 && Math.abs(A[0].endT() - filmEnd) <= F, 'music not trimmed to film');
  check(A[0]._in === sec(4), 'music in-point not taken from Sequence 01');
  const lv = A[0].components[0].properties[1];
  check(lv.isTimeVarying() && lv.getValueAtTime(M.T(A[0]._out - 1)) < 0.01, 'music not faded');
}

const report = {
  elapsedMs: elapsed, fps, filmSec: +(filmEnd / TPS).toFixed(2), slots: V.length, edgeFrames: edge, transparentFrames: transp,
  maxScaleFactor: +maxScale.toFixed(3), maxRotationDeg: +maxRot.toFixed(2),
  cutList: V.map((i) => `${(i._start / TPS).toFixed(2).padStart(6)}s  ${i.pi.name}${/^MELT2_/.test(i.pi.name) ? '' : `  [${(i._in / TPS).toFixed(2)}-${(i._out / TPS).toFixed(2)}]`}`),
};
console.log(JSON.stringify(report, null, 1));
console.log('\n--- alert ---\n' + global.__lastAlert);
if (args.includes('--log')) console.log(env.logs.join('\n'));
if (dump) {
  const mo = (i, c, idx) => [...param(i, c, idx)._keys.entries()].map(([k, v]) => [(k - i._in) / F, v]);
  const clips = V.map((i) => ({ name: i.pi.name, w: i.pi.w, h: i.pi.h, still: false, track: 0, startF: i._start / F, endF: i.endT() / F,
    pos: mo(i, 'AE.ADBE Motion', 0), scale: mo(i, 'AE.ADBE Motion', 1).map(([f, v]) => [f, i.pi.w === 3840 ? v * 2 : v]), rot: mo(i, 'AE.ADBE Motion', 4), op: mo(i, 'AE.ADBE Opacity', 0),
    staticPos: param(i, 'AE.ADBE Motion', 0)._v, staticScale: (i.pi.w === 3840 ? 2 : 1) * param(i, 'AE.ADBE Motion', 1)._v, staticRot: param(i, 'AE.ADBE Motion', 4)._v, staticOp: param(i, 'AE.ADBE Opacity', 0)._v,
    w: 1920, h: 1080 }));
  fs.writeFileSync(dump, JSON.stringify({ W: ns.W, H: ns.H, fps, frames: Math.round(filmEnd / F), clips }, null, 1));
}
if (fails.length) { console.error('\nFAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('\nPASS');
