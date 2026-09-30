/*
 * Smoke test for FRAME_Film.jsx in the mock Premiere DOM.
 * The project has 4K takes named the ways people name them (Korean with spaces, number tags, English,
 * a macOS NFD file name, a take found only through its bin name), one take reframed in Sequence 01,
 * one with a source In mark, a scene with only a vertical take, a too-short take, and The Light.
 * Checks:
 *   - original sequence untouched, source In/Out marks restored
 *   - 15 slots from 0 on the 0.75 s kick grid, each slot holds the take for its scene (or its slate)
 *   - Sequence 01 range + framing, In mark and centre windows; the ending reuses the front take elsewhere
 *   - slate PNG decoded byte-exact, written only for the missing scene
 *   - match-cut slots 12-14 move identically, mirrored slides go the other way
 *   - no black edges, opacity below 100 only in the 0.25 s open fade and the 1.5 s end fade
 *   - music: two segments of The Light mapped continuously (2:07.53 + 2:54.03), fades, no camera audio
 *   - one marker per slot, drop and splice noted
 *   - --edit: a 30 s FRAME_music_edit file is placed whole; --vertical: a 9:16 Sequence 01 uses only vertical takes
 * Usage: node premiere/test/run_frame_test.js [--fps=23.976] [--edit] [--vertical] [--tcOffset] [--noQE] [--inclusiveOut] [--strayKey] [--noUnlink] [--log] [--dump=path.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('./mock_premiere');

const args = process.argv.slice(2);
const fps = Number((args.find((a) => a.startsWith('--fps=')) || '--fps=23.976').slice(6));
const dump = (args.find((a) => a.startsWith('--dump=')) || '').slice(7);
const useEdit = args.includes('--edit');
const vertical = args.includes('--vertical');                 // 9:16 Sequence 01 -> only vertical takes qualify
for (const f of ['noQE', 'inclusiveOut', 'strayKey', 'noUnlink']) if (args.includes('--' + f)) M.FLAGS[f] = true;
const env = M.install({ projectPath: '/proj/프레임 필름.prproj' });
const { TPS } = M;
const F = Math.round(TPS / fps);
const sec = (s) => Math.round(s * fps) * F;
const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'film', 'frame_scenes.json'), 'utf8'));

// ---------------- project ----------------
const P = (o) => new M.ProjectItem(o);
const cam = (n, d, o) => P(Object.assign({ name: n, path: '/m/' + n, w: 3840, h: 2160, durSec: d, hasAudio: true }, o || {}));
const root = env.project.rootItem;
const shootBin = root.createBin('FRAME 촬영본');
const poleBin = shootBin.createBin('02 기둥');
const media = {
  s01: cam('C7001_뒷면하단.MP4', 14),
  s02: cam('C7002.MP4', 18),                                   // only its bin says what it is
  s03a: cam('정면 화면 A.mov', 20),
  s03b: cam('정면 화면 B.mov', 30),                             // reframed in Sequence 01 -> preferred
  s04: cam('S04 mount detail.MP4', 9),
  s05v: cam('벽면 밀착_세로.mp4', 12, { w: 2160, h: 3840 }),    // vertical only -> slate + warning
  s06: cam('각도기_움직임.MP4'.normalize('NFD'), 40),           // macOS NFD name, In mark at 20 s
  s07: cam('가림판 부착.MP4', 11),
  s08: P({ name: 'safety_cable.mp4', path: '/m/safety_cable.mp4', w: 1920, h: 1080, durSec: 8 }),
  s09: cam('사운드바 정면.MP4', 10),
  s10: cam('사운드바_뒷면.MP4', 10),
  s11: cam('ps5_vertical.MP4', 10),
  s12: cam('정면_플스기둥.MP4', 12),
  s13: cam('정면_닌텐도.MP4', 12),
  s14short: cam('xbox.MP4', 1),
  s14: cam('xbox_2.MP4', 12),
  vert: cam('phone_vertical_정면.mp4', 20, { w: 1080, h: 1920 }),
  other: cam('C9999.MP4', 60),
  dated: cam('12-05 촬영 테스트.MP4', 30),                      // date prefix, not scene 12
  music: P({ name: 'The Light - Alex Jones & Xander Jones.mp3', path: '/m/The Light.mp3', hasVideo: false, hasAudio: true, durSec: 213, w: 0 }),
  sfx: P({ name: 'click.wav', path: '/m/click.wav', hasVideo: false, hasAudio: true, durSec: 2, w: 0 }),
  logo: P({ name: 'MOVLABS_logo.png', path: '/m/MOVLABS_logo.png', w: 1200, h: 300, still: true }),
  adj: P({ name: 'Adjustment Layer', path: '', adjust: true, still: true }),
  black: P({ name: 'Black Video', path: '', still: true }),
};
if (useEdit) media.edit = P({ name: 'FRAME_music_edit_30s.wav', path: '/m/FRAME_music_edit_30s.wav', hasVideo: false, hasAudio: true, durSec: 30, w: 0 });
for (const k of ['s01', 's03a', 's03b', 's04', 's05v', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14short', 's14', 'vert']) shootBin.children.push(media[k]);
poleBin.children.push(media.s02);
for (const k of ['other', 'dated', 'music', 'sfx', 'logo', 'adj', 'black', 'edit']) if (media[k]) root.children.push(media[k]);
if (args.includes('--tcOffset')) {                             // camera timecode starting at 01:00:00:00
  for (const p of Object.values(media)) if (p.w === 3840 || p.h === 3840) p.tcOffset = 3600 * TPS;
  media.music.tcOffset = 0;
}
media.s06._in = sec(20);                                       // source-monitor In mark
const allPis = Object.values(media);
const marksBefore = allPis.map((p) => [p._in, p._out]);

const src = new M.Sequence(env.project, 'Sequence 01', vertical ? { frameTicks: F, W: 1080, H: 1920 } : { frameTicks: F });
env.project.sequences.push(src);
env.project.activeSequence = src;
function put(kind, idx, pi, startS, inS, durS) {
  const tr = src[kind][idx];
  const it = new M.TrackItem(tr, pi, sec(startS), sec(inS), sec(inS) + sec(durS));
  tr.items.push(it);
  return it;
}
const framed = put('videoTracks', 0, media.s03b, 0, 12, 4);
const mo = framed.components.find((c) => c.matchName === 'AE.ADBE Motion').properties;
mo[1]._v = 50;                                                 // 4K in 1080: scale 50 = fill
mo[0]._v = [0.52, 0.5];                                        // editor nudged it right
put('videoTracks', 0, media.black, 4, 0, 1);
put('videoTracks', 0, media.other, 5, 3, 4);
put('audioTracks', 0, media.music, 0, 0, 9);
const snapshot = (seq) => JSON.stringify(seq.allItems().map((i) => [i.track.kind, i.track.idx, i._start, i._in, i._out, i._name]));
const before = snapshot(src);

// ---------------- run ----------------
const code = fs.readFileSync(path.join(__dirname, '..', 'FRAME_Film.jsx'), 'utf8');
const t0 = Date.now();
const result = vm.runInThisContext(code, { filename: 'FRAME_Film.jsx' });
const elapsed = Date.now() - t0;

// ---------------- verify ----------------
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
check(!/스크립트 오류/.test(String(result)), 'script error: ' + result);
check(snapshot(src) === before, 'original sequence modified');
allPis.forEach((p, i) => check(p._in === marksBefore[i][0] && p._out === marksBefore[i][1], 'marks not restored on ' + p.name));
const ns = env.project.sequences.find((s) => s !== src);
check(ns && ns.name === '프레임 FRAME - 30초 필름', 'sequence name: ' + (ns && ns.name));

// slots on the kick grid
const V = ns.videoTracks[0].items.slice().sort((a, b) => a._start - b._start);
check(V.length === 15, 'slot count ' + V.length);
let kicks = 0;
const bounds = [0];
for (const s of scenes.scenes) { kicks += s.kicks; bounds.push(Math.round(kicks * 0.75 * fps) * F); }
V.forEach((it, i) => {
  check(it._start === bounds[i], `slot ${i + 1} starts at ${(it._start / TPS).toFixed(3)}s, want ${(bounds[i] / TPS).toFixed(3)}s`);
  check(it.endT() === bounds[i + 1], `slot ${i + 1} ends at ${(it.endT() / TPS).toFixed(3)}s, want ${(bounds[i + 1] / TPS).toFixed(3)}s`);
});
const filmEnd = bounds[15];
check(Math.abs(filmEnd / TPS - 30) <= 0.5 / fps, 'film length ' + filmEnd / TPS);
for (let v = 1; v < ns.videoTracks.length; v++) check(ns.videoTracks[v].items.length === 0, 'extra items on V' + (v + 1));

// the right take in each slot
const want = vertical
  ? ['SLATE:s01', 'SLATE:s02', 'vert', 'SLATE:s04', 's05v', 'SLATE:s06', 'SLATE:s07', 'SLATE:s08', 'SLATE:s09', 'SLATE:s10', 'SLATE:s11', 'SLATE:s12', 'SLATE:s13', 'SLATE:s14', 'vert']
  : ['s01', 's02', 's03b', 's04', 'SLATE:s05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14', 's03b'];
V.forEach((it, i) => {
  const w = want[i];
  if (w.startsWith('SLATE:')) check(it.pi.name === `FRAME_slate_${w.slice(6)}.png`, `slot ${i + 1}: ${it.pi.name}, want slate`);
  else check(it.pi === media[w], `slot ${i + 1}: ${it.pi.name}, want ${media[w].name}`);
});
const at = (i) => V[i];
const param = (it, comp, idx) => it.components.find((c) => c.matchName === comp).properties[idx];
const valAt = (it, comp, idx, t) => param(it, comp, idx).getValueAtTime(M.T(it._in + (t - it._start)));
if (vertical) {
  const slateKeys = Object.keys(env.files).filter((k) => /\/FRAME_slates\//.test(k));
  check(slateKeys.length === want.filter((w) => w.startsWith('SLATE:')).length, 'vertical: slates written ' + slateKeys.length);
  check(Math.abs(param(at(0), 'AE.ADBE Motion', 1).getValue() - 56.25) < 1e-6, 'vertical: slate not fitted to the 9:16 frame');
  check(at(14)._out <= at(2)._in || at(14)._in >= at(2)._out, 'vertical: ending reuses the front range');
  check(/촬영본이 없는 장면: 01 뒷면 하단, 02 기둥, 04 뒷면 상단/.test(String(global.__lastAlert)), 'vertical: missing scenes not reported');
}
if (!vertical) {
  // windows
  check(at(2)._in === sec(12), 'front hero does not start at its Sequence 01 in-point: ' + at(2)._in / TPS);
  check(at(5)._in === sec(20), 'tilt shot does not start at the source In mark: ' + at(5)._in / TPS);
  check(at(14)._out <= at(2)._in - sec(0.25) || at(14)._in >= at(2)._out + sec(0.25), 'ending reuses the front hero range');
  const mid = (it) => (it._in + it._out) / 2 / TPS, half = (it) => it.pi.mediaEnd() / 2 / TPS;
  for (const i of [0, 1, 3, 6, 8, 9, 10, 11, 12, 13]) check(Math.abs(mid(at(i)) - half(at(i))) < 0.1, `slot ${i + 1} window not centred: ${mid(at(i))} vs ${half(at(i))}`);
  for (const it of V) if (!it.pi.still) check(it._in >= 0 && it._out <= it.pi.mediaEnd(), 'window outside media: ' + it.pi.name);
  check(!V.some((it) => [media.vert, media.s05v, media.other, media.dated, media.s14short, media.logo].includes(it.pi)), 'unwanted source used');

  // slate asset: only the missing scene, byte-exact, in its bin
  const slateKeys = Object.keys(env.files).filter((k) => /\/FRAME_slates\//.test(k));
  check(slateKeys.length === 1 && /FRAME_slate_s05\.png$/.test(slateKeys[0]), 'slates written: ' + slateKeys.join(','));
  if (slateKeys[0]) check(Buffer.from(env.files[slateKeys[0]], 'latin1').equals(fs.readFileSync(path.join(__dirname, '..', 'film', 'slates', 'FRAME_slate_s05.png'))), 'slate bytes differ');
  const slateBin = root.children.find((c) => c.name === 'FRAME Slates');
  check(slateBin && slateBin.children.length === 1, 'slate bin');
  check(Math.abs(at(4).components.find((c) => c.matchName === 'AE.ADBE Motion').properties[1].getValue() - 100) < 1e-6, 'slate scale');

  // motion
  // frames can differ by one between slots (kick grid rounding): compare the frames they share
  const nShared = Math.min(...[11, 12, 13].map((i) => Math.round((at(i).endT() - at(i)._start) / F)));
  const track = (it) => { const out = []; for (let f = 0; f < nShared; f++) { const t = it._start + f * F; out.push([valAt(it, 'AE.ADBE Motion', 1, t), valAt(it, 'AE.ADBE Motion', 0, t), valAt(it, 'AE.ADBE Motion', 4, t)].flat().map((x) => +x.toFixed(4))); } return JSON.stringify(out); };
  check(track(at(11)) === track(at(12)) && track(at(12)) === track(at(13)), 'match-cut slots 12-14 move differently');
  check(!param(at(11), 'AE.ADBE Motion', 1).isTimeVarying() || valAt(at(11), 'AE.ADBE Motion', 1, at(11).endT() - F) / 50 < 1.1, 'match-cut zoom too strong');
  const x0 = (it) => valAt(it, 'AE.ADBE Motion', 0, it._start)[0], x1 = (it) => valAt(it, 'AE.ADBE Motion', 0, it.endT() - F)[0];
  check(!param(at(1), 'AE.ADBE Motion', 0).isTimeVarying() && !param(at(1), 'AE.ADBE Motion', 4).isTimeVarying(), 'pole orbit shot (slot 2) drifts or rolls on top of the camera move');
  check(x0(at(3)) > x1(at(3)), 'slide on slot 4 goes the wrong way');
  check(x0(at(8)) < x1(at(8)) && x0(at(9)) < x1(at(9)), 'mirrored slides on slots 9-10 go the wrong way');
  check(Math.abs(valAt(at(2), 'AE.ADBE Motion', 0, at(2)._start)[0] - 0.52) < 1e-6, 'Sequence 01 framing not kept on the front hero');
}

// black edges / transparency
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
const plannedFade = { 0: [Math.round(0.25 * fps), 0], 14: [0, Math.round(1.5 * fps)] };
let edge = 0, transp = 0, maxRot = 0;
V.forEach((it, idx) => {
  const Lf = Math.round((it.endT() - it._start) / F);
  const [fi, fo] = plannedFade[idx] || [0, 0];
  for (let f = 0; f < Lf; f++) {
    const t = it._start + f * F;
    const op = valAt(it, 'AE.ADBE Opacity', 0, t);
    if (op < 99.5 && !(f < fi || f >= Lf - fo)) transp++;
    if (!it.pi.still && !covers(it, t)) edge++;
    maxRot = Math.max(maxRot, Math.abs(valAt(it, 'AE.ADBE Motion', 4, t)));
  }
  if (fi) check(valAt(it, 'AE.ADBE Opacity', 0, it._start) < 1, 'no open fade');
  if (fo) check(valAt(it, 'AE.ADBE Opacity', 0, it.endT() - F) < 1, 'no end fade');
});
check(edge === 0, edge + ' footage frames with black edges');
check(transp === 0, transp + ' frames unexpectedly transparent');

// audio
const A = ns.audioTracks.flatMap((t) => t.items).sort((a, b) => a._start - b._start);
const level = (it, t) => it.components[0].properties[1].getValueAtTime(M.T(it._in + (t - it._start)));
if (useEdit) {
  check(A.length === 1 && A[0].pi === media.edit && A[0]._start === 0 && A[0]._in === 0 && A[0].endT() === filmEnd, 'edit file not placed whole: ' + A.map((a) => a.pi.name));
  check(A[0] && !A[0].components[0].properties[1].isTimeVarying(), 'fades added to the edit file');
} else {
  const cutT = bounds[12];
  check(A.length === 2 && A.every((a) => a.pi === media.music && a.track.idx === 0), 'audio: ' + A.map((a) => a.pi.name + '@A' + (a.track.idx + 1)).join(','));
  if (A.length === 2) {
    const tol = F / 2;
    check(A[0]._start === 0 && A[0].endT() === cutT && A[1]._start === cutT && A[1].endT() === filmEnd, 'music segments not butted at the cut');
    check(Math.abs(A[0]._in - 127.53 * TPS) <= tol, 'music in-point ' + A[0]._in / TPS);
    check(Math.abs(A[1]._in - (151.53 * TPS + cutT)) <= tol, 'music second segment in-point ' + A[1]._in / TPS);
    check(Math.abs((A[0]._in - A[0]._start) - 127.53 * TPS) <= tol && Math.abs((A[1]._in - A[1]._start) - 151.53 * TPS) <= tol, 'music mapping not continuous');
    check(level(A[0], 0) < 0.01 && level(A[0], sec(1)) > 0.1, 'music fade-in');
    check(level(A[1], filmEnd - 1) < 0.01 && level(A[1], cutT + sec(2)) > 0.1, 'music fade-out');
  }
}

// markers
const mk = ns._markers;
check(mk.length === 15, 'markers: ' + mk.length);
mk.forEach((m, i) => {
  const s = scenes.scenes[i];
  check(m.start._t === bounds[i] && m.name === `${String(s.no).padStart(2, '0')} ${s.name}`, `marker ${i + 1}: ${m.name} @${m.start._t / TPS}`);
});
if (mk.length === 15) {
  check(/음악 드롭/.test(mk[2].comments), 'drop not marked');
  check(useEdit ? !/이음새/.test(mk[12].comments) : /음악 이음새/.test(mk[12].comments), 'splice marker');
  want.forEach((w, i) => check(/촬영본 없음/.test(mk[i].comments) === w.startsWith('SLATE:'), `marker ${i + 1} note: ${mk[i].comments}`));
}
const alertText = String(global.__lastAlert);
if (!vertical) {
  check(/촬영본이 없는 장면: 05 벽면 밀착/.test(alertText), 'missing scene not reported');
  check(/벽면 밀착_세로\.mp4/.test(alertText), 'vertical take exclusion not reported');
}

const report = {
  elapsedMs: elapsed, fps, filmSec: +(filmEnd / TPS).toFixed(3), slots: V.length, edgeFrames: edge, transparentFrames: transp, maxRotationDeg: +maxRot.toFixed(2),
  cutList: V.map((i) => `${(i._start / TPS).toFixed(3).padStart(7)}s  ${i.pi.name.normalize('NFC')}${i.pi.still ? '' : `  [${(i._in / TPS).toFixed(2)}-${(i._out / TPS).toFixed(2)}]`}`),
  music: A.map((a) => `${(a._start / TPS).toFixed(3)}s  ${a.pi.name}  [${(a._in / TPS).toFixed(3)}-${(a._out / TPS).toFixed(3)}]`),
};
console.log(JSON.stringify(report, null, 1));
console.log('\n--- alert ---\n' + alertText);
if (args.includes('--log')) console.log(env.logs.join('\n'));
if (dump) {
  const keys = (i, c, idx) => [...param(i, c, idx)._keys.entries()].map(([k, v]) => [(k - i._in) / F, v]);
  const k4 = (i) => (i.pi.w === 3840 || i.pi.h === 3840 ? 2 : 1);
  const clips = V.map((i) => ({ name: i.pi.name.normalize('NFC'), w: i.pi.w / k4(i), h: i.pi.h / k4(i), still: !!i.pi.still, track: 0, startF: i._start / F, endF: i.endT() / F,
    pos: keys(i, 'AE.ADBE Motion', 0), scale: keys(i, 'AE.ADBE Motion', 1).map(([f, v]) => [f, v * k4(i)]), rot: keys(i, 'AE.ADBE Motion', 4), op: keys(i, 'AE.ADBE Opacity', 0),
    staticPos: param(i, 'AE.ADBE Motion', 0)._v, staticScale: k4(i) * param(i, 'AE.ADBE Motion', 1)._v, staticRot: param(i, 'AE.ADBE Motion', 4)._v, staticOp: param(i, 'AE.ADBE Opacity', 0)._v }));
  fs.writeFileSync(dump, JSON.stringify({ W: ns.W, H: ns.H, fps, frames: Math.round(filmEnd / F), clips }, null, 1));
}
if (fails.length) { console.error('\nFAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('\nPASS');
