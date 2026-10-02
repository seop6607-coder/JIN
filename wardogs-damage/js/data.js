/*
 * 워독스 데미지 랩 · 데이터
 *
 * 수치는 2026년 시즌 1 기준 커뮤니티 측정치를 모은 것입니다. 게임 패치에 따라 달라질 수 있습니다.
 *   - dmg: 부위 배율을 곱하기 전의 1발 기본 피해 (근거리 기준)
 *   - null: 아직 측정 값을 확보하지 못한 항목 (화면에 "측정 대기"로 표시)
 *   - est: true 인 값은 같은 탄을 쓰는 다른 무기에서 추정한 값
 *
 * 계산식
 *   보호 부위   = 기본 피해 × 부위 배율 × 탄종 보정(방어구) × (1 − 방어구 감소율)
 *   비보호 부위 = 기본 피해 × 부위 배율 × 탄종 보정(맨몸)
 *   처치 탄수   = ceil(체력 100 ÷ 1발 피해)
 */
window.WD_DATA = {
  version: '2026.10 · 시즌 1',
  hp: 100,

  /* 피격 부위 12곳 */
  zones: [
    { id: 'head', name: '머리', mult: 2.35 },
    { id: 'neck', name: '목', mult: 1.76 },
    { id: 'upperTorso', name: '상부 몸통', mult: 1.1 },
    { id: 'torso', name: '몸통', mult: 1.0 },
    { id: 'lowerTorso', name: '하부 몸통', mult: 0.95 },
    { id: 'pelvis', name: '골반', mult: 0.9 },
    { id: 'shoulder', name: '어깨·상완', mult: 0.54 },
    { id: 'forearm', name: '전완', mult: 0.45 },
    { id: 'hand', name: '손', mult: 0.27 },
    { id: 'thigh', name: '허벅지', mult: 0.54 },
    { id: 'shin', name: '종아리', mult: 0.45 },
    { id: 'foot', name: '발', mult: 0.27 }
  ],

  /* 무기 종류별로 다른 머리 배율 (기본 2.35) */
  classHeadMult: { smg: 2.1 },

  /* 탄종: flesh = 맨몸 부위 보정, armored = 방어구 부위 보정 */
  ammo: [
    { id: 'fmj', code: 'FMJ', name: '일반탄', flesh: 1.0, armored: 1.0, desc: '맨몸과 방어구 모두에 고르게 들어갑니다.' },
    { id: 'hp', code: 'HP', name: '할로우 포인트', flesh: 2.0, armored: 0.7, desc: '맨몸 부위에 2배. 방어구에 막히면 30% 약해집니다.' },
    { id: 'ap', code: 'AP', name: '철갑탄', flesh: 0.8, armored: 1.3, desc: '방어구에 30% 더 들어가지만 맨몸에는 20% 약합니다.' }
  ],

  /* 몸통 방어구 */
  armor: [
    { lvl: 0, name: '갑옷 없음', short: '없음', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
    { lvl: 1, name: 'Level 1 방탄복', short: 'L1', price: 400, weight: 3.0, durability: 200, reduction: 0.3, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: null },
    { lvl: 2, name: 'Level 2 방탄복', short: 'L2', price: 1000, weight: 4.5, durability: 220, reduction: 0.4, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: null },
    { lvl: 3, name: 'Level 3 방탄복', short: 'L3', price: 2000, weight: 10.5, durability: 250, reduction: 0.55, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: null },
    { lvl: 4, name: 'Level 4 방탄복', short: 'L4', price: 4000, weight: 18.0, durability: 300, reduction: 0.65, covers: ['upperTorso', 'torso', 'lowerTorso', 'pelvis', 'shoulder'], unlock: 'WARDOG 레벨 100 · 해금비 $200,000', coverageEst: true }
  ],

  /* 헬멧 */
  helmets: [
    { lvl: 0, name: '헬멧 없음', short: '없음', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
    { lvl: 1, name: 'Level 1 헬멧', short: 'L1', price: 200, weight: null, durability: 80, reduction: 0.3, covers: ['head'], unlock: null },
    { lvl: 2, name: 'Level 2 헬멧', short: 'L2', price: 500, weight: 1.6, durability: 100, reduction: 0.4, covers: ['head'], unlock: null },
    { lvl: 3, name: 'Level 3 헬멧', short: 'L3', price: 1500, weight: 3.0, durability: 180, reduction: 0.55, covers: ['head'], unlock: null },
    { lvl: 4, name: 'Level 4 헬멧', short: 'L4', price: 3000, weight: 4.5, durability: null, reduction: 0.65, covers: ['head', 'neck'], unlock: '커리어 레벨 100 · 해금비 $150,000' }
  ],

  /* 무기 분류 (total = 게임 내 전체 수) */
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

  /* 무기 */
  weapons: [
    { id: 'm4', cls: 'ar', name: 'M4', caliber: '5.56×45mm', dmg: 28, rpm: 786, fire: '자동', price: null },
    { id: 'ak74', cls: 'ar', name: 'AK74', caliber: '5.45×39mm', dmg: 26, rpm: 640, fire: '자동', price: null },
    { id: 'fal', cls: 'ar', name: 'FAL', caliber: '7.62×51mm', dmg: 60, rpm: 650, fire: '자동', price: 6500, range: 800, unlock: '돌격 레벨 35' },
    { id: 't21', cls: 'ar', name: 'T-21', caliber: null, dmg: null, rpm: null, fire: '자동', price: null },
    { id: 'galil', cls: 'ar', name: 'Galil', caliber: null, dmg: null, rpm: null, fire: '자동', price: null },
    { id: 'a91', cls: 'ar', name: 'A-91', caliber: null, dmg: null, rpm: null, fire: '자동', price: null },

    { id: 'amp9', cls: 'smg', name: 'AMP-9', caliber: '9×19mm', dmg: 22, rpm: 900, fire: '자동', price: 900 },
    { id: 'pp19', cls: 'smg', name: 'PP-19 Vityaz', caliber: '9×19mm', dmg: 22, est: true, rpm: 800, fire: '자동', price: 1200, range: 200 },
    { id: 'mp5', cls: 'smg', name: 'MP5', caliber: '9×19mm', dmg: 22, rpm: 800, fire: '자동', price: 1500 },
    { id: 'super45', cls: 'smg', name: 'Super-45', caliber: '.45 ACP', dmg: 30, rpm: 1200, fire: '자동', price: null },

    { id: 'pkm', cls: 'lmg', name: 'PKM', caliber: '7.62×54mmR', dmg: 55, rpm: 600, fire: '자동', price: 4500, range: 1000 },
    { id: 'm249', cls: 'lmg', name: 'M249 SAW', caliber: '5.56×45mm', dmg: 28, est: true, rpm: 850, fire: '자동', price: 3200 },

    { id: 'svd', cls: 'dmr', name: 'SVD', caliber: '7.62×54mmR', dmg: 71.5, rpm: 341, fire: '반자동', price: null },
    { id: 'sks', cls: 'dmr', name: 'SKS', caliber: '7.62×39mm', dmg: 42, rpm: null, fire: '반자동', price: null },

    { id: 'scout', cls: 'sniper', name: 'Scout Rifle TD', caliber: '5.56×45mm', dmg: 28, rpm: null, fire: '중절식', price: 1100 },
    { id: 'mosin', cls: 'sniper', name: 'Mosin Nagant', caliber: '7.62×54mmR', dmg: 55, rpm: null, fire: '볼트액션', price: 4500 },
    { id: 'sv98', cls: 'sniper', name: 'SV98', caliber: '7.62×54mmR', dmg: 55, rpm: null, fire: '볼트액션', price: 5200 },
    { id: 'mk22', cls: 'sniper', name: 'MK22', caliber: '.308 Win', dmg: null, rpm: null, fire: '볼트액션', price: 6400, range: 1000 },
    { id: 'amr50', cls: 'sniper', name: 'AMR 50', caliber: '.50 BMG', dmg: 107, rpm: null, fire: '볼트액션', price: null },

    { id: 'mp43', cls: 'shotgun', name: 'MP43', caliber: '12 Gauge', dmg: null, rpm: 900, fire: '중절식', price: 400, note: '산탄 펠릿 데이터 측정 대기' },
    { id: 'm500', cls: 'shotgun', name: 'M500', caliber: '12 Gauge', dmg: null, rpm: 120, fire: '반자동', price: 1200, note: '산탄 펠릿 데이터 측정 대기' },

    { id: 'deagle', cls: 'pistol', name: 'Deagle', caliber: '.50 AE', dmg: 73, rpm: null, fire: '반자동', price: null },
    { id: 'judge', cls: 'pistol', name: 'Judge', caliber: '.45 Colt', dmg: 52, rpm: 200, fire: '리볼버', price: null },
    { id: 'm1911', cls: 'pistol', name: 'M1911', caliber: '.45 ACP', dmg: 45, rpm: null, fire: '반자동', price: null },
    { id: 'ggx18', cls: 'pistol', name: 'GGX 18', caliber: '9×19mm', dmg: 25, rpm: null, fire: '자동', price: null },

    { id: 'rpg7', cls: 'launcher', name: 'RPG-7', caliber: 'PG-7 로켓', dmg: 110, rpm: null, fire: '단발', price: null, range: 300, explosive: true, note: '폭발 반경 12 m · 최대 피해 2.5 m' },
    { id: 'maaws', cls: 'launcher', name: 'MAAWS', caliber: '84mm 대전차탄', dmg: null, rpm: null, fire: '단발', price: null, explosive: true },
    { id: 'mgl40', cls: 'launcher', name: 'MGL-40', caliber: '40mm 유탄 6연발', dmg: null, rpm: null, fire: '리볼버', price: null, explosive: true },
    { id: 'verba', cls: 'launcher', name: '9K333 Verba', caliber: '대공 유도미사일', dmg: null, rpm: null, fire: '락온', price: null, explosive: true, note: '항공기 전용 락온' },

    { id: 'bow', cls: 'bow', name: '활', caliber: '화살', dmg: null, rpm: null, fire: '수동', price: null }
  ],

  /* 폭발물 (보병 기준 피해, 반경은 m) */
  explosives: [
    { id: 'c4', name: 'C4', kind: '원격 기폭 폭약', dmg: 250, radius: 6, full: 2.5, price: 250, trigger: '리모트 기폭기 필요', note: '소형 HESCO 벽 2개, FOB 전체 5개' },
    { id: 'rpg7', name: 'RPG-7 로켓', kind: '대전차 로켓', dmg: 110, radius: 12, full: 2.5, price: null, trigger: '최소 기폭 거리 있음', note: '경장갑 차량과 보병에 효과적' },
    { id: 'l81', name: 'L81 박격포탄', kind: '81mm 고폭탄', dmg: 120, radius: 10, full: null, price: null, trigger: '건축물 장비에서 발사', note: '차량·건축물은 약 2발에 파괴' },
    { id: 'claymore', name: '클레이모어', kind: '지향성 지뢰', dmg: null, radius: null, full: null, price: 900, trigger: '동작 감지 (보병·차량)', note: '정찰 레벨 22 · 해금비 $50,000' },
    { id: 'atmine', name: '대전차 지뢰', kind: '압력 지뢰', dmg: null, radius: null, full: null, price: null, trigger: '차량 압력', note: '차량은 1회 파괴. 전차는 후진으로 밟았을 때만 화재' },
    { id: 'ied', name: 'IED', kind: '급조 폭발물', dmg: null, radius: null, full: null, price: null, trigger: '원격 기폭', note: '전차 후면 1회 → 기동 불능' }
  ],

  /* 건축물 장비 (FOB에 짓는 무기) */
  structures: [
    {
      id: 'l81', name: 'L81 박격포', role: '간접 사격', dmg: 120, hp: null,
      stats: [['피해', '120'], ['폭발 반경', '10 m'], ['사거리', '50–700 m'], ['재장전', '6.5초']],
      note: '보병, 차량, 건축물 모두 타격합니다. 차량과 건축물은 대개 2발이면 무너집니다.'
    },
    {
      id: 'talon', name: 'Talon 9K-SAM', role: '열추적 대공 미사일', dmg: 100, hp: 3000,
      stats: [['피해', '100'], ['내구도', '3,000'], ['유도', '열추적'], ['표적', '헬기']],
      note: '재장전식 대공 미사일 기지. 헬기를 자동으로 추적합니다.'
    },
    {
      id: 'ciws', name: 'Vanguard CIWS', role: '수동 근접 방공', dmg: 263, hp: 5000,
      stats: [['피해', '263'], ['내구도', '5,000'], ['조작', '수동'], ['탄약', '보급품 소모']],
      note: '사람이 직접 조작하는 근접 방공 기관포. 탄약 보급품을 소모합니다.'
    }
  ],

  /* 건축물을 부수는 데 필요한 양 */
  demolition: [
    { target: '소형 HESCO 벽', how: 'C4', count: '2개' },
    { target: 'FOB 전체', how: 'C4', count: '5개' },
    { target: '차량·건축물 일반', how: 'L81 박격포탄', count: '약 2발' }
  ],

  /* 차량 탑재 무기 */
  vehicles: [
    { id: 'l2a6', name: 'L2A6', kind: '전차', seats: 3, weapons: ['L55A1 주포', 'MG3A1 공축기관총', 'M249 기관총'] },
    { id: 'sph2', name: 'SPH2', kind: '자주포', seats: 3, weapons: ['L52 주포', 'M249 기관총'], note: '구역 밖에서 건축물을 부수는 용도' },
    { id: 'havoc', name: 'Havoc', kind: '공격 헬기', seats: 2, weapons: ['2A42 기관포', 'B-13 로켓 포드'] },
    { id: 'm113', name: 'M113', kind: '병력 수송 장갑차', seats: null, weapons: [], note: '한 팀이 20점에 도달하면 기지에 등장' }
  ],

  /* 수치 출처 */
  sources: [
    { name: 'Wardogs Zone · Armor, Ammo & TTK', url: 'https://wardogs.zone/wiki/armor-and-damage' },
    { name: 'WARDOGS LAB · Damage, armour and ammo', url: 'https://wardogslab.com/en/guides/wardogs-damage-armor' },
    { name: 'GameWatcher · Gear', url: 'https://www.gamewatcher.com/wardogs/gear' },
    { name: 'GameWatcher · Weapons', url: 'https://www.gamewatcher.com/wardogs/weapons' },
    { name: 'XGamingServer · Armor Guide', url: 'https://xgamingserver.com/blog/wardogs-armor-guide/' },
    { name: 'All Things How · Ammo Types', url: 'https://allthings.how/wardogs-ammo-types-what-fmj-hollow-point-and-armor-piercing-do-to-armor/' },
    { name: 'games.gg · Ammo Types', url: 'https://games.gg/wardogs/guides/wardogs-ammo-types-explained/' },
    { name: 'getwardogshq · Armor & Penetration', url: 'https://getwardogshq.com/guides/armor-and-penetration' },
    { name: 'Metaforge · Talon 9K-SAM', url: 'https://metaforge.app/wardogs/database/mounted-weapons/talon-9k-sam-2' },
    { name: 'Metaforge · Vanguard CIWS', url: 'https://metaforge.app/wardogs/database/mounted-weapons/vanguard-ciws-2' },
    { name: 'ExitLag · L81 Mortar', url: 'https://www.exitlag.com/blog/wardogs-mortar/' },
    { name: 'WarDogs.fit · Explosives Cheat Sheet', url: 'https://www.wardogs.fit/guide/explosives-cheat-sheet' },
    { name: 'Dexerto · Vehicles', url: 'https://www.dexerto.com/wikis/wardogs/vehicles/' }
  ]
};
