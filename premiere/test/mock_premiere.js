/*
 * Minimal Premiere Pro ExtendScript DOM mock for smoke-testing PremiumEdit.jsx in Node.
 * It follows the documented object model (Sequence / Track / TrackItem / ProjectItem /
 * Component / ComponentParam) closely enough to exercise every code path of the script.
 * Keyframe times are media times (trackItem.inPoint based), matching KEYFRAME_TIME_BASE "media".
 */
'use strict';

const TPS = 254016000000;
let NODE = 1000;
const FLAGS = { inclusiveOut: false, noUnlink: false, noQE: false, strayKey: false };

class Time {
  constructor() { this._t = 0; }
  get ticks() { return String(this._t); }
  set ticks(v) { this._t = Math.round(Number(v)); }
  get seconds() { return this._t / TPS; }
  set seconds(v) { this._t = Math.round(v * TPS); }
}
const T = (ticks) => { const t = new Time(); t.ticks = ticks; return t; };
const toTicks = (t) => (typeof t === 'number' ? Math.round(t * TPS) : (typeof t === 'string' ? Number(t) : Number(t.ticks)));
const clone = (v) => (Array.isArray(v) ? v.slice() : v);
const coll = (arr, key = 'numItems') => { Object.defineProperty(arr, key, { get: () => arr.length }); return arr; };

class Param {
  constructor(name, value) { this.displayName = name; this._v = value; this._tv = false; this._keys = new Map(); this.strayKeyAt = FLAGS.strayKey ? 12345 : null; }
  isTimeVarying() { return this._tv; }
  setTimeVarying(v) {
    this._tv = !!v;
    this._keys = new Map();
    // Premiere adds a key at the playhead when the stopwatch is turned on; emulate one stray key.
    if (this._tv && this.strayKeyAt !== null) this._keys.set(this.strayKeyAt, clone(this._v));
  }
  addKey(t) { if (!this._tv) throw new Error('not time varying'); const k = toTicks(t); if (!this._keys.has(k)) this._keys.set(k, clone(this.getValueAtTime(t))); }
  setValueAtKey(t, v) { const k = toTicks(t); if (!this._keys.has(k)) throw new Error('no key at ' + k); this._keys.set(k, clone(v)); }
  getKeys() { return [...this._keys.keys()].sort((a, b) => a - b).map(T); }
  getValueAtKey(t) { return clone(this._keys.get(toTicks(t))); }
  removeKey(t) { this._keys.delete(toTicks(t)); }
  removeKeyRange(a, b) { const A = toTicks(a), B = toTicks(b); for (const k of [...this._keys.keys()]) if (k >= A && k <= B) this._keys.delete(k); }
  setInterpolationTypeAtKey() {}
  getValue() { return this._tv && this._keys.size ? this.getValueAtTime(T(this.getKeys()[0]._t)) : clone(this._v); }
  setValue(v) { if (this._tv) throw new Error('setValue on animated param'); this._v = clone(v); }
  getValueAtTime(t) {
    if (!this._tv || !this._keys.size) return clone(this._v);
    const x = toTicks(t);
    const ks = [...this._keys.keys()].sort((a, b) => a - b);
    if (x <= ks[0]) return clone(this._keys.get(ks[0]));
    if (x >= ks[ks.length - 1]) return clone(this._keys.get(ks[ks.length - 1]));
    let i = 0; while (ks[i + 1] < x) i++;
    const a = ks[i], b = ks[i + 1], u = (x - a) / (b - a), va = this._keys.get(a), vb = this._keys.get(b);
    if (Array.isArray(va)) return va.map((q, j) => q + (vb[j] - q) * u);
    if (typeof va === 'boolean') return va;
    return va + (vb - va) * u;
  }
}

class Component {
  constructor(matchName, displayName, params) { this.matchName = matchName; this.displayName = displayName; this.properties = coll(params); }
}

function videoComponents(locale) {
  const ko = locale === 'ko';
  return coll([
    new Component('AE.ADBE Opacity', ko ? '불투명도' : 'Opacity', [new Param(ko ? '불투명도' : 'Opacity', 100), new Param(ko ? '혼합 모드' : 'Blend Mode', 0)]),
    new Component('AE.ADBE Motion', ko ? '모션' : 'Motion', [
      new Param(ko ? '위치' : 'Position', [0.5, 0.5]),
      new Param(ko ? '비율 조정' : 'Scale', 100),
      new Param(ko ? '비율 조정 폭' : 'Scale Width', 100),
      new Param(ko ? '균일 비율' : 'Uniform Scale', true),
      new Param(ko ? '회전' : 'Rotation', 0),
      new Param(ko ? '기준점' : 'Anchor Point', [0.5, 0.5]),
      new Param(ko ? '깜박임 방지 필터' : 'Anti-flicker Filter', 0),
    ]),
  ]);
}
function audioComponents(locale) {
  const ko = locale === 'ko';
  return coll([new Component('Internal Volume Stereo', ko ? '볼륨' : 'Volume', [new Param(ko ? '바이패스' : 'Bypass', false), new Param(ko ? '레벨' : 'Level', 0.17782794100389)])]);
}

class ProjectItem {
  constructor(o) {
    Object.assign(this, { path: '', w: 1920, h: 1080, par: 1, durSec: 10, still: false, hasAudio: false, hasVideo: true, isSeq: false, adjust: false }, o);
    this.nodeId = String(NODE++);
    this.type = 1;
    this._in = null; this._out = null;
  }
  getMediaPath() { return this.path; }
  isSequence() { return this.isSeq; }
  getProjectMetadata() {
    return this.hasVideo && this.w
      ? `<?xpacket?><x:xmpmeta><premierePrivateProjectMetaData:Column.Intrinsic.VideoInfo>${this.w} x ${this.h} (${this.par.toFixed(4)})</premierePrivateProjectMetaData:Column.Intrinsic.VideoInfo></x:xmpmeta>`
      : '<x:xmpmeta/>';
  }
  mediaEnd() { return Math.round((this.still ? 5 : this.durSec) * TPS); }   // stills: default still duration
  getInPoint() { return T((this._in === null ? 0 : this._in) + (this.tcOffset || 0)); }
  getOutPoint() { return T((this._out === null ? this.mediaEnd() : this._out) + (this.tcOffset || 0)); }
  setInPoint(t) { this._in = Math.max(0, Math.min(toTicks(t) - (this.tcOffset || 0), this.mediaEnd())); }
  setOutPoint(t) { this._out = Math.max(0, Math.min(toTicks(t) - (this.tcOffset || 0), this.mediaEnd())); }
  clearInPoint() { this._in = null; }
  clearOutPoint() { this._out = null; }
}

class TrackItem {
  constructor(track, pi, start, inT, outT, name) {
    this.track = track; this.pi = pi; this._start = start; this._in = inT; this._out = outT;
    this._name = name || pi.name; this.nodeId = String(NODE++);
    this.components = track.kind === 'video' ? videoComponents(track.seq.locale) : audioComponents(track.seq.locale);
    this.disabled = false; this._sel = false; this.link = null;
  }
  get start() { return T(this._start); }
  get end() { return T(this._start + (this._out - this._in)); }
  set end(t) {
    const e = toTicks(t);
    if (e <= this._start) throw new Error('bad end');
    if (!this.pi.still && this._in + (e - this._start) > this.pi.mediaEnd()) throw new Error('beyond media');
    this._out = this._in + (e - this._start);
  }
  get inPoint() { return T(this._in); }
  get outPoint() { return T(this._out); }
  get duration() { return T(this._out - this._in); }
  get name() { return this._name; }
  get projectItem() { return this.pi; }
  get mediaType() { return this.track.kind === 'video' ? 'Video' : 'Audio'; }
  isAdjustmentLayer() { return !!this.pi.adjust; }
  getSpeed() { return 1; }
  setSelected(v) { this._sel = !!v; }
  isSelected() { return this._sel; }
  remove() {
    this.track.items = this.track.items.filter((x) => x !== this);
    if (this.link) { const l = this.link; this.link = null; for (const o of l.members) if (o !== this && o.track.items.includes(o)) { o.link = null; o.remove(); } }
  }
  endT() { return this._start + (this._out - this._in); }
}

class Track {
  constructor(seq, kind, idx) { this.seq = seq; this.kind = kind; this.idx = idx; this.items = []; }
  get clips() { return coll(this.items.slice().sort((a, b) => a._start - b._start)); }
  isLocked() { return false; }
  setLocked() {}
  _carve(s, e) {
    const out = [];
    for (const it of this.items) {
      const a = it._start, b = it.endT();
      if (b <= s || a >= e) { out.push(it); continue; }
      if (a >= s && b <= e) continue;                         // fully covered -> removed
      if (a < s && b > e) {                                   // split
        const right = new TrackItem(this, it.pi, e, it._in + (e - a), it._out, it._name);
        it._out = it._in + (s - a); out.push(it, right); continue;
      }
      if (a < s) { it._out = it._in + (s - a); out.push(it); continue; }
      it._in += e - a; it._start = e; out.push(it);
    }
    this.items = out;
  }
  overwriteClip(pi, time) {
    if (typeof time === 'string') throw new Error('mock only accepts seconds/Time');
    const start = toTicks(time);
    const inT = pi._in === null ? 0 : pi._in, outT = pi._out === null ? pi.mediaEnd() : pi._out;
    const dur = outT - inT + (FLAGS.inclusiveOut && !pi.still ? this.seq.frameTicks : 0);
    const outX = inT + dur;
    const members = [];
    const put = (track) => { track._carve(start, start + dur); const it = new TrackItem(track, pi, start, inT, outX); track.items.push(it); members.push(it); };
    if (this.kind === 'video') {
      if (pi.hasVideo) put(this);
      if (pi.hasAudio && this.seq.audioTracks[this.idx]) put(this.seq.audioTracks[this.idx]);
    } else {
      put(this);
      if (pi.hasVideo && this.seq.videoTracks[this.idx]) put(this.seq.videoTracks[this.idx]);   // the risk the script avoids
    }
    if (members.length > 1) { const link = { members }; for (const m of members) m.link = link; }
    this.seq.project.overwriteCalls++;
  }
}

class Sequence {
  constructor(project, name, o) {
    this.project = project; this._name = name; this.sequenceID = 'seq-' + NODE++;
    Object.assign(this, { W: 1920, H: 1080, frameTicks: TPS / 30, nV: 3, nA: 3, locale: 'en' }, o);
    this.videoTracks = coll([], 'numTracks'); this.audioTracks = coll([], 'numTracks');
    for (let i = 0; i < this.nV; i++) this.videoTracks.push(new Track(this, 'video', i));
    for (let i = 0; i < this.nA; i++) this.audioTracks.push(new Track(this, 'audio', i));
    this.projectItem = { name };
    const marks = this._markers = [];
    this.markers = {
      getFirstMarker: () => marks[0] || null,
      getNextMarker: (m) => marks[marks.indexOf(m) + 1] || null,
      deleteMarker: (m) => { marks.splice(marks.indexOf(m), 1); },
    };
  }
  get name() { return this._name; }
  set name(v) { this._name = v; this.projectItem.name = v; }
  get timebase() { return String(this.frameTicks); }
  getSettings() { return { videoFrameWidth: this.W, videoFrameHeight: this.H, videoPixelAspectRatio: '1', videoFrameRate: T(this.frameTicks) }; }
  addTrack(kind) { const arr = kind === 'video' ? this.videoTracks : this.audioTracks; arr.push(new Track(this, kind, arr.length)); }
  clone() {
    const c = new Sequence(this.project, this._name + ' Copy', { W: this.W, H: this.H, frameTicks: this.frameTicks, nV: this.videoTracks.length, nA: this.audioTracks.length, locale: this.locale });
    const map = new Map();
    for (const kind of ['videoTracks', 'audioTracks']) this[kind].forEach((tr, i) => tr.items.forEach((it) => {
      const n = new TrackItem(c[kind][i], it.pi, it._start, it._in, it._out, it._name); c[kind][i].items.push(n); map.set(it, n);
    }));
    for (const [o, n] of map) if (o.link && !n.link) { const link = { members: o.link.members.map((m) => map.get(m)) }; link.members.forEach((m) => { m.link = link; }); }
    for (const m of this._markers) c._markers.push(Object.assign({}, m));
    this.project.sequences.push(c);
    return true;
  }
  allItems() { return [...this.videoTracks, ...this.audioTracks].flatMap((t) => t.items); }
  getSelection() { return this.allItems().filter((i) => i._sel); }
  unlinkSelection() { if (FLAGS.noUnlink) throw new Error('unlink unsupported'); for (const i of this.getSelection()) if (i.link) { const l = i.link; l.members.forEach((m) => { m.link = null; }); } }
  linkSelection() {}
  setPlayerPosition() {}
}

function install(opts = {}) {
  const project = { sequences: coll([], 'numSequences'), activeSequence: null, path: opts.projectPath || '/tmp/mock.prproj', overwriteCalls: 0 };
  project.openSequence = (id) => { project.activeSequence = project.sequences.find((s) => s.sequenceID === id) || null; return !!project.activeSequence; };
  const logs = [];
  const files = {};
  // project panel: root bin with children, bins, file import
  const makeBin = (name) => ({ name, type: 2, nodeId: String(NODE++), children: coll([]), createBin(n) { const b = makeBin(n); this.children.push(b); return b; } });
  project.rootItem = makeBin('root');
  project.rootItem.type = 3;
  project.importFiles = (paths, suppress, bin) => {
    for (const p of paths) {
      const name = p.replace(/^.*[\\/]/, '');
      (bin || project.rootItem).children.push(new ProjectItem({ name, path: p, w: 1920, h: 1080, still: /\.(png|jpe?g|tiff?|psd)$/i.test(p) }));
    }
    return true;
  };
  global.ProjectItemType = { CLIP: 1, BIN: 2, ROOT: 3, FILE: 4 };
  global.app = { project, enableQE() {} };
  const qeTrack = (idx) => {
    const seq = project.activeSequence;
    const items = () => seq.videoTracks[idx].items.slice().sort((a, b) => a._start - b._start);
    return {
      get numItems() { return items().length; },
      getItemAt(i) {
        const it = items()[i];
        return it && { name: it._name, type: 'Clip', addVideoEffect(fx) {
          if (!fx) throw new Error('no effect');
          it.components.push(new Component('AE.ADBE Lumetri', 'Lumetri Color', [new Param('Temperature', 0), new Param('Contrast', 0), new Param('Saturation', 100), new Param('Saturation', 100)]));
        } };
      },
    };
  };
  global.qe = { project: {
    getVideoEffectByName: (n) => (FLAGS.noQE ? null : { name: n }),
    getActiveSequence: () => ({
      addTracks(nv, vi, na) { if (FLAGS.noQE) throw new Error('QE unavailable'); for (let i = 0; i < nv; i++) project.activeSequence.addTrack('video'); for (let i = 0; i < na; i++) project.activeSequence.addTrack('audio'); },
      getVideoTrackAt: (i) => qeTrack(i),
    }),
  } };
  global.$ = { writeln: (s) => logs.push(s) };
  global.alert = (m) => { global.__lastAlert = m; };
  global.confirm = () => true;
  global.Time = Time;
  class Folder { constructor(p) { this.fsName = p; } get exists() { return true; } create() { return true; } }
  Folder.temp = new Folder('/tmp');
  global.Folder = Folder;
  global.File = class { constructor(p) { this.fsName = p; this.parent = new Folder(p.replace(/\/[^/]*$/, '')); this.buf = ''; this.encoding = 'UTF-8'; } get exists() { return this.fsName in files; } open() { this.buf = ''; return true; } write(s) { this.buf += s; } close() { files[this.fsName] = this.buf; } };
  return { project, logs, files, Sequence, ProjectItem, TrackItem, T, TPS };
}

module.exports = { FLAGS, install, Sequence, ProjectItem, TrackItem, Param, T, TPS, toTicks };
