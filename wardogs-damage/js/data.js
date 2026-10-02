/*
 * 워독스 데미지 랩 · 데이터
 *
 * 2026년 시즌 1 기준. 해외 커뮤니티 데이터베이스와 사격장 실측 자료를 교차 확인해 정리했습니다.
 *   - dmg: 탄 1발(산탄은 펠릿 1개)의 기본 피해. 부위 배율을 곱하기 전 값
 *   - rpm: 게임 표기 연사 속도 / rpmM: 사격장 실측 연사 속도 (처치 시간 계산에 우선 사용)
 *   - range: 피해가 줄지 않는 거리(유효 사거리, m)
 *   - measured: 사격장 실측 1발 피해 (일반탄, 맨몸, 약 20 m). 계산 모델 검증에 사용
 *   - null: 아직 공개된 값이 없는 항목 (화면에 "미공개"로 표시)
 *
 * 계산식
 *   부위 배율   = 무기 종류별 배율[부위 그룹] × 부위 비율
 *   보호 부위   = 기본 피해 × 펠릿 수 × 부위 배율 × 탄종 보정(방어구) × (1 − 방어구 감소율)
 *   비보호 부위 = 기본 피해 × 펠릿 수 × 부위 배율 × 탄종 보정(맨몸)
 *   처치 탄수   = ceil(체력 100 ÷ 1발 피해)
 */
window.WD_DATA = {
  version: '2026.10 · 시즌 1',
  hp: 100,

  /*
   * 피격 부위 12곳.
   * group = 무기 종류별 배율표에서 가져올 항목, k = 그 항목에 곱하는 부위 비율
   */
  zones: [
    { id: 'head', name: '머리', group: 'head', k: 1 },
    { id: 'neck', name: '목', group: 'head', k: 0.75 },
    { id: 'upperTorso', name: '상부 몸통', group: 'chest', k: 1 },
    { id: 'torso', name: '몸통', group: 'torso', k: 1 },
    { id: 'lowerTorso', name: '하부 몸통', group: 'torso', k: 0.95 },
    { id: 'pelvis', name: '골반', group: 'pelvis', k: 0.9 },
    { id: 'shoulder', name: '상완', group: 'limbs', k: 0.6 },
    { id: 'forearm', name: '전완', group: 'limbs', k: 0.5 },
    { id: 'hand', name: '손', group: 'limbs', k: 0.3 },
    { id: 'thigh', name: '허벅지', group: 'limbs', k: 0.6 },
    { id: 'shin', name: '종아리', group: 'limbs', k: 0.5 },
    { id: 'foot', name: '발', group: 'limbs', k: 0.3 }
  ],

  zoneGroups: [
    { id: 'head', name: '머리' },
    { id: 'chest', name: '가슴' },
    { id: 'torso', name: '몸통' },
    { id: 'pelvis', name: '골반' },
    { id: 'limbs', name: '팔다리' }
  ],

  /* 무기 종류별 부위 배율. est = 실측이 없어 다른 종류에서 빌려 온 항목 */
  classMults: {
    ar: { head: 2.35, chest: 1.1, torso: 1.0, pelvis: 1.0, limbs: 0.9 },
    smg: { head: 2.1, chest: 1.155, torso: 1.05, pelvis: 1.05, limbs: 1.3 },
    pistol: { head: 2.1, chest: 1.155, torso: 1.05, pelvis: 1.05, limbs: 1.3 },
    lmg: { head: 2.3, chest: 1.155, torso: 1.05, pelvis: 1.0, limbs: 0.9 },
    dmr: { head: 2.5, chest: 1.43, torso: 1.3, pelvis: 1.0, limbs: 1.0 },
    sniper: { head: 3.2, chest: 1.98, torso: 1.45, pelvis: 1.3, limbs: 1.2 },
    shotgun: { head: 1.5, chest: 0.99, torso: 0.9, pelvis: 0.9, limbs: 0.9, est: ['pelvis', 'limbs'] },
    bow: { head: 2.3, chest: 2.09, torso: 1.9, pelvis: 1.0, limbs: 0.8 }
  },

  /*
   * 탄종: flesh = 맨몸 부위 보정 (사격장 실측, 7개 구경에서 동일),
   *       armored = 방어구 부위 보정 (커뮤니티 해석. 실측 미완료)
   */
  ammo: [
    { id: 'fmj', code: 'FMJ', name: '일반탄', flesh: 1.0, armored: 1.0, desc: '기본 지급. 맨몸과 방어구에 고르게 들어갑니다.' },
    { id: 'hp', code: 'HP', name: '할로우 포인트', flesh: 2.0, armored: 0.7, desc: '맨몸 2배. 방어구에 맞으면 30% 약해집니다.', unlock: 'WARDOG Lv10 (5.56 기준)' },
    { id: 'ap', code: 'AP', name: '철갑탄', flesh: 0.8, armored: 1.3, desc: '방어구에 30% 더 들어가고 맨몸엔 20% 약합니다.', unlock: 'WARDOG Lv83 (5.56 기준)' }
  ],

  /* 몸통 방어구 */
  armor: [
    { lvl: 0, name: '갑옷 없음', short: '없음', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
    { lvl: 1, name: 'Level 1 방탄복', short: 'L1', cls: '경량', price: 400, weight: 3.0, durability: 200, reduction: 0.3, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv3 · $10,000' },
    { lvl: 2, name: 'Level 2 방탄복', short: 'L2', cls: '중형', price: 1000, weight: 4.5, durability: 220, reduction: 0.4, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv30 · $50,000' },
    { lvl: 3, name: 'Level 3 방탄복', short: 'L3', cls: '중량', price: 2000, weight: 10.5, durability: 250, reduction: 0.55, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv60 · $100,000' },
    { lvl: 4, name: 'Level 4 방탄복', short: 'L4', cls: '초중량', price: 4000, weight: 18.0, durability: 300, reduction: 0.65, covers: ['upperTorso', 'torso', 'lowerTorso', 'pelvis', 'shoulder'], unlock: 'WARDOG Lv100 · $200,000' }
  ],

  /* 헬멧 */
  helmets: [
    { lvl: 0, name: '헬멧 없음', short: '없음', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
    { lvl: 1, name: 'Level 1 헬멧', short: 'L1', price: 200, weight: 1.0, durability: 80, reduction: 0.3, covers: ['head'], unlock: 'WARDOG Lv3' },
    { lvl: 2, name: 'Level 2 헬멧', short: 'L2', price: 500, weight: 1.6, durability: 100, reduction: 0.4, covers: ['head'], unlock: 'WARDOG Lv30' },
    { lvl: 3, name: 'Level 3 헬멧', short: 'L3', price: 1500, weight: 3.0, durability: 180, reduction: 0.55, covers: ['head', 'neck'], unlock: 'WARDOG Lv60 · $75,000' },
    { lvl: 4, name: 'Level 4 헬멧', short: 'L4', price: 3000, weight: 4.5, durability: 200, reduction: 0.65, covers: ['head', 'neck'], unlock: 'WARDOG Lv100 · $150,000' }
  ],

  /* 무기 분류 */
  classes: [
    { id: 'ar', name: '돌격소총', total: 8 },
    { id: 'smg', name: '기관단총', total: 4 },
    { id: 'lmg', name: '경기관총', total: 2 },
    { id: 'dmr', name: '지정사수소총', total: 3 },
    { id: 'sniper', name: '저격소총', total: 5 },
    { id: 'shotgun', name: '산탄총', total: 2 },
    { id: 'pistol', name: '권총', total: 5 },
    { id: 'launcher', name: '발사기', total: 4 },
    { id: 'bow', name: '활', total: 1 }
  ],

  /* 무기 34종 */
  weapons: [
    { id: 'a91', cls: 'ar', name: 'A-91', caliber: '5.56×45mm', dmg: 28, rpm: 700, fire: '반자동·점사', price: 0, range: null, vel: 715, note: '진영 신병 소총. 부착물 장착 불가' },
    { id: 'kh2002', cls: 'ar', name: 'KH-2002', caliber: '5.56×45mm', dmg: 28, rpm: 700, fire: '반자동·점사', price: 0, range: 300, vel: 715, note: 'Manticore 신병 소총. 부착물 장착 불가' },
    { id: 'm17s', cls: 'ar', name: 'Bushmaster M17S', caliber: '5.56×45mm', dmg: 28, rpm: 700, rpmM: 578, fire: '반자동·점사', price: 0, range: 300, vel: 715, weight: 3.17, measured: { upperTorso: 30.81, head: 65.81 } },
    { id: 't21', cls: 'ar', name: 'T-21', caliber: '5.56×45mm', dmg: 28, rpm: 750, fire: '자동', price: 600, range: 550, vel: 910, weight: 3.27 },
    { id: 'galil', cls: 'ar', name: 'Galil', caliber: '5.56×45mm', dmg: 28, rpm: 650, fire: '자동', price: 2200, range: 400, vel: 950 },
    { id: 'ak74', cls: 'ar', name: 'AK74', caliber: '5.45×39mm', dmg: 26, rpm: 650, fire: '자동', price: 1600, range: 500, vel: 880, weight: 3.0, measured: { neck: 45.8 } },
    { id: 'm4', cls: 'ar', name: 'M4', caliber: '5.56×45mm', dmg: 28, rpm: 800, rpmM: 786, fire: '자동', price: 2800, range: 500, vel: 910, unlock: 'Assault Lv20 · $100,000', measured: { upperTorso: 30.8, head: 65.8 } },
    { id: 'fal', cls: 'ar', name: 'FAL', caliber: '7.62×51mm', dmg: 60, rpm: 650, fire: '자동', price: 6500, range: 800, vel: 840, unlock: 'Assault Lv35 · $200,000', measured: { upperTorso: 66 } },

    { id: 'amp9', cls: 'smg', name: 'AMP-9', caliber: '9×19mm', dmg: 22, rpm: 900, rpmM: 868, fire: '자동', price: 900, range: null, measured: { upperTorso: 25.4, head: 46.2 } },
    { id: 'pp19', cls: 'smg', name: 'PP-19 Vityaz', caliber: '9×19mm', dmg: 22, rpm: 800, rpmM: 770, fire: '자동', price: 1200, range: 200, measured: { upperTorso: 25.43, head: 46.21 } },
    { id: 'mp5', cls: 'smg', name: 'MP5', caliber: '9×19mm', dmg: 22, rpm: 800, rpmM: 786, fire: '자동', price: 1500, range: null, measured: { upperTorso: 25.43, head: 46.21 } },
    { id: 'super45', cls: 'smg', name: 'Super-45', caliber: '.45 ACP', dmg: 30, rpm: 1200, rpmM: 1137, fire: '자동', price: 2600, range: null, unlock: 'Medic Lv35', measured: { upperTorso: 34.7, head: 63 } },

    { id: 'm249', cls: 'lmg', name: 'M249 SAW', caliber: '5.56×45mm', dmg: 28, rpm: 850, rpmM: 824, fire: '자동', price: 3200, range: null, measured: { upperTorso: 32.36, head: 64.4 } },
    { id: 'pkm', cls: 'lmg', name: 'PKM', caliber: '7.62×54mmR', dmg: 55, rpm: null, rpmM: 865, fire: '자동', price: 4500, range: 1000, unlock: 'Support Lv30', measured: { upperTorso: 63.54, head: 126.5 } },

    { id: 'sks', cls: 'dmr', name: 'SKS', caliber: '7.62×39mm', dmg: 42, rpm: null, rpmM: 360, fire: '반자동', price: 2400, range: null, measured: { upperTorso: 60.08 } },
    { id: 'svd', cls: 'dmr', name: 'SVD', caliber: '7.62×54mmR', dmg: 55, rpm: null, rpmM: 341, fire: '반자동', price: 4800, range: null, measured: { upperTorso: 78.7, head: 137.5 } },
    { id: 'bmr308', cls: 'dmr', name: 'BMR-308', caliber: '.308 Win', dmg: 60, rpm: null, rpmM: 381, fire: '반자동', price: 6000, range: null, measured: { upperTorso: 85.8, head: 150 } },

    { id: 'scout', cls: 'sniper', name: 'Scout Rifle TD', caliber: '5.56×45mm', dmg: 28, rpm: 46, fire: '볼트액션', price: 1100, range: null, weight: 2.95, measured: { upperTorso: 55.4, head: 89.6 } },
    { id: 'mosin', cls: 'sniper', name: 'Mosin Nagant', caliber: '7.62×54mmR', dmg: 55, rpm: 46, fire: '볼트액션', price: 4500, range: 500, vel: 865, measured: { upperTorso: 108.92, head: 176 } },
    { id: 'sv98', cls: 'sniper', name: 'SV98', caliber: '7.62×54mmR', dmg: 55, rpm: 46, fire: '볼트액션', price: 5200, range: null, weight: 5.8, measured: { upperTorso: 108.9, head: 176 } },
    { id: 'mk22', cls: 'sniper', name: 'MK22', caliber: '.308 Win', dmg: 60, rpm: 46, fire: '볼트액션', price: 6400, range: 1000, weight: 6.3, measured: { upperTorso: 118.8, head: 192 } },
    { id: 'amr50', cls: 'sniper', name: 'AMR 50', caliber: '.50 Cal', dmg: 107, rpm: 41.5, fire: '볼트액션', price: 8800, range: null, unlock: 'Recon Lv35 · $200,000', measured: { upperTorso: 211.9, head: 342.4 } },

    { id: 'mp43', cls: 'shotgun', name: 'MP43', caliber: '12g 7mm 벅샷', dmg: 25, pellets: 8, rpm: 900, fire: '중절식 2연발', price: 400, range: null, vel: 391, ammo: false, note: '전탄 명중 기준. 슬러그탄 105 (WARDOG Lv41)', measured: { upperTorso: 198, head: 300 } },
    { id: 'm500', cls: 'shotgun', name: 'M500', caliber: '12g 7mm 벅샷', dmg: 25, pellets: 8, rpm: 120, fire: '펌프 6발', price: 1200, range: 70, vel: 480, ammo: false, note: '전탄 명중 기준. 슬러그탄 105 (WARDOG Lv41)', measured: { upperTorso: 198, head: 300 } },

    { id: 'ggx17', cls: 'pistol', name: 'GGX 17', caliber: '9×19mm', dmg: 22, rpm: null, rpmM: 482, fire: '반자동', price: 200, range: null, unlock: 'WARDOG Lv1', measured: { upperTorso: 25.4, head: 46.2 } },
    { id: 'ggx18', cls: 'pistol', name: 'GGX 18', caliber: '9×19mm', dmg: 22, rpm: null, rpmM: 1150, fire: '자동', price: 800, range: null, unlock: 'WARDOG Lv70', measured: { upperTorso: 25.4, head: 46.2 } },
    { id: 'm1911', cls: 'pistol', name: 'M1911', caliber: '.45 ACP', dmg: 30, rpm: 430, fire: '반자동', price: 300, range: 50, vel: 253 },
    { id: 'judge', cls: 'pistol', name: 'Judge', caliber: '.45 Colt', dmg: 45, rpm: 200, fire: '리볼버', price: 250, range: 50, vel: 335, measured: { upperTorso: 51.99, head: 94.5 } },
    { id: 'deagle', cls: 'pistol', name: 'Deagle', caliber: '.50 AE', dmg: 63, rpm: 267, rpmM: 240, fire: '반자동', price: 900, range: null, unlock: 'WARDOG Lv85 · $75,000', measured: { upperTorso: 72.78, head: 132.32 } },

    { id: 'rpg7', cls: 'launcher', name: 'RPG-7', caliber: 'PG-7 로켓', dmg: 110, rpm: null, fire: '단발', price: 2000, range: 300, explosive: true, unlock: 'Support Lv5 · $30,000', note: '폭발 반경 12 m · 최대 피해 2.5 m' },
    { id: 'maaws', cls: 'launcher', name: 'MAAWS', caliber: '84mm 대전차탄', dmg: 100, rpm: null, fire: '단발', price: 2600, range: null, explosive: true, unlock: 'Support Lv20 · $125,000', note: '폭발 반경 10 m · 최대 피해 4 m · 전차 전면 2발' },
    { id: 'mgl40', cls: 'launcher', name: 'MGL-40', caliber: '40mm 유탄 6연발', dmg: 100, rpm: 75, fire: '반자동', price: 6000, range: 400, explosive: true, unlock: 'Support Lv35 · $200,000', note: '폭발 반경 미공개' },
    { id: 'verba', cls: 'launcher', name: '9K333 Verba', caliber: '적외선 유도 대공 미사일', dmg: 200, rpm: null, fire: '락온', price: 800, range: 1000, explosive: true, unlock: 'Support Lv16 · $50,000', note: '항공기에만 락온' },

    { id: 'bow', cls: 'bow', name: 'Compound Bow', caliber: '브로드헤드 화살', dmg: 77, rpm: 90, fire: '수동', price: 800, range: null, ammo: false, unlock: 'Recon Lv17 · $125,000', note: '소음 없는 암살용', measured: { upperTorso: 160.9, head: 177.1 } }
  ],

  /*
   * 폭발 피해 (보병 기준).
   * radius = 폭발 반경, full = 최대 피해가 유지되는 반경, edge = 반경 끝에서의 피해 (없으면 0)
   */
  explosives: [
    { id: 'c4', name: 'C4', kind: '원격 기폭 폭약', dmg: 250, radius: 6, full: 2.5, edge: 20, price: 250, trigger: '리모트 기폭기 $550 필요', unlock: 'Support Lv2', note: '소형 HESCO 2개, FOB 5개' },
    { id: 'ied', name: 'IED', kind: '급조 폭발물', dmg: 250, radius: 6, full: 2.5, price: 300, trigger: '원격 기폭', note: 'FOB·드릴 리그를 1개로 파괴. 2 m 안의 험비 즉파' },
    { id: 'claymore', name: '클레이모어', kind: '지향성 지뢰', dmg: 150, radius: 3, full: 1.5, price: 900, trigger: '동작 감지 (보병·차량)', unlock: 'Recon Lv22 · $50,000', note: '문, 계단 길목 봉쇄용' },
    { id: 'atmine', name: '대전차 지뢰', kind: '압력 지뢰', dmg: 300, radius: 7.5, full: null, price: 650, trigger: '차량 압력', note: '차량 1회 파괴. 전차는 후진으로 밟았을 때만 화재' },
    { id: 'rpg7', name: 'RPG-7 로켓', kind: '대전차 로켓', dmg: 110, radius: 12, full: 2.5, price: 2000, trigger: '최소 기폭 거리 있음', note: '전차 전면에는 거의 안 들어감' },
    { id: 'maaws', name: 'MAAWS 탄', kind: '84mm 대전차탄', dmg: 100, radius: 10, full: 4, price: 2600, trigger: '최소 기폭 거리 있음', note: '전차 전면 2발' },
    { id: 'mgl40', name: 'MGL-40 유탄', kind: '40mm 고폭 유탄', dmg: 100, radius: null, full: null, price: 6000, trigger: '충격 신관', note: '6연발 리볼버식' },
    { id: 'm67', name: 'M67 세열수류탄', kind: '투척 수류탄', dmg: null, radius: null, full: null, price: 200, trigger: '시한 신관', note: '피해·반경 미공개. 무게 0.4 kg' }
  ],

  /* 포탄·로켓 (폭발 거리 시뮬레이터용). L81의 full은 커뮤니티가 말하는 살상 반경 5 m를 썼습니다 */
  ordnance: [
    { id: 'l81', name: 'L81 박격포탄', dmg: 120, radius: 10, full: 5 },
    { id: 'he155', name: '155mm 곡사포탄', dmg: 450, radius: 20, full: 7.5 },
    { id: 'r122', name: '122mm 로켓', dmg: 100, radius: 6, full: 2, edge: 10 },
    { id: 'he30', name: '30mm 고폭탄', dmg: 100, radius: 3, full: 1, edge: 20 }
  ],

  /* 건축물 장비 (FOB에 짓는 무기 시설) */
  structures: [
    {
      id: 'l81', name: 'L81 박격포', role: '81mm 간접 사격', dmg: 120, hp: 3000,
      stats: [['폭발 반경', '10 m'], ['살상 반경', '5 m'], ['사거리', '50–700 m'], ['재장전', '6.5초'], ['내구도', '3,000'], ['건설', '보급 150']],
      note: '포탄 1발에 탄약 보급 약 30을 씁니다. 차량과 건축물은 대개 2발이면 무너집니다.'
    },
    {
      id: 'talon', name: 'Talon 9K-SAM', role: '열추적 대공 미사일', dmg: 100, hp: 3000,
      stats: [['유도', '적외선'], ['표적', '헬기'], ['내구도', '3,000'], ['건설', '보급 1,000']],
      note: '재장전식 대공 미사일 기지입니다.'
    },
    {
      id: 'ciws', name: 'Vanguard CIWS', role: '35mm 근접 방공포', dmg: 18, hp: 5000,
      stats: [['포', 'Oerlikon GDF 쌍열'], ['탄', '35×228mm'], ['내구도', '5,000'], ['건설', '보급 1,500']],
      note: '사람이 직접 조작합니다. 발당 피해는 낮고 연사로 몰아붙입니다. 탄약 보급품을 씁니다.'
    },
    {
      id: 'stingray', name: 'Stingray', role: '대전차 자폭 드론 발사대', dmg: 120, hp: 3000,
      stats: [['탄', '자폭 UAV'], ['동시 운용', '1대'], ['내구도', '3,000'], ['보급', '기계 보급품']],
      note: 'Talon은 25발, CIWS는 42발에 파괴합니다.'
    }
  ],

  /* 건축물 내구도 */
  buildables: [
    { name: 'FOB', hp: 15000 }, { name: 'Bremer 방벽', hp: 6500 }, { name: '게이트', hp: 5320 },
    { name: '벙커', hp: 5000 }, { name: '정찰탑', hp: 5000 }, { name: '간접사격 대피소', hp: 5000 },
    { name: 'Vanguard CIWS', hp: 5000 }, { name: 'HESCO 방벽', hp: 4600 }, { name: '대전차 장애물', hp: 4500 },
    { name: 'L81 박격포', hp: 3000 }, { name: 'Talon 9K-SAM', hp: 3000 }, { name: '대형 HESCO 블록', hp: 2250 },
    { name: '문', hp: 2200 }, { name: '소형 HESCO 블록', hp: 1600 }, { name: '재급유소', hp: 1600 },
    { name: '수리소', hp: 1600 }, { name: '건설 무전기', hp: 1000 }, { name: '확성기', hp: 1000 },
    { name: '모래주머니 벽', hp: 735 }, { name: '정찰 텐트', hp: 300 }, { name: '철조망', hp: 250 }
  ],

  /* 건축물을 부수는 데 필요한 양 */
  demolition: {
    tools: ['C4', 'IED', 'RPG-7', 'MAAWS'],
    rows: [
      { target: '문', counts: [1, 1, 1, 1] },
      { target: '게이트', counts: [1, 1, 2, 4] },
      { target: '대형 HESCO', counts: [4, 2, 7, 8] },
      { target: 'FOB', counts: [5, 1, 6, 6] }
    ]
  },

  /* 차량과 탑재 무기 */
  vehicles: [
    { id: 'l2a6', name: 'L2A6', kind: '주력 전차', hp: 800, seats: 3, speed: 65, weapons: [
      { name: 'L55A1 120mm 주포', ammo: '120mm HEAT-MP', dmg: 150 },
      { name: 'MG3A1 공축기관총', ammo: '.308 Win', dmg: 60, perRound: true },
      { name: 'M249 기관총', ammo: '5.56×45mm', dmg: 28, perRound: true }
    ] },
    { id: 'sph2', name: 'SPH-2', kind: '자주포', hp: 650, seats: 3, speed: 65, weapons: [
      { name: 'L52 155mm 곡사포', ammo: '155mm HE', dmg: 450, blast: '반경 20 m · 최대 7.5 m' },
      { name: 'M249 기관총', ammo: '5.56×45mm', dmg: 28, perRound: true }
    ], note: '사거리 2.7 km, 재장전 25–27초' },
    { id: 'havoc', name: 'Havoc', kind: '공격 헬기', hp: 800, seats: 2, speed: 400, weapons: [
      { name: '2A42 30mm 기관포', ammo: '30mm HE', dmg: 100, blast: '반경 3 m · 최대 1 m' },
      { name: 'B-13 로켓 포드', ammo: '122mm 로켓', dmg: 300, blast: '반경 3 m' }
    ], note: '회당 $18,000 · Pilot Lv35' },
    { id: 'gepard', name: 'Flakpanzer Gepard', kind: '대공 전차', hp: 800, seats: 2, speed: 65, weapons: [
      { name: 'Oerlikon GDF 35mm 쌍열', ammo: '35×228mm', dmg: 18 }
    ] },
    { id: 'm113', name: 'M113 APC SV', kind: '병력 수송 장갑차', hp: 1000, seats: 10, speed: 71, weapons: [], note: '한 팀이 20점에 도달하면 기지에 등장' },
    { id: 'humvee', name: 'Humvee', kind: '경차량', hp: 500, seats: 4, speed: 113, weapons: [
      { name: 'M249 (M249 사양)', ammo: '5.56×45mm', dmg: 28, perRound: true },
      { name: 'M134D 미니건 (미니건 사양)', ammo: '7.62×51mm', dmg: 60, perRound: true }
    ], note: '기본형은 무장 없음' },
    { id: 'mh6', name: 'MH-6', kind: '경헬기', hp: 400, seats: 6, speed: 350, weapons: [
      { name: 'M134D 미니건 ×2 (AH-6M)', ammo: '7.62×51mm', dmg: 60, perRound: true },
      { name: '로켓 포드 (AH-6R)', ammo: '122mm 로켓', dmg: 100, blast: '반경 6 m · 최대 2 m' }
    ], note: '무장형 AH-6M·AH-6R 변형 있음' }
  ],

  /* 수치 출처 */
  sources: [
    { name: 'metabot.gg · 사격장 실측 무기 데이터', url: 'https://metabot.gg/en/wardogs/weapons' },
    { name: 'metabot.gg · 5.56 탄종 실측', url: 'https://metabot.gg/en/wardogs/ammo/5-56x45mm' },
    { name: 'Wardogs Zone · 피해 계산기 (종류별 배율)', url: 'https://wardogs.zone/calculators/damage' },
    { name: 'Wardogs Zone · 방어구 단계별 보호', url: 'https://wardogs.zone/news/how-armor-works' },
    { name: 'Metaforge · 무기 데이터베이스', url: 'https://metaforge.app/wardogs/database/weapons/page/1' },
    { name: 'Metaforge · 방어구', url: 'https://metaforge.app/wardogs/database/armor/level-3-helmet' },
    { name: 'Metaforge · 설치 무기', url: 'https://metaforge.app/wardogs/database/mounted-weapons/page/1?sub=emplacements' },
    { name: 'Dexerto Wiki · WARDOGS', url: 'https://www.dexerto.com/wikis/wardogs/' },
    { name: 'WARDOGS Hub · 무기 목록', url: 'https://wardogshub.gg/weapons/' },
    { name: 'WARDOGS Hub UA · 설치 무기 12종', url: 'https://wardogshub.uk/en/database/emplaced-weapons/' },
    { name: 'wardogs.tools · 건축물 내구도', url: 'https://wardogs.tools/database/buildables' },
    { name: 'wardogs.tools · 차량', url: 'https://wardogs.tools/database/vehicles' },
    { name: 'WarDogs.fit · 폭발물 치트시트', url: 'https://www.wardogs.fit/guide/explosives-cheat-sheet' },
    { name: 'XGamingServer · 방어구 내구도', url: 'https://xgamingserver.com/blog/wardogs-armor-guide/' },
    { name: 'wardogtools.gg · 거리 감쇠', url: 'https://wardogtools.gg/methodology/weapons/' },
    { name: 'ExitLag · L81 박격포', url: 'https://www.exitlag.com/blog/wardogs-mortar/' }
  ]
};
