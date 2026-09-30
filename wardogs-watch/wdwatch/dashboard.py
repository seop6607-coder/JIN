"""결과를 보여 주는 로컬 웹페이지.

게임 화면 위에 그리지 않고 브라우저로 따로 봅니다 (보조 모니터나 같은 와이파이의 휴대폰).
"""
from __future__ import annotations

import json
import logging
import threading
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

log = logging.getLogger(__name__)


class State:
    """분석 스레드와 웹서버가 같이 쓰는 현재 상태."""

    def __init__(self):
        self._lock = threading.Lock()
        self.players: list[dict] = []
        self.feed: deque[dict] = deque(maxlen=40)
        self.alerts: deque[dict] = deque(maxlen=30)
        self.status: dict = {}
        self._reset = False

    def update(self, *, players=None, status=None, feed=None, alert=None) -> None:
        with self._lock:
            if players is not None:
                self.players = players
            if status is not None:
                self.status.update(status)
            if feed is not None:
                self.feed.appendleft(feed)
            if alert is not None:
                self.alerts.appendleft(alert)

    def clear(self) -> None:
        with self._lock:
            self.players = []
            self.feed.clear()

    def snapshot(self) -> dict:
        with self._lock:
            return {"players": self.players, "feed": list(self.feed),
                    "alerts": list(self.alerts), "status": dict(self.status)}

    def request_reset(self) -> None:
        with self._lock:
            self._reset = True

    def take_reset(self) -> bool:
        with self._lock:
            r, self._reset = self._reset, False
            return r


PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WARDOGS Watch</title>
<style>
:root{--bg:#0f1115;--panel:#171a21;--line:#262a33;--text:#e6e8ee;--dim:#8b92a1;
--high:#ff5c5c;--med:#f5b942;--low:#4a5160}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);
font:14px/1.45 system-ui,-apple-system,"Malgun Gothic",sans-serif}
header{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;padding:12px 16px;
border-bottom:1px solid var(--line)}h1{font-size:16px;margin:0}
.st{color:var(--dim);font-size:12px}.st b{color:var(--text);font-weight:600}
button{margin-left:auto;background:var(--panel);color:var(--text);border:1px solid var(--line);
border-radius:6px;padding:6px 12px;cursor:pointer}
main{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;padding:16px}
@media(max-width:900px){main{grid-template-columns:1fr}.side{order:-1}}
section{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0}
h2{font-size:13px;margin:0 0 8px;color:var(--dim);font-weight:600}
table{width:100%;border-collapse:collapse}th,td{padding:7px 8px;border-bottom:1px solid var(--line);
text-align:left;vertical-align:top}th{color:var(--dim);font-weight:500;font-size:12px;white-space:nowrap}
.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.badge{display:inline-block;min-width:44px;text-align:center;border-radius:4px;padding:1px 6px;
font-size:12px;font-weight:700;color:#111}.high{background:var(--high)}.medium{background:var(--med)}
.low{background:var(--low);color:var(--text)}
.why{color:var(--dim);font-size:12px;margin-top:2px}.name{font-weight:600;overflow-wrap:anywhere}
tr.quiet .name{font-weight:500;color:var(--dim)}
ul{list-style:none;margin:0;padding:0}li{padding:4px 0;border-bottom:1px solid var(--line);font-size:13px;
overflow-wrap:anywhere}.t{color:var(--dim);font-variant-numeric:tabular-nums;margin-right:6px}
.alert{color:var(--high)}.tag{color:var(--med);font-size:11px;margin-left:4px}
.empty{color:var(--dim);padding:12px 0}.note{color:var(--dim);font-size:12px;padding:0 16px 16px}
@media(max-width:560px){.wide{display:none}main{padding:12px 8px}section{padding:10px}th,td{padding:6px 5px}}
</style></head><body>
<header><h1>WARDOGS Watch</h1><span class="st" id="st"></span>
<button id="reset" title="새 매치를 시작할 때 누르세요">통계 초기화</button></header>
<main>
<section><h2>의심도 순위</h2><table><thead><tr><th>등급</th><th>닉네임 · 근거</th><th class="n">점수</th>
<th class="n">킬</th><th class="n wide">데스</th><th class="n wide">분당 킬</th><th class="n">헤드샷</th>
</tr></thead><tbody id="players"></tbody></table><div class="empty" id="noplayers">아직 읽힌 킬이 없습니다.</div></section>
<div class="side" style="display:grid;gap:16px;align-content:start;min-width:0">
<section><h2>알림</h2><ul id="alerts"></ul></section>
<section><h2>최근 킬 피드</h2><ul id="feed"></ul></section></div>
</main>
<p class="note">점수는 관전해 볼 만한 사람을 고르는 참고용입니다. 핵이라는 증거가 아니니 공개적으로 지목하지 말고 공식 신고에 쓰세요.</p>
<script>
const LV={high:"높음",medium:"중간",low:"낮음"};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const clock=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");};
function render(d){
  const s=d.status||{};
  document.getElementById("st").textContent=
    `${s.running?"분석 중":"대기"} · 경과 ${clock(s.t||0)} · 킬 ${s.kills||0} · OCR ${s.ocr_ms||0}ms · 오인식 제외 ${s.dropped||0}`+
    (s.headshot?" · 헤드샷 인식 켜짐":" · 헤드샷 인식 꺼짐")+(s.error?` · 오류: ${s.error}`:"");
  const tb=document.getElementById("players");tb.replaceChildren();
  const shown=(d.players||[]).filter(p=>p.kills>0||p.score>0).slice(0,40);
  document.getElementById("noplayers").style.display=shown.length?"none":"block";
  for(const p of shown){
    const tr=el("tr",p.score?"":"quiet");
    const b=el("td");b.append(el("span","badge "+p.level,LV[p.level]));tr.append(b);
    const who=el("td");who.append(el("div","name",p.name));
    if(p.reasons.length)who.append(el("div","why",p.reasons.map(r=>r.text).join(" · ")));
    tr.append(who);
    tr.append(el("td","n",p.score));tr.append(el("td","n",p.kills));tr.append(el("td","n wide",p.deaths));
    tr.append(el("td","n wide",p.kpm.toFixed(1)));
    tr.append(el("td","n",p.headshot_rate==null?"-":Math.round(p.headshot_rate*100)+"%"));
    tb.append(tr);
  }
  const al=document.getElementById("alerts");al.replaceChildren();
  if(!(d.alerts||[]).length)al.append(el("li","empty","없음"));
  for(const a of d.alerts||[]){const li=el("li","alert");li.append(el("span","t",clock(a.t)));li.append(a.text);al.append(li);}
  const fd=document.getElementById("feed");fd.replaceChildren();
  for(const k of d.feed||[]){const li=el("li");li.append(el("span","t",clock(k.t)));
    li.append(`${k.killer} → ${k.victim}`);for(const t of k.tags)li.append(el("span","tag",t));fd.append(li);}
}
async function tick(){try{const r=await fetch("/api/state",{cache:"no-store"});render(await r.json());}
  catch(e){document.getElementById("st").textContent="분석 프로그램과 연결이 끊겼습니다";}}
document.getElementById("reset").onclick=()=>fetch("/api/reset",{method:"POST"});
tick();setInterval(tick,1000);
</script></body></html>"""


def serve(state: State, host: str, port: int) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def _send(self, code: int, body: bytes, ctype: str) -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):  # noqa: N802
            if self.path == "/":
                self._send(200, PAGE.encode(), "text/html; charset=utf-8")
            elif self.path == "/api/state":
                self._send(200, json.dumps(state.snapshot(), ensure_ascii=False).encode(),
                           "application/json; charset=utf-8")
            else:
                self._send(404, b"not found", "text/plain")

        def do_POST(self):  # noqa: N802
            if self.path == "/api/reset":
                state.request_reset()
                self._send(200, b"{}", "application/json")
            else:
                self._send(404, b"not found", "text/plain")

        def log_message(self, *args):  # 요청마다 콘솔에 찍히지 않게
            pass

    server = ThreadingHTTPServer((host, port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
