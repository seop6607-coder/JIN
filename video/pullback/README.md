# 사운드바 풀백(멀어지는) 영상

사운드바 클로즈업에서 시작해 카메라가 천천히 뒤로 빠지며 MELT 스탠드 전체(TV + 사운드바 + 기둥 + 원형 받침)가 드러나는 한 컷 영상입니다. 힉스필드(Higgsfield)로 만들었습니다.

## 입력 이미지 (`inputs/`)

| 파일 | 용도 |
|---|---|
| `01_start_closeup.png` | **첫 프레임**. 사운드바 메쉬 아래 모서리와 흰 기둥 윗부분 클로즈업 (1920×1080) |
| `02_mid_soundbar.png` | 사운드바 모양 참고 (중간 거리 컷) |
| `03_full_no_soundbar.png` | 전체 제품 모양 참고 (사운드바 없음) |

## 만드는 순서

1. **마지막 프레임 만들기.** 사운드바가 달린 전체 제품 사진이 없어서, 3번(전체 모양)과 2번(사운드바), 1번(색감·조명)을 참고 이미지로 넣어 16:9 와이드 컷을 새로 만들었습니다.
   - 모델: Nano Banana Pro로 요청 (작업 기록상 모델명은 nano_banana_2), 16:9, 2K(2752×1536), 2장 생성 → 1장 선택
   - 2번처럼 사운드바는 TV 바로 아래 중앙 브래킷에 달리고 TV보다 조금 짧게, 기둥과 원형 받침은 3번과 같게, 배경은 밝은 회색 스튜디오, 글자/로고 없음
2. **영상 만들기.** 1번을 첫 프레임, 위에서 만든 컷을 마지막 프레임으로 넣고 한 번에 쭉 뒤로 빠지는 카메라 움직임(돌리 아웃)을 지시했습니다. 모델 3개로 같은 조건을 돌려 비교합니다.

| 모델 | 설정 | 크레딧 |
|---|---|---|
| Kling 3.0 | Pro, 8초, 16:9, 소리 없음 | 14 |
| MiniMax H3 | 2K, 8초, 16:9 | 16 |
| Seedance 2.5 | 1080p, 8초, 16:9, 소리 없음 | 96 |

## 결과

| | 링크 | 크기 | 점검 결과 |
|---|---|---|---|
| **추천: Kling 3.0** | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3HRWt2kMSqPTJaoKm0lzWNAD15z/hf_20261001_062259_36e2e5cb-5d14-4ff4-98cd-31cc4679ab1c.mp4) | 1920×1080, 24fps, 8.04초, 소리 없음 | 첫 프레임 = 1번 이미지, 마지막 프레임 = 만든 와이드 컷. 8초 내내 고르게 빠지다가 끝에서 천천히 멈춤. 컷 튐 없음 |
| 대안: MiniMax H3 | [mp4](https://d8j0ntlcm91z4.cloudfront.net/user_3HRWt2kMSqPTJaoKm0lzWNAD15z/hf_20261001_062259_56a4de0e-c4e3-4fa8-9d5a-fe45029ff75c.mp4) | 2560×1440, 24fps, 8초, 오디오 트랙 있음(빼고 사용) | 첫/마지막 프레임 일치. 1.6~2.1초 구간이 조금 빠르고, 약 6초에 전체 컷에 도착해 마지막 2초는 정지 화면 |
| 제외: Seedance 2.5 | — | 1920×1080 | 첫 프레임이 1번 이미지와 다른 구도로 시작해서 제외 |

- 마지막 프레임 이미지: [png](https://d8j0ntlcm91z4.cloudfront.net/user_3HRWt2kMSqPTJaoKm0lzWNAD15z/hf_20261001_061254_42c809ed-133f-4571-9e1e-c5605c7d76d2.png)
- 점검 방법: 프레임을 96×54 흑백으로 줄여 첫/마지막 프레임과 입력 이미지의 상관도(Kling 1.000 / 0.999, MiniMax 1.000 / 0.993), 연속 프레임 간 상관도 최솟값(Kling 0.964, MiniMax 0.910)을 비교했습니다. 제품 형태가 일그러지는지는 직접 보고 확인해야 합니다.
- 힉스필드 계정의 생성 기록에도 같은 결과가 있습니다.

## 영상 프롬프트

```
Premium minimalist product film, one continuous shot, no cuts. The camera starts in an
extreme close-up on the lower edge of a black fabric-mesh soundbar and the top of a white
pole beneath it, then performs a slow, smooth, steady dolly-out, pulling straight back away
from the product. As it pulls back the camera gently levels its slight tilt and recenters,
revealing the full soundbar, then the large black TV screen above it, then the slim white
pole all the way down to the round white base on the floor. It settles on a centered,
straight-on wide shot of the complete TV stand with soundbar. Focus racks from a shallow
macro depth of field to everything sharp. Soft diffused studio light, seamless light-gray
backdrop, muted monochrome tones. The product is completely still and rigid: no morphing,
no shape changes, no extra objects, no people, no text. Gentle ease-in and ease-out camera
speed.
```

## 마지막 프레임 프롬프트

```
Photorealistic premium product photograph, 16:9 landscape wide shot. Show the complete
minimalist TV stand from the first reference image, centered, straight-on front view,
camera at the height of the TV's lower edge: a large thin-bezel flat TV with a black
switched-off screen, held by one slim matte off-white cylindrical pole that rises from a
round flat off-white disc base resting on the floor. Add the soundbar from the second
reference image, mounted directly under the TV's bottom edge on a small center bracket with
a narrow gap: a long black rectangular bar with chamfered angled ends, fine black speaker
mesh grille, two subtle circular driver outlines near each end, slightly narrower than the
TV. The white pole passes behind the soundbar and continues down to the base; the part of
the pole just below the soundbar is in soft shadow, exactly like the third reference image.
Seamless light neutral-gray studio backdrop wall and a slightly darker gray floor, soft
diffused light from the left, gentle falloff, soft contact shadow under the base, a thin
power cable trailing to the right on the floor. Muted monochrome grade matching the third
reference image: neutral grays, deep blacks, no color cast. The whole product fits inside
the frame with comfortable empty space around it. No text, no logo, no watermark, no
people, no other objects.
```

참고 이미지 순서: 3번 → 2번 → 1번.

## 프리미어에서 쓸 때

- 8초로 만들었습니다. 레퍼런스 리듬(1박자 = 1.13초)에 맞추려면 속도를 조절해 4.5박자(약 5.1초)로 줄이면 '아주 느린 풀' 자리에 맞습니다.
- 첫 프레임이 원본 1번 이미지와 같으므로, 원본 클로즈업 컷 끝에 이어 붙이면 자연스럽게 이어집니다.
