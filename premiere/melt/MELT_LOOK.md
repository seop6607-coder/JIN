# MELT 룩 기준 (Sequence 01 분석)

사용자 프리미어 프로젝트의 **Sequence 01**만 분석했습니다. 다른 시퀀스는 보지 않았습니다.
이 시퀀스에 쓰인 Higgsfield Seedance 2.5 생성 4건의 원래 프롬프트와 설정도 함께 정리했습니다.
값 전체는 `melt_look.json`에 있고, 프로젝트가 바뀌면 아래 명령으로 다시 뽑을 수 있습니다.

```
python3 premiere/melt/prproj_dump.py 프로젝트.prproj "Sequence 01" -o seq01.json
```

> 프로젝트 파일에는 화면 픽셀이 없습니다. 벽·제품·그림자의 실제 hex, 평균 밝기, 색온도는 아직 재지 않았습니다.
> 내보낸 영상이나 컷별 스틸을 주시면 `melt_look.json`의 `measured` 칸을 채웁니다.

## 한눈에 보는 구조 (30초, 1920x1080, 23.976fps, 전부 하드컷)

| 시간 | 길이 | 구간 | 내용 |
|---|---|---|---|
| 0.00–1.34 | 32f | 실사 오프닝 | 소니 실사, 0.77배 슬로, 169% 확대, -1.1° 기울기, 틸트업 느낌 이동. 어두운 로키 |
| 1.34–3.00 | 40f | 실사 오프닝 | 소니 실사 3배속, **흑백**, 밝은 하이키 + 블룸 |
| 3.00–4.50 | 36f | 실사 오프닝 | 소니 실사 2.4배속, 컬러, 하이키 + 블룸 |
| 4.50–6.51 | 48f | 문구 | **두번째 진화** (검정 바탕 흰 글자) |
| 6.51–8.01 | 36f | 에디토리얼 | Seedance: 기둥 가운데, 세로 드리프트 (0.90배) |
| 8.01–9.51 | 36f | 에디토리얼 | 같은 클립 뒷부분, 115% 고정 리프레임 |
| 9.51–11.01 | 36f | 에디토리얼 | Seedance: 낮은 사선 달리 (0.97배) |
| 11.01–14.01 | 72f | 에디토리얼 | Seedance: 바닥 원판, 1.5배속, 128→112% 천천히 줌아웃 |
| 14.01–16.02 | 48f | 문구 | **압도적인 견고함** |
| 16.02–19.14 | 75f | 에디토리얼 | Comp 1.mp4 1.81배속 |
| 19.14–21.02 | 45f | 에디토리얼 | Seedance: 멀리 선 기둥 + 빈 벽·바닥 |
| 21.02–26.03 | 120f | (비어 있음) | 검정. 작업 중 구간으로 보임 |
| 26.03–29.99 | 95f | 로고 | 흰 로고, 화면 폭 24%, 정가운데, 검정 바탕 |

- 컷 길이 기본 단위는 **36프레임(1.5초)**, 문구 카드는 **2초**, 긴 컷은 **3초**입니다. 컷 지점은 1.34초·19.14초를 빼면 모두 12프레임(0.5초) 그리드 위에 있습니다.
- 음악은 `BG.mp3`(30.01초)를 처음부터 통째로 깔았고 볼륨·페이드 키는 없습니다.

## 영상의 결: 두 가지 톤을 붙여 쓰고 있습니다

**1) 실사 오프닝 (0–4.5초): 빛이 터지는 티저.** 어두운 첫 컷에서 밝은 흑백, 다시 컬러로 넘어갑니다.
빠른 배속(3배, 2.4배), 강한 확대, 하이라이트 블룸으로 짧고 강렬하게 엽니다.

**2) 본편 (6.5–21초): 조용한 에디토리얼.** Seedance 클립에는 보정을 걸지 않았습니다(전체 샤픈만).
그래서 **프롬프트에 쓴 색이 곧 최종 색**입니다.
- 쿨 뉴트럴 그레이, 오프화이트, 차콜 그림자
- 무광, 한 방향에서 오는 부드러운 데이라이트, 길고 선명한 그림자
- 넓은 여백, 얕은 심도, 공개를 미루는 긴장감
- 클립은 0.9–0.97배로 살짝 느리게 써서 더 차분하게 만듭니다.

**3) 문구·로고:** 검정 바탕에 흰 Pretendard Regular, 가운데, 2초 하드컷. 애니메이션은 없습니다.

## 프리미어 색 보정 값 (그대로 다시 쓰는 레시피)

**전체 0–30초 (V5 조정 레이어)**: Lumetri > Creative > Sharpen **100**. 나머지는 모두 기본값입니다.
화이트밸런스, 커브, 휠, HSL, LUT, Look, 비네트는 쓰지 않았습니다.

**컷 1 (C6371) 클립 Lumetri: 어두운 로키**

| Exposure | Contrast | Highlights | Shadows | Whites | Blacks |
|---|---|---|---|---|---|
| -1.05 | +12 | +50 | -35.3 | -28.8 | 0 |

**컷 2 (C6344) 클립 Lumetri**: Creative > Saturation **0** (흑백)

**컷 2–3에 겹치는 조정 레이어 (아래 값이 위로 쌓임)**

| 레이어 | 효과 | 값 |
|---|---|---|
| V2 (0–4.5초) | Alpha Glow | Glow 25, Brightness 255, Start/End #C0C0C0, Fade Out 켬 |
| V2 | VR Glow | Luma Threshold 0.90, Radius 100, Brightness 1.0, Saturation 1.0, Tint 끔 |
| V2 | Lumetri | Exposure +1.0, Contrast +12, Highlights +10, Whites +10 |
| V3 (1.3–4.5초) | Lumetri | Exposure +0.2, Contrast +10, Highlights +10.2, Shadows -11.6, Whites +9.3 |

합치면 노출 **+1.2스톱**, 하이라이트·화이트 각각 약 **+20**의 밝은 하이키입니다.

**컷 1–3 전체 (V4 조정 레이어): Wonder Glow**

| Intensity | Highlights Only | Size | Vibrance | Color | Ambient | Chromatic Aberration | Blend |
|---|---|---|---|---|---|---|---|
| 60 | 40 | 50 | 10 | **#FFDFB3** (따뜻한 크림) | **#FF4746** 20% (붉은 기운) | 10 | 1 |

## 프롬프트에 그대로 넣는 블록

사용자님이 쓰신 Seedance 프롬프트 형식(`[SCENE TYPE] … [STRICT EXCLUSIONS]` + 네거티브 단어)을 그대로 따릅니다.

### A. MELT 룩 고정 블록 (모든 MELT 장면에 붙임)

```
[LIGHTING] Soft, diffused studio daylight from a single directional source, casting a long, crisp-edged shadow across the pale grey wall and floor — the shadow itself can become the primary visual subject. Cool-neutral grey tones throughout, no warm cast anywhere — any edge light stays cool white, never amber.
[COLOR PALETTE] Desaturated cool greys, soft off-white, charcoal shadow — matte, non-reflective surfaces only. Pale grey wall and floor, white product, low saturation, cool-neutral white balance.
[MOOD] Quiet anticipation, restrained tension, architectural minimalism. Pace is unhurried — closer to a fashion editorial than a product ad.
[COMPOSITION] Editorial magazine-style asymmetric framing with generous negative space; the frame breathes with empty wall and floor space, evoking a magazine spread's white space.
[CAMERA] Shot in 1920x1080, 16:9 landscape frame. Slow, deliberate movement, extreme shallow depth of field, occasional rack focus.
```

네거티브 (끝에 붙임):

```
people, human hands, human figures, faces, text, typography, logo, watermark, subtitles, captions, brand marking, bright even lighting, cluttered background, furniture, interior decor, warm tone, amber cast, orange highlight
```

### B. 티저 모드 (제품을 다 보여주지 않는 컷에만 추가)

```
[SCENE TYPE] Editorial magazine-style product teaser, minimalist still-life cinematography, rollout teaser for product launch
[SUBJECT] … The object's full form and identity are never fully revealed — only fragments, shadows, and negative space suggest its presence. No screen, no display panel, no branding, no text of any kind is visible anywhere in frame.
[COMPOSITION] Extreme negative space — the object occupies no more than 15-20% of frame at any time, off-center. Wide static holds interrupted by slow creeping push-ins that stop short of clarity.
[MOTION DETAIL] The shadow slowly lengthens as if light itself is moving in real time (implying time-lapse without stating it). A faint, almost imperceptible shimmer along the object's edge suggests material quality without showing texture detail.
```

티저 모드 네거티브 추가분: `sharp focus on product details, screws, cables, ports, full frontal clear product shot`

### C. Seedance 설정 (지금까지 쓴 값)

| 모델 | 비율 | 해상도 | 길이 | 비트레이트 | 스피드 램프 | 초안 | 참조 |
|---|---|---|---|---|---|---|---|
| seedance_2_5 | 16:9 | 1080p | 8초 | high | auto | 끔 | 이미지 2장 또는 6장 |

## 확인해 볼 점

- **오프닝만 따뜻합니다.** Wonder Glow 색이 크림(#FFDFB3)에 붉은 앰비언트가 섞여 있는데, 본편 프롬프트는 웜 톤을 금지합니다.
  일부러 나눈 거라면 그대로 두고, 한 톤으로 묶으려면 Glow 색을 흰색 쪽으로 옮기면 됩니다.
- **프롬프트 길이 표기:** 프롬프트에는 `[DURATION] 15 seconds`라고 적혀 있는데 실제 생성은 8초입니다.
  움직임 속도가 의도와 달라질 수 있으니 8초로 맞추는 편이 안전합니다.
- **Alpha Glow:** 투명한 경계에만 빛을 내는 효과라, 불투명한 실사 위 조정 레이어에서는 거의 보이지 않을 수 있습니다. 실제 화면에 영향이 있는지 한 번 껐다 켜서 확인해 보세요.
- **21.0–26.0초가 비어 있습니다.** 아직 작업 중인 구간으로 보고 분석에서 뺐습니다.
