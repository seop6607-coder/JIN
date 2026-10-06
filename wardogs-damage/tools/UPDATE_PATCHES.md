# 패치노트 갱신 절차

새 WARDOGS 패치가 나오면 패치노트 탭(`js/patches.js`)에 추가하는 절차입니다.
정해진 시간마다 Claude 루틴이 이 절차를 그대로 따라 자동으로 갱신하고, 사람이 손으로 할 때도 같습니다.

## 1. 지금 실린 마지막 항목 확인

```
node tools/check-patches.js
```

출력의 "최신" 날짜와 id가 기준입니다.

## 2. 새 공지 찾기

이 환경은 Steam API와 위키에 직접 접속할 수 없어서 웹 검색으로 찾습니다.

- 검색어 예: `WARDOGS patch notes`, `WARDOGS hotfix`, `WARDOGS update <월> <연도>`, `WARDOGS Season 2 patch notes`
- 우선 확인할 곳: Steam 공지(`store.steampowered.com/news/app/1867240`, `steamcommunity.com/games/1867240/announcements`),
  X `@WARDOGSUpdates`·`@WARDOGS`, `patchbot.io/games/wardogs`, `wardogshub.gg/patch-notes`
- 실을 기준
  - 마지막 항목 날짜 **이후**(같은 날 포함) 나온 업데이트·핫픽스·시즌 패치
  - Steam 공지나 @WARDOGSUpdates 같은 **공식 발표가 있는 것만** 싣습니다. 보도만 있고 공식 확인이 없으면 다음 확인 때까지 보류합니다.
  - 이미 실린 업데이트에서 빠진 변경 사항을 찾으면 그 항목에 보강합니다.
  - 다음 시즌·대형 업데이트 예고는 `next`에 반영합니다.
- 새 공지가 없으면 **아무 파일도 바꾸지 않고** 끝냅니다.

## 3. `js/patches.js`에 쓰기

`list` **맨 앞**에 넣습니다 (최신이 위). 같은 날 여러 건이면 나중에 게시된 것을 위에 둡니다.

```js
{
  id: '0-1-3',                 // 소문자·숫자·하이픈. 카드 주소 #patch-<id>
  date: '2026-10-08',          // 배포일 (UTC)
  type: 'patch',               // season · patch · hotfix
  version: '0.1.3',            // 없으면 null
  title: T(ko, en, ja, 간체, 번체),
  summary: T(...),             // 한두 문장
  downtime: T(...),            // 점검 시간. 없으면 null
  impact: { some: false, text: T(...) },   // 사이트 수치·내용과 닿으면 some: true
  items: [
    { cat: 'balance', lab: 'weapons', text: T(...) }
  ],
  tables: [ /* 선택: 이전 → 이후 표 */ ],
  sources: [ { site: 'Steam', url: 'https://…' } ]
}
```

- **5개 언어 모두** 씁니다: 한국어, English, 日本語, 简体中文, 繁體中文. 원문을 옮기지 말고 각 언어로 자연스럽게 요약합니다.
  - 한국어: 평서문 "~했습니다/~합니다". 간체·번체는 용어를 각각 맞춥니다 (예: 服务器/伺服器, 补丁/更新檔).
  - 영어 문구의 아포스트로피는 `’`를 씁니다.
- `cat`: `balance`(밸런스·경제) · `gameplay` · `stability`(안정성·버그 수정) · `fair`(악용 방지·제재) · `ui`(UI·서버 목록)
- `lab`(선택): 데미지 탭 섹션이나 무게 탭과 닿는 변경에 붙이면 링크가 생깁니다.
  쓸 수 있는 값: `calculator` `matrix` `armor` `weapons` `structures` `explosives` `vehicles` `formula` `weight`
- `tables`: 가격·XP·해금 레벨처럼 **값이 커질수록 플레이어에게 불리한** 항목의 이전 → 이후만 싣습니다.
  `{ cat: 'balance', title: T(...), rows: [[이름(문자열 또는 T), '이전', '이후'], …] }`
- `sources`: 공식 공지를 먼저, 보도를 그 뒤에 둡니다.

## 4. 수치가 바뀐 패치라면

무기 피해량, 방어구 감소율, 아이템 무게처럼 **사이트에 실린 값**이 바뀌었는지 확인합니다.

- 정확한 새 값이 공개됐으면 `js/data.js`를 고칩니다.
  - 무기 기본 피해가 바뀐 무기는 `measured`(이전 패치의 실측값)를 지웁니다. 그대로 두면 검증표가 어긋납니다.
  - `check`를 `level: 'updated'`로 바꾸고, 무엇을 반영했는지 5개 언어로 적습니다.
- 바뀐다는 발표만 있고 값이 없으면 `check`를 `level: 'pending'`으로 두고 반영 전이라고 적습니다.
- 사이트에 없는 값만 바뀌었으면 `level: 'ok'`를 유지하되 `check.body`에 한 줄을 보탭니다.

## 5. 시즌이 바뀌면

- 시즌 패치노트를 `type: 'season'` 항목으로 넣고, `next`는 다음 예고로 바꾸거나 없으면 `null`로 둡니다.
- `js/data.js`의 `version`(예: `2026.10 · 시즌 1`)을 새 시즌으로 바꿉니다.
- 새 무기·장비가 생겼으면 `data.js`에 추가하고, 수치를 모르면 "미공개"로 표시합니다.

## 6. 검사

```
node tools/check-patches.js
node tools/smoke.js
```

둘 다 OK가 나와야 커밋합니다. `smoke.js`는 5개 언어 × 데스크톱·휴대폰 × 3개 탭에서 오류·넘침·번역 누락을 봅니다.

## 7. 마무리

1. `README.md`의 패치노트 "수록" 줄을 갱신합니다.
2. 커밋 메시지: `Add WARDOGS <버전 또는 제목> patch notes`
3. 미리보기를 쓰고 있다면 `python3 tools/bundle.py <출력 파일>`로 한 파일로 묶어 다시 게시합니다.
