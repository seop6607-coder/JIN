/*
 * 워독스 데미지 랩 · 데이터
 *
 * 2026년 시즌 1 기준. 해외 커뮤니티 데이터베이스와 사격장 실측 자료를 교차 확인해 정리했습니다.
 *   - dmg: 탄 1발(산탄은 펠릿 1개)의 기본 피해. 부위 배율을 곱하기 전 값
 *   - rpm: 게임 표기 연사 속도 / rpmM: 사격장 실측 연사 속도 (처치 시간 계산에 우선 사용)
 *   - range: 피해가 줄지 않는 거리(유효 사거리, m)
 *   - measured: 사격장 실측 1발 피해 (일반탄, 맨몸, 약 20 m). 계산 모델 검증에 사용
 *   - fire: 사격 방식 키 (번역은 js/i18n.js의 fire.*)
 *   - kg: 무기 무게 (게임 데이터베이스)
 *   - null: 아직 공개된 값이 없는 항목 (화면에 "미공개"로 표시)
 *
 * 화면에 보이는 글은 T(한국어, 영어, 일본어, 중국어 간체, 중국어 번체) 순서로 적습니다.
 *
 * 계산식
 *   부위 배율   = 무기 종류별 배율[부위 그룹] × 부위 비율
 *   보호 부위   = 기본 피해 × 펠릿 수 × 부위 배율 × 탄종 보정(방어구) × (1 − 방어구 감소율)
 *   비보호 부위 = 기본 피해 × 펠릿 수 × 부위 배율 × 탄종 보정(맨몸)
 *   처치 탄수   = ceil(체력 100 ÷ 1발 피해)
 */
(function () {
  var T = function (ko, en, ja, hans, hant) {
    return { ko: ko, en: en, ja: ja, 'zh-Hans': hans, 'zh-Hant': hant };
  };

  var ROCKET_122 = T('122mm 로켓', '122mm rocket', '122mmロケット', '122mm 火箭弹', '122mm 火箭彈');
  var MIN_ARMING = T('최소 기폭 거리 있음', 'Has a minimum arming distance', '最低起爆距離あり', '有最小引爆距离', '有最小引爆距離');
  var AT_84 = T('84mm 대전차탄', '84mm anti-tank round', '84mm対戦車弾', '84mm 反坦克弹', '84mm 反坦克彈');
  var TANK_FRONT_2 = T('전차 전면 2발', '2 hits on a tank\'s front', '戦車正面に2発', '坦克正面 2 发', '坦克正面 2 發');
  var BUCKSHOT = T('12g 7mm 벅샷', '12g 7mm buckshot', '12g 7mmバックショット', '12g 7mm 鹿弹', '12g 7mm 鹿彈');
  var SHOTGUN_NOTE = T(
    '전탄 명중 기준. 슬러그탄 105 (WARDOG Lv41)',
    'All pellets hitting. Slug: 105 (WARDOG Lv41)',
    '全弾命中時。スラッグ弾は105（WARDOG Lv41）',
    '以全部弹丸命中计。独头弹 105（WARDOG Lv41）',
    '以全部彈丸命中計。獨頭彈 105（WARDOG Lv41）'
  );
  var L81 = T('L81 박격포', 'L81 Mortar', 'L81迫撃砲', 'L81 迫击炮', 'L81 迫擊砲');

  window.WD_DATA = {
    version: T('2026.10 · 시즌 1', '2026.10 · Season 1', '2026.10 · シーズン1', '2026.10 · 第 1 赛季', '2026.10 · 第 1 賽季'),
    hp: 100,

    /*
     * 피격 부위 12곳.
     * group = 무기 종류별 배율표에서 가져올 항목, k = 그 항목에 곱하는 부위 비율
     */
    zones: [
      { id: 'head', group: 'head', k: 1, name: T('머리', 'Head', '頭', '头部', '頭部') },
      { id: 'neck', group: 'head', k: 0.75, name: T('목', 'Neck', '首', '颈部', '頸部') },
      { id: 'upperTorso', group: 'chest', k: 1, name: T('상부 몸통', 'Upper torso', '上部胴体', '上躯干', '上軀幹') },
      { id: 'torso', group: 'torso', k: 1, name: T('몸통', 'Torso', '胴体', '躯干', '軀幹') },
      { id: 'lowerTorso', group: 'torso', k: 0.95, name: T('하부 몸통', 'Lower torso', '下部胴体', '下躯干', '下軀幹') },
      { id: 'pelvis', group: 'pelvis', k: 0.9, name: T('골반', 'Pelvis', '骨盤', '骨盆', '骨盆') },
      { id: 'shoulder', group: 'limbs', k: 0.6, name: T('상완', 'Upper arm', '上腕', '上臂', '上臂') },
      { id: 'forearm', group: 'limbs', k: 0.5, name: T('전완', 'Forearm', '前腕', '前臂', '前臂') },
      { id: 'hand', group: 'limbs', k: 0.3, name: T('손', 'Hand', '手', '手', '手') },
      { id: 'thigh', group: 'limbs', k: 0.6, name: T('허벅지', 'Thigh', '太もも', '大腿', '大腿') },
      { id: 'shin', group: 'limbs', k: 0.5, name: T('종아리', 'Calf', 'ふくらはぎ', '小腿', '小腿') },
      { id: 'foot', group: 'limbs', k: 0.3, name: T('발', 'Foot', '足', '脚', '腳') }
    ],

    zoneGroups: [
      { id: 'head', name: T('머리', 'Head', '頭', '头部', '頭部') },
      { id: 'chest', name: T('가슴', 'Chest', '胸', '胸部', '胸部') },
      { id: 'torso', name: T('몸통', 'Torso', '胴体', '躯干', '軀幹') },
      { id: 'pelvis', name: T('골반', 'Pelvis', '骨盤', '骨盆', '骨盆') },
      { id: 'limbs', name: T('팔다리', 'Limbs', '四肢', '四肢', '四肢') }
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
      {
        id: 'fmj', code: 'FMJ', flesh: 1.0, armored: 1.0,
        name: T('일반탄', 'Standard', '通常弾', '普通弹', '普通彈'),
        desc: T('기본 지급. 맨몸과 방어구에 고르게 들어갑니다.', 'Default issue. Even damage to flesh and armor.', '標準支給。生身にも防具にも均等に効きます。', '默认配发。对无护甲与护甲部位伤害均衡。', '預設配發。對無護甲與護甲部位傷害均衡。')
      },
      {
        id: 'hp', code: 'HP', flesh: 2.0, armored: 0.7, unlock: 'WARDOG Lv10 (5.56)',
        name: T('할로우 포인트', 'Hollow point', 'ホローポイント', '空尖弹', '空尖彈'),
        desc: T('맨몸 2배. 방어구에 맞으면 30% 약해집니다.', 'Double damage to flesh, 30% less against armor.', '生身に2倍。防具に当たると30%低下します。', '无护甲部位 2 倍伤害，命中护甲时降低 30%。', '無護甲部位 2 倍傷害，命中護甲時降低 30%。')
      },
      {
        id: 'ap', code: 'AP', flesh: 0.8, armored: 1.3, unlock: 'WARDOG Lv83 (5.56)',
        name: T('철갑탄', 'Armor-piercing', '徹甲弾', '穿甲弹', '穿甲彈'),
        desc: T('방어구에 30% 더 들어가고 맨몸엔 20% 약합니다.', '30% more against armor, 20% less to flesh.', '防具に30%増し、生身には20%低下します。', '对护甲多 30% 伤害，对无护甲部位少 20%。', '對護甲多 30% 傷害，對無護甲部位少 20%。')
      }
    ],

    /* 몸통 방어구 (이름은 i18n의 armorName·noArmor로 만듭니다) */
    armor: [
      { lvl: 0, short: '', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
      { lvl: 1, short: 'L1', price: 400, weight: 3.0, durability: 200, reduction: 0.3, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv3 · $10,000' },
      { lvl: 2, short: 'L2', price: 1000, weight: 4.5, durability: 220, reduction: 0.4, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv30 · $50,000' },
      { lvl: 3, short: 'L3', price: 2000, weight: 10.5, durability: 250, reduction: 0.55, covers: ['upperTorso', 'torso', 'lowerTorso'], unlock: 'WARDOG Lv60 · $100,000' },
      { lvl: 4, short: 'L4', price: 4000, weight: 18.0, durability: 300, reduction: 0.65, covers: ['upperTorso', 'torso', 'lowerTorso', 'pelvis', 'shoulder'], unlock: 'WARDOG Lv100 · $200,000' }
    ],

    /* 헬멧 (이름은 i18n의 helmetName·noHelmet로 만듭니다) */
    helmets: [
      { lvl: 0, short: '', price: 0, weight: 0, durability: null, reduction: 0, covers: [] },
      { lvl: 1, short: 'L1', price: 200, weight: 1.0, durability: 80, reduction: 0.3, covers: ['head'], unlock: 'WARDOG Lv3' },
      { lvl: 2, short: 'L2', price: 500, weight: 1.6, durability: 100, reduction: 0.4, covers: ['head'], unlock: 'WARDOG Lv30' },
      { lvl: 3, short: 'L3', price: 1500, weight: 3.0, durability: 180, reduction: 0.55, covers: ['head', 'neck'], unlock: 'WARDOG Lv60 · $75,000' },
      { lvl: 4, short: 'L4', price: 3000, weight: 4.5, durability: 200, reduction: 0.65, covers: ['head', 'neck'], unlock: 'WARDOG Lv100 · $150,000' }
    ],

    /* 무기 분류 */
    classes: [
      { id: 'ar', total: 8, name: T('돌격소총', 'Assault rifles', 'アサルトライフル', '突击步枪', '突擊步槍') },
      { id: 'smg', total: 4, name: T('기관단총', 'SMGs', 'サブマシンガン', '冲锋枪', '衝鋒槍') },
      { id: 'lmg', total: 2, name: T('경기관총', 'LMGs', '軽機関銃', '轻机枪', '輕機槍') },
      { id: 'dmr', total: 3, name: T('지정사수소총', 'Marksman rifles', 'マークスマンライフル', '精确射手步枪', '精確射手步槍') },
      { id: 'sniper', total: 5, name: T('저격소총', 'Sniper rifles', 'スナイパーライフル', '狙击步枪', '狙擊步槍') },
      { id: 'shotgun', total: 2, name: T('산탄총', 'Shotguns', 'ショットガン', '霰弹枪', '霰彈槍') },
      { id: 'pistol', total: 5, name: T('권총', 'Pistols', 'ハンドガン', '手枪', '手槍') },
      { id: 'launcher', total: 4, name: T('발사기', 'Launchers', 'ランチャー', '发射器', '發射器') },
      { id: 'bow', total: 1, name: T('활', 'Bows', '弓', '弓', '弓') }
    ],

    /* 무기 34종 */
    weapons: [
      { id: 'a91', kg: 3.17, cls: 'ar', name: 'A-91', caliber: '5.56×45mm', dmg: 28, rpm: 700, fire: 'semiBurst', price: 0, range: null, vel: 715,
        note: T('진영 신병 소총. 부착물 장착 불가', 'Faction recruit rifle. No attachments.', '陣営の新兵用ライフル。アタッチメント装着不可', '阵营新兵步枪。无法安装配件', '陣營新兵步槍。無法安裝配件') },
      { id: 'kh2002', kg: 3.17, cls: 'ar', name: 'KH-2002', caliber: '5.56×45mm', dmg: 28, rpm: 700, fire: 'semiBurst', price: 0, range: 300, vel: 715,
        note: T('Manticore 신병 소총. 부착물 장착 불가', 'Manticore recruit rifle. No attachments.', 'Manticoreの新兵用ライフル。アタッチメント装着不可', 'Manticore 新兵步枪。无法安装配件', 'Manticore 新兵步槍。無法安裝配件') },
      { id: 'm17s', kg: 3.17, cls: 'ar', name: 'Bushmaster M17S', caliber: '5.56×45mm', dmg: 28, rpm: 700, rpmM: 578, fire: 'semiBurst', price: 0, range: 300, vel: 715, measured: { upperTorso: 30.81, head: 65.81 } },
      { id: 't21', kg: 3.27, cls: 'ar', name: 'T-21', caliber: '5.56×45mm', dmg: 28, rpm: 750, fire: 'auto', price: 600, range: 550, vel: 910 },
      { id: 'galil', kg: 3.95, cls: 'ar', name: 'Galil', caliber: '5.56×45mm', dmg: 28, rpm: 650, fire: 'auto', price: 2200, range: 400, vel: 950 },
      { id: 'ak74', kg: 3.0, cls: 'ar', name: 'AK74', caliber: '5.45×39mm', dmg: 26, rpm: 650, fire: 'auto', price: 1600, range: 500, vel: 880, measured: { neck: 45.8 } },
      { id: 'm4', kg: 2.92, cls: 'ar', name: 'M4', caliber: '5.56×45mm', dmg: 28, rpm: 800, rpmM: 786, fire: 'auto', price: 2800, range: 500, vel: 910, unlock: 'Assault Lv20 · $100,000', measured: { upperTorso: 30.8, head: 65.8 } },
      { id: 'fal', kg: 4.25, cls: 'ar', name: 'FAL', caliber: '7.62×51mm', dmg: 60, rpm: 650, fire: 'auto', price: 6500, range: 800, vel: 840, unlock: 'Assault Lv35 · $200,000', measured: { upperTorso: 66 } },

      { id: 'amp9', kg: 1.4, cls: 'smg', name: 'AMP-9', caliber: '9×19mm', dmg: 22, rpm: 900, rpmM: 868, fire: 'auto', price: 900, range: null, measured: { upperTorso: 25.4, head: 46.2 } },
      { id: 'pp19', kg: 2.9, cls: 'smg', name: 'PP-19 Vityaz', caliber: '9×19mm', dmg: 22, rpm: 800, rpmM: 770, fire: 'auto', price: 1200, range: 200, measured: { upperTorso: 25.43, head: 46.21 } },
      { id: 'mp5', kg: 2.54, cls: 'smg', name: 'MP5', caliber: '9×19mm', dmg: 22, rpm: 800, rpmM: 786, fire: 'auto', price: 1500, range: null, measured: { upperTorso: 25.43, head: 46.21 } },
      { id: 'super45', kg: 3.0, cls: 'smg', name: 'Super-45', caliber: '.45 ACP', dmg: 30, rpm: 1200, rpmM: 1137, fire: 'auto', price: 2600, range: null, unlock: 'Medic Lv35', measured: { upperTorso: 34.7, head: 63 } },

      { id: 'm249', kg: 7.5, cls: 'lmg', name: 'M249 SAW', caliber: '5.56×45mm', dmg: 28, rpm: 850, rpmM: 824, fire: 'auto', price: 3200, range: null, measured: { upperTorso: 32.36, head: 64.4 } },
      { id: 'pkm', kg: 7.5, cls: 'lmg', name: 'PKM', caliber: '7.62×54mmR', dmg: 55, rpm: null, rpmM: 865, fire: 'auto', price: 4500, range: 1000, unlock: 'Support Lv30', measured: { upperTorso: 63.54, head: 126.5 } },

      { id: 'sks', kg: 3.85, cls: 'dmr', name: 'SKS', caliber: '7.62×39mm', dmg: 42, rpm: null, rpmM: 360, fire: 'semi', price: 2400, range: null, measured: { upperTorso: 60.08 } },
      { id: 'svd', kg: 5.3, cls: 'dmr', name: 'SVD', caliber: '7.62×54mmR', dmg: 55, rpm: null, rpmM: 341, fire: 'semi', price: 4800, range: null, measured: { upperTorso: 78.7, head: 137.5 } },
      { id: 'bmr308', kg: 3.9, cls: 'dmr', name: 'BMR-308', caliber: '.308 Win', dmg: 60, rpm: null, rpmM: 381, fire: 'semi', price: 6000, range: null, measured: { upperTorso: 85.8, head: 150 } },

      { id: 'scout', kg: 2.95, cls: 'sniper', name: 'Scout Rifle TD', caliber: '5.56×45mm', dmg: 28, rpm: 46, fire: 'bolt', price: 1100, range: null, measured: { upperTorso: 55.4, head: 89.6 } },
      { id: 'mosin', kg: 4.1, cls: 'sniper', name: 'Mosin Nagant', caliber: '7.62×54mmR', dmg: 55, rpm: 46, fire: 'bolt', price: 4500, range: 500, vel: 865, measured: { upperTorso: 108.92, head: 176 } },
      { id: 'sv98', kg: 5.8, cls: 'sniper', name: 'SV98', caliber: '7.62×54mmR', dmg: 55, rpm: 46, fire: 'bolt', price: 5200, range: null, measured: { upperTorso: 108.9, head: 176 } },
      { id: 'mk22', kg: 6.3, cls: 'sniper', name: 'MK22', caliber: '.308 Win', dmg: 60, rpm: 46, fire: 'bolt', price: 6400, range: 1000, measured: { upperTorso: 118.8, head: 192 } },
      { id: 'amr50', kg: 12.5, cls: 'sniper', name: 'AMR 50', caliber: '.50 Cal', dmg: 107, rpm: 41.5, fire: 'bolt', price: 8800, range: null, unlock: 'Recon Lv35 · $200,000', measured: { upperTorso: 211.9, head: 342.4 } },

      { id: 'mp43', kg: 3.2, cls: 'shotgun', name: 'MP43', caliber: BUCKSHOT, dmg: 25, pellets: 8, rpm: 900, fire: 'break2', price: 400, range: null, vel: 391, ammo: false, note: SHOTGUN_NOTE, measured: { upperTorso: 198, head: 300 } },
      { id: 'm500', kg: 3.52, cls: 'shotgun', name: 'M500', caliber: BUCKSHOT, dmg: 25, pellets: 8, rpm: 120, fire: 'pump6', price: 1200, range: 70, vel: 480, ammo: false, note: SHOTGUN_NOTE, measured: { upperTorso: 198, head: 300 } },

      { id: 'ggx17', kg: 0.63, cls: 'pistol', name: 'GGX 17', caliber: '9×19mm', dmg: 22, rpm: null, rpmM: 482, fire: 'semi', price: 200, range: null, unlock: 'WARDOG Lv1', measured: { upperTorso: 25.4, head: 46.2 } },
      { id: 'ggx18', kg: 0.63, cls: 'pistol', name: 'GGX 18', caliber: '9×19mm', dmg: 22, rpm: null, rpmM: 1150, fire: 'auto', price: 800, range: null, unlock: 'WARDOG Lv70', measured: { upperTorso: 25.4, head: 46.2 } },
      { id: 'm1911', kg: 1.1, cls: 'pistol', name: 'M1911', caliber: '.45 ACP', dmg: 30, rpm: 430, fire: 'semi', price: 300, range: 50, vel: 253 },
      { id: 'judge', kg: 0.82, cls: 'pistol', name: 'Judge', caliber: '.45 Colt', dmg: 45, rpm: 200, fire: 'revolver', price: 250, range: 50, vel: 335, measured: { upperTorso: 51.99, head: 94.5 } },
      { id: 'deagle', kg: 2.0, cls: 'pistol', name: 'Deagle', caliber: '.50 AE', dmg: 63, rpm: 267, rpmM: 240, fire: 'semi', price: 900, range: null, unlock: 'WARDOG Lv85 · $75,000', measured: { upperTorso: 72.78, head: 132.32 } },

      { id: 'rpg7', kg: 6.3, cls: 'launcher', name: 'RPG-7', dmg: 110, rpm: null, fire: 'single', price: 2000, range: 300, explosive: true, blast: { radius: 12, full: 2.5 }, unlock: 'Support Lv5 · $30,000',
        caliber: T('PG-7 로켓', 'PG-7 rocket', 'PG-7ロケット', 'PG-7 火箭弹', 'PG-7 火箭彈') },
      { id: 'maaws', kg: 7.0, cls: 'launcher', name: 'MAAWS', dmg: 100, rpm: null, fire: 'single', price: 2600, range: null, explosive: true, blast: { radius: 10, full: 4 }, unlock: 'Support Lv20 · $125,000',
        caliber: AT_84, note: TANK_FRONT_2 },
      { id: 'mgl40', kg: 5.3, cls: 'launcher', name: 'MGL-40', dmg: 100, rpm: 75, fire: 'semi', price: 6000, range: 400, explosive: true, blast: { radius: null }, unlock: 'Support Lv35 · $200,000',
        caliber: T('40mm 유탄 6연발', '40mm grenades, 6 rounds', '40mmグレネード 6連発', '40mm 榴弹 6 连发', '40mm 榴彈 6 連發') },
      { id: 'verba', kg: 17.25, cls: 'launcher', name: '9K333 Verba', dmg: 200, rpm: null, fire: 'lockon', price: 800, range: 1000, explosive: true, unlock: 'Support Lv16 · $50,000',
        caliber: T('적외선 유도 대공 미사일', 'IR-guided anti-air missile', '赤外線誘導対空ミサイル', '红外制导防空导弹', '紅外線導引防空飛彈'),
        note: T('항공기에만 락온', 'Locks on to aircraft only', '航空機にのみロックオン', '仅可锁定飞行器', '僅可鎖定飛行器') },

      { id: 'bow', kg: 1.3, cls: 'bow', name: 'Compound Bow', dmg: 77, rpm: 90, fire: 'manual', price: 800, range: null, ammo: false, unlock: 'Recon Lv17 · $125,000', measured: { upperTorso: 160.9, head: 177.1 },
        caliber: T('브로드헤드 화살', 'Broadhead arrow', 'ブロードヘッドアロー', '宽头箭', '寬頭箭'),
        note: T('소음 없는 암살용', 'Built for silent takedowns', '無音の暗殺向け', '适合无声暗杀', '適合無聲暗殺') }
    ],

    /*
     * 폭발 피해 (보병 기준).
     * radius = 폭발 반경, full = 최대 피해가 유지되는 반경, edge = 반경 끝에서의 피해 (없으면 0)
     */
    explosives: [
      { id: 'c4', name: 'C4', dmg: 250, radius: 6, full: 2.5, edge: 20, price: 250, unlock: 'Support Lv2',
        kind: T('원격 기폭 폭약', 'Remote charge', '遠隔起爆爆薬', '遥控炸药', '遙控炸藥'),
        trigger: T('리모트 기폭기 $550 필요', 'Needs a $550 remote detonator', '遠隔起爆装置（$550）が必要', '需要遥控引爆器（$550）', '需要遙控引爆器（$550）'),
        note: T('소형 HESCO 2개, FOB 5개', '2 for a small HESCO, 5 for a FOB', '小型HESCOは2個、FOBは5個', '小型 HESCO 需 2 个，FOB 需 5 个', '小型 HESCO 需 2 個，FOB 需 5 個') },
      { id: 'ied', name: 'IED', dmg: 250, radius: 6, full: 2.5, price: 300,
        kind: T('급조 폭발물', 'Improvised explosive', '即席爆発装置', '简易爆炸装置', '簡易爆炸裝置'),
        trigger: T('원격 기폭', 'Remote detonation', '遠隔起爆', '遥控引爆', '遙控引爆'),
        note: T('FOB·드릴 리그를 1개로 파괴. 2 m 안의 험비 즉파', 'One destroys a FOB or drill rig. Kills a Humvee within 2 m', '1個でFOBやドリルリグを破壊。2 m以内のハンヴィーは即破壊', '1 个即可摧毁 FOB 或钻机。2 m 内的悍马直接摧毁', '1 個即可摧毀 FOB 或鑽機。2 m 內的悍馬直接摧毀') },
      { id: 'claymore', dmg: 150, radius: 3, full: 1.5, price: 900, unlock: 'Recon Lv22 · $50,000',
        name: T('클레이모어', 'Claymore', 'クレイモア', '阔剑地雷', '闊劍地雷'),
        kind: T('지향성 지뢰', 'Directional mine', '指向性地雷', '定向地雷', '定向地雷'),
        trigger: T('동작 감지 (보병·차량)', 'Motion sensor (infantry & vehicles)', 'モーション感知（歩兵・車両）', '动作感应（步兵·载具）', '動作感應（步兵·載具）'),
        note: T('문, 계단 길목 봉쇄용', 'Locks down doors and stairways', 'ドアや階段の封鎖用', '封锁门口与楼梯', '封鎖門口與樓梯') },
      { id: 'atmine', dmg: 300, radius: 7.5, full: null, price: 650,
        name: T('대전차 지뢰', 'AT mine', '対戦車地雷', '反坦克地雷', '反坦克地雷'),
        kind: T('압력 지뢰', 'Pressure mine', '感圧式地雷', '压发地雷', '壓發地雷'),
        trigger: T('차량 압력', 'Vehicle pressure', '車両の重量', '载具压力', '載具壓力'),
        note: T('차량 1회 파괴. 전차는 후진으로 밟았을 때만 화재', 'Destroys any vehicle in one hit. Tanks only burn if they reverse onto it', '車両は1回で破壊。戦車は後退で踏んだときのみ炎上', '一次摧毁载具。坦克仅在倒车压上时起火', '一次摧毀載具。坦克僅在倒車壓上時起火') },
      { id: 'rpg7', dmg: 110, radius: 12, full: 2.5, price: 2000, trigger: MIN_ARMING,
        name: T('RPG-7 로켓', 'RPG-7 rocket', 'RPG-7ロケット', 'RPG-7 火箭弹', 'RPG-7 火箭彈'),
        kind: T('대전차 로켓', 'Anti-tank rocket', '対戦車ロケット', '反坦克火箭', '反坦克火箭'),
        note: T('전차 전면에는 거의 안 들어감', 'Barely hurts a tank\'s front', '戦車正面にはほぼ効かない', '对坦克正面几乎无效', '對坦克正面幾乎無效') },
      { id: 'maaws', dmg: 100, radius: 10, full: 4, price: 2600, trigger: MIN_ARMING, kind: AT_84, note: TANK_FRONT_2,
        name: T('MAAWS 탄', 'MAAWS round', 'MAAWS弾', 'MAAWS 弹', 'MAAWS 彈') },
      { id: 'mgl40', dmg: 100, radius: null, full: null, price: 6000,
        name: T('MGL-40 유탄', 'MGL-40 grenade', 'MGL-40グレネード', 'MGL-40 榴弹', 'MGL-40 榴彈'),
        kind: T('40mm 고폭 유탄', '40mm HE grenade', '40mm榴弾', '40mm 高爆榴弹', '40mm 高爆榴彈'),
        trigger: T('충격 신관', 'Impact fuze', '着発信管', '触发引信', '觸發引信'),
        note: T('6연발 리볼버식', '6-round revolver launcher', '6連発リボルバー式', '6 发转轮式', '6 發轉輪式') },
      { id: 'm67', dmg: null, radius: null, full: null, price: 200,
        name: T('M67 세열수류탄', 'M67 frag grenade', 'M67破片手榴弾', 'M67 破片手榴弹', 'M67 破片手榴彈'),
        kind: T('투척 수류탄', 'Hand grenade', '手榴弾', '手榴弹', '手榴彈'),
        trigger: T('시한 신관', 'Timed fuze', '時限信管', '定时引信', '定時引信'),
        note: T('피해·반경 미공개. 무게 0.4 kg', 'Damage and radius not published. 0.4 kg', 'ダメージ・半径は非公開。重量0.4 kg', '伤害与半径未公开。重量 0.4 kg', '傷害與半徑未公開。重量 0.4 kg') }
    ],

    /*
     * 로드아웃 무게 계산기.
     * 무게 등급: 총무게가 from kg를 넘으면 해당 등급. 페널티는 % (커뮤니티 측정치), null = 미공개
     */
    loadout: {
      classes: [
        { from: 0, move: 0, stamina: 0, ads: 0, sway: 0, name: T('최경량', 'Lightest', '最軽量', '最轻', '最輕') },
        { from: 10, move: -5, stamina: -15, ads: 5, sway: 2, name: T('경량', 'Light', '軽量', '轻', '輕') },
        { from: 17, move: -13, stamina: -35, ads: 6, sway: 8, name: T('중간', 'Medium', '中量', '中等', '中等') },
        { from: 27, move: -20, stamina: null, ads: 15, sway: 18, noSprint: true, slowLean: true, noDrag: true, name: T('중량', 'Heavy', '重量', '重', '重') },
        { from: 40, move: -20, stamina: null, ads: 17, sway: 20, noSprint: true, slowLean: true, noDrag: true, name: T('초중량', 'Super heavy', '超重量', '超重', '超重') }
      ],
      backpacks: [
        { id: 'pouch', kg: 0.3, slots: 6, name: T('파우치', 'Pouch', 'ポーチ', '腰包', '腰包') },
        { id: 'scout', kg: 0.5, slots: 8, name: T('스카우트 백팩', 'Scout backpack', 'スカウトバックパック', '侦察背包', '偵察背包') },
        { id: 'field', kg: 0.8, slots: 12, name: T('필드 백팩', 'Field backpack', 'フィールドバックパック', '野战背包', '野戰背包') },
        { id: 'operator', kg: 0.88, slots: 15, name: T('오퍼레이터 백팩', 'Operator backpack', 'オペレーターバックパック', '特战背包', '特戰背包') },
        { id: 'assault', kg: 1.3, slots: 21, name: T('어설트 백팩', 'Assault backpack', 'アサルトバックパック', '突击背包', '突擊背包') },
        { id: 'ruck', kg: 1.5, slots: 24, name: T('럭 백팩', 'Ruck backpack', 'ラックバックパック', '大型行军背包', '大型行軍背包') },
        { id: 'gunner', kg: 1.5, slots: 24, name: T('거너 백팩 + 슬링', 'Gunner backpack + sling', 'ガンナーバックパック＋スリング', '机枪手背包 + 枪带', '機槍手背包 + 槍帶') },
        { id: 'arsenal', kg: 1.5, slots: 24, name: T('아스널 백팩 + 슬링 2개', 'Arsenal backpack + 2 slings', 'アーセナルバックパック＋スリング2本', '军械背包 + 2 条枪带', '軍械背包 + 2 條槍帶') }
      ],
      vests: [
        { id: 'small', kg: 0.82, name: T('소형 전술 조끼', 'Small tac vest', 'タクティカルベスト（小）', '小型战术背心', '小型戰術背心') },
        { id: 'medium', kg: 1.65, name: T('중형 전술 조끼', 'Medium tac vest', 'タクティカルベスト（中）', '中型战术背心', '中型戰術背心') },
        { id: 'large', kg: 3.6, name: T('대형 전술 조끼', 'Large tac vest', 'タクティカルベスト（大）', '大型战术背心', '大型戰術背心') }
      ],
      parachutes: [
        { id: 'basic', kg: 2.5, name: T('기본 낙하산', 'Basic parachute', 'ベーシックパラシュート', '基础降落伞', '基礎降落傘') },
        { id: 'sport', kg: 9, name: T('스포츠 낙하산', 'Sport parachute', 'スポーツパラシュート', '运动降落伞', '運動降落傘') }
      ],
      /* 무기별 탄창·탄약 (공개된 것만) */
      mags: {
        m4: [{ id: 'stanag30', kg: 0.53, name: 'STANAG 30 RND' }],
        ak74: [{ id: 'ak30', kg: 0.55, name: 'AK74 30 RND' }],
        galil: [{ id: 'galil50', kg: 1.16, name: 'Galil 50 RND' }],
        amp9: [{ id: 'amp30', kg: 0.48, name: 'AMP-9 30 RND' }],
        mp5: [{ id: 'mp530', kg: 0.51, name: 'MP5 30 RND' }],
        super45: [{ id: 's4530', kg: 0.89, name: 'Super-45 30 RND' }],
        m249: [{ id: 'm249box', kg: 3.14, name: 'M249 200 RND Box' }, { id: 'm249fab', kg: 1.62, name: 'M249 100 RND Fabric' }],
        pkm: [{ id: 'pkm100', kg: 3.9, name: 'PKM 100 RND Box' }],
        svd: [{ id: 'svd10', kg: 0.34, name: 'SVD 10 RND' }],
        deagle: [{ id: 'deagle7', kg: 0.43, name: 'Deagle 7 RND' }],
        rpg7: [{ id: 'r93', kg: 2.6, name: T('93mm 로켓', '93mm rocket', '93mmロケット', '93mm 火箭弹', '93mm 火箭彈') }],
        maaws: [{ id: 's84', kg: 3.5, name: AT_84 }]
      },
      medical: [
        { id: 'bandage', kg: 0.08, name: T('붕대', 'Bandage', '包帯', '绷带', '繃帶') },
        { id: 'ifak', kg: 0.16, name: T('개인 응급 키트 (IFAK)', 'IFAK', '個人救急キット（IFAK）', '单兵急救包（IFAK）', '單兵急救包（IFAK）') },
        { id: 'adrenaline', kg: 0.06, name: T('아드레날린 펜', 'Adrenaline pen', 'アドレナリンペン', '肾上腺素笔', '腎上腺素筆') },
        { id: 'fieldres', kg: 0.39, name: T('야전 소생기', 'Field resuscitator', 'フィールド蘇生器', '战地复苏器', '戰地復甦器') },
        { id: 'emres', kg: 0.39, name: T('응급 소생기', 'Emergency resuscitator', '緊急蘇生器', '紧急复苏器', '緊急復甦器') },
        { id: 'defib', kg: 2.6, name: T('제세동기', 'Defibrillator', '除細動器', '除颤器', '除顫器') },
        { id: 'medbag', kg: 3.45, name: T('의료 가방', 'Medical bag', 'メディカルバッグ', '医疗包', '醫療包') }
      ],
      throwables: [
        { id: 'm67', kg: 0.4, name: T('M67 세열수류탄', 'M67 frag grenade', 'M67破片手榴弾', 'M67 破片手榴弹', 'M67 破片手榴彈') },
        { id: 'm18', kg: 0.54, name: T('M18 연막·신호탄', 'M18 smoke / signal grenade', 'M18スモーク・信号弾', 'M18 烟雾·信号弹', 'M18 煙霧·信號彈') },
        { id: 'c4', kg: 0.57, name: 'C4' },
        { id: 'detonator', kg: 0.02, name: T('리모트 기폭기', 'Remote detonator', '遠隔起爆装置', '遥控引爆器', '遙控引爆器') },
        { id: 'ied', kg: 1.5, name: 'IED' },
        { id: 'claymore', kg: 1.6, name: T('클레이모어', 'Claymore', 'クレイモア', '阔剑地雷', '闊劍地雷') },
        { id: 'atmine', kg: 8.6, name: T('대전차 지뢰', 'AT mine', '対戦車地雷', '反坦克地雷', '反坦克地雷') }
      ],
      tools: [
        { id: 'hammerS', kg: 0.32, name: T('소형 망치', 'Small hammer', '小型ハンマー', '小锤', '小錘') },
        { id: 'hammerM', kg: 1.23, name: T('중형 망치', 'Medium hammer', '中型ハンマー', '中锤', '中錘') },
        { id: 'hammerL', kg: 3.18, name: T('대형 망치', 'Large hammer', '大型ハンマー', '大锤', '大錘') },
        { id: 'binoculars', kg: 0.3, name: T('쌍안경', 'Binoculars', '双眼鏡', '望远镜', '望遠鏡') },
        { id: 'rangefinder', kg: 0.23, name: T('거리 측정기', 'Range finder', 'レンジファインダー', '测距仪', '測距儀') }
      ]
    },

    /* 포탄·로켓 (폭발 거리 시뮬레이터용). L81의 full은 커뮤니티가 말하는 살상 반경 5 m를 썼습니다 */
    ordnance: [
      { id: 'l81', dmg: 120, radius: 10, full: 5, name: T('L81 박격포탄', 'L81 mortar shell', 'L81迫撃砲弾', 'L81 迫击炮弹', 'L81 迫擊砲彈') },
      { id: 'he155', dmg: 450, radius: 20, full: 7.5, name: T('155mm 곡사포탄', '155mm howitzer shell', '155mm榴弾砲弾', '155mm 榴弹炮弹', '155mm 榴彈砲彈') },
      { id: 'r122', dmg: 100, radius: 6, full: 2, edge: 10, name: ROCKET_122 },
      { id: 'he30', dmg: 100, radius: 3, full: 1, edge: 20, name: T('30mm 고폭탄', '30mm HE round', '30mm榴弾', '30mm 高爆弹', '30mm 高爆彈') }
    ],

    /*
     * 건축물 장비 (FOB에 짓는 무기 시설).
     * stats = [라벨 키(i18n의 stat.*), 값]
     */
    structures: [
      {
        id: 'l81', name: L81, dmg: 120, hp: 3000,
        role: T('81mm 간접 사격', '81mm indirect fire', '81mm間接射撃', '81mm 间瞄射击', '81mm 間瞄射擊'),
        stats: [
          ['blastRadius', '10 m'], ['killRadius', '5 m'], ['range', '50–700 m'],
          ['reload', T('6.5초', '6.5 s', '6.5秒', '6.5 秒', '6.5 秒')], ['durability', '3,000'],
          ['build', T('보급 150', '150 supplies', '補給 150', '补给 150', '補給 150')]
        ],
        note: T('포탄 1발에 탄약 보급 약 30을 씁니다. 차량과 건축물은 대개 2발이면 무너집니다.', 'Each shell uses about 30 ammo supplies. Vehicles and structures usually fall in 2 hits.', '砲弾1発で弾薬補給を約30消費します。車両や建築物はたいてい2発で倒れます。', '每发炮弹消耗约 30 弹药补给。载具与建筑通常 2 发即毁。', '每發砲彈消耗約 30 彈藥補給。載具與建築通常 2 發即毀。')
      },
      {
        id: 'talon', name: 'Talon 9K-SAM', dmg: 100, hp: 3000,
        role: T('열추적 대공 미사일', 'Heat-seeking SAM', '熱追尾対空ミサイル', '热追踪防空导弹', '熱追蹤防空飛彈'),
        stats: [
          ['guidance', T('적외선', 'Infrared', '赤外線', '红外', '紅外線')], ['target', T('헬기', 'Helicopters', 'ヘリ', '直升机', '直升機')],
          ['durability', '3,000'], ['build', T('보급 1,000', '1,000 supplies', '補給 1,000', '补给 1,000', '補給 1,000')]
        ],
        note: T('재장전식 대공 미사일 기지입니다.', 'A reloadable anti-air missile site.', '再装填式の対空ミサイル陣地です。', '可重新装填的防空导弹阵地。', '可重新裝填的防空飛彈陣地。')
      },
      {
        id: 'ciws', name: 'Vanguard CIWS', dmg: 18, hp: 5000,
        role: T('35mm 근접 방공포', '35mm close-in AA gun', '35mm近接防空砲', '35mm 近防炮', '35mm 近防砲'),
        stats: [
          ['gun', T('Oerlikon GDF 쌍열', 'Twin Oerlikon GDF', 'Oerlikon GDF 連装', 'Oerlikon GDF 双联', 'Oerlikon GDF 雙聯')], ['round', '35×228mm'],
          ['durability', '5,000'], ['build', T('보급 1,500', '1,500 supplies', '補給 1,500', '补给 1,500', '補給 1,500')]
        ],
        note: T('사람이 직접 조작합니다. 발당 피해는 낮고 연사로 몰아붙입니다. 탄약 보급품을 씁니다.', 'Crewed by a player. Low damage per round, high rate of fire. Uses ammo supplies.', 'プレイヤーが直接操作します。1発の威力は低く、連射で押し切ります。弾薬補給を消費します。', '由玩家亲自操作。单发伤害低，靠高射速压制。消耗弹药补给。', '由玩家親自操作。單發傷害低，靠高射速壓制。消耗彈藥補給。')
      },
      {
        id: 'stingray', name: 'Stingray', dmg: 120, hp: 3000,
        role: T('대전차 자폭 드론 발사대', 'Anti-armor drone launcher', '対装甲自爆ドローン発射台', '反装甲自杀无人机发射台', '反裝甲自殺無人機發射台'),
        stats: [
          ['round', T('자폭 UAV', 'Kamikaze UAV', '自爆UAV', '自杀式无人机', '自殺式無人機')], ['active', T('1대', '1 at a time', '1機', '1 架', '1 架')],
          ['durability', '3,000'], ['supply', T('기계 보급품', 'Mechanical supplies', '機械補給品', '机械补给', '機械補給')]
        ],
        note: T('Talon은 25발, CIWS는 42발에 파괴합니다.', 'Takes down a Talon in 25 hits and a CIWS in 42.', 'Talonは25発、CIWSは42発で破壊します。', '25 发摧毁 Talon，42 发摧毁 CIWS。', '25 發摧毀 Talon，42 發摧毀 CIWS。')
      }
    ],

    /* 건축물 내구도 */
    buildables: [
      { hp: 15000, name: 'FOB' },
      { hp: 6500, name: T('Bremer 방벽', 'Bremer wall', 'ブレマーウォール', '布雷默墙', '布雷默牆') },
      { hp: 5320, name: T('게이트', 'Gate', 'ゲート', '大门', '大門') },
      { hp: 5000, name: T('벙커', 'Bunker', 'バンカー', '掩体', '掩體') },
      { hp: 5000, name: T('정찰탑', 'Recon tower', '偵察塔', '侦察塔', '偵察塔') },
      { hp: 5000, name: T('간접사격 대피소', 'Indirect fire shelter', '間接射撃シェルター', '防炮掩体', '防砲掩體') },
      { hp: 5000, name: 'Vanguard CIWS' },
      { hp: 4600, name: T('HESCO 방벽', 'HESCO wall', 'HESCOウォール', 'HESCO 墙', 'HESCO 牆') },
      { hp: 4500, name: T('대전차 장애물', 'Hedgehog', '対戦車障害物', '反坦克拒马', '反坦克拒馬') },
      { hp: 3000, name: L81 },
      { hp: 3000, name: 'Talon 9K-SAM' },
      { hp: 2250, name: T('대형 HESCO 블록', 'Large HESCO block', '大型HESCOブロック', '大型 HESCO 块', '大型 HESCO 塊') },
      { hp: 2200, name: T('문', 'Door', 'ドア', '门', '門') },
      { hp: 1600, name: T('소형 HESCO 블록', 'Small HESCO block', '小型HESCOブロック', '小型 HESCO 块', '小型 HESCO 塊') },
      { hp: 1600, name: T('재급유소', 'Refuel station', '給油所', '加油站', '加油站') },
      { hp: 1600, name: T('수리소', 'Repair station', '修理所', '维修站', '維修站') },
      { hp: 1000, name: T('건설 무전기', 'Builder\'s radio', '建設用無線機', '建造电台', '建造電台') },
      { hp: 1000, name: T('확성기', 'Loudspeaker', '拡声器', '扩音器', '擴音器') },
      { hp: 735, name: T('모래주머니 벽', 'Sandbag wall', '土嚢壁', '沙袋墙', '沙袋牆') },
      { hp: 300, name: T('정찰 텐트', 'Recon tent', '偵察テント', '侦察帐篷', '偵察帳篷') },
      { hp: 250, name: T('철조망', 'Barbed wire', '有刺鉄線', '铁丝网', '鐵絲網') }
    ],

    /*
     * 폭발물이 차량 선체에 주는 1회 피해 (Metaforge 차량 데이터베이스, 선체 직격 기준).
     * 파괴 횟수는 화면에서 ceil(선체 내구도 ÷ 1회 피해)로 계산합니다. 값이 없는 칸은 자료 미공개.
     */
    vsVehicles: {
      tools: [
        { id: 'rpg7', name: 'RPG-7', ammo: '93mm' },
        { id: 'maaws', name: 'MAAWS', ammo: '84mm' },
        { id: 'c4', name: 'C4' },
        { id: 'ied', name: 'IED' },
        { id: 'atmine', name: T('대전차 지뢰', 'AT mine', '対戦車地雷', '反坦克地雷', '反坦克地雷') },
        { id: 'stingray', name: 'Stingray' },
        { id: 'verba', name: '9K333 Verba', ammo: '72mm' }
      ],
      rows: [
        { id: 'l2a6', name: 'L2A6', hp: 800, dmg: { rpg7: 152, maaws: 282, c4: 188, ied: 390, atmine: 735, stingray: 660 } },
        { id: 'gepard', name: 'Flakpanzer Gepard', hp: 800, dmg: { rpg7: 152, maaws: 282, c4: 188, ied: 390, atmine: 735 } },
        { id: 'sph2', name: 'SPH-2', hp: 650, dmg: { rpg7: 152, maaws: 282, c4: 188, atmine: 735 } },
        { id: 'm113', name: 'M113 APC SV', hp: 1000, dmg: { rpg7: 90, maaws: 380, c4: 288, ied: 750, atmine: 600, stingray: 720 } },
        { id: 'ural', name: 'Ural Defender', hp: 700, dmg: { rpg7: 335, maaws: 566, c4: 112, ied: 450, atmine: 1050 } },
        { id: 'humvee', name: 'Humvee', hp: 500, dmg: { rpg7: 144, maaws: 566, c4: 200, ied: 750, atmine: 900 } },
        { id: 'humvee249', name: 'Humvee [M249]', hp: 500, dmg: { rpg7: 120, maaws: 522, c4: 163, ied: 750, atmine: 900 } },
        { id: 'humveemg', name: 'Humvee [Minigun]', hp: 500, dmg: { rpg7: 108, maaws: 500, c4: 119, ied: 750, atmine: 900 } },
        { id: 'havoc', name: 'Havoc', hp: 800, dmg: { rpg7: 385, verba: 400 } },
        { id: 'mh6', name: 'MH-6', hp: 400, dmg: { rpg7: 509, verba: 1000 } }
      ]
    },

    /*
     * 건축물·설치 무기를 부수는 데 필요한 개수 (커뮤니티 폭발물 치트시트·FOB 공략 실험).
     * pct = 1회에 깎이는 내구도 비율(%), approx = 대략치 열
     */
    vsStructures: {
      tools: [
        { id: 'c4', name: 'C4' },
        { id: 'ied', name: 'IED' },
        { id: 'rpg7', name: 'RPG-7' },
        { id: 'maaws', name: 'MAAWS' },
        { id: 'stingray', name: 'Stingray' },
        { id: 'mgl40', name: 'MGL-40', approx: true },
        { id: 'm67', name: 'M67', approx: true }
      ],
      rows: [
        { n: { c4: 1, ied: 1, rpg7: 1, maaws: 1, mgl40: 3, m67: 3 }, name: T('문', 'Door', 'ドア', '门', '門') },
        { n: { c4: 1, ied: 1, rpg7: 1, maaws: 1, mgl40: 7, m67: 7 }, name: T('모래주머니 벽', 'Sandbag wall', '土嚢壁', '沙袋墙', '沙袋牆') },
        { n: { c4: 2, ied: 1, rpg7: 4, maaws: 4, mgl40: 12, m67: '6–7' }, name: T('소형 HESCO', 'Small HESCO', '小型HESCO', '小型 HESCO', '小型 HESCO') },
        { n: { c4: 4, ied: 2, rpg7: 7, maaws: 8, mgl40: 15, m67: 10 }, pct: { c4: 28, ied: 53 }, name: T('대형 HESCO', 'Large HESCO', '大型HESCO', '大型 HESCO', '大型 HESCO') },
        { n: { c4: 1, ied: 1, rpg7: 2, maaws: 4, mgl40: 25, m67: 25 }, name: T('게이트', 'Gate', 'ゲート', '大门', '大門') },
        { n: { c4: 7, ied: 5, rpg7: 12 }, pct: { c4: 15, ied: 21 }, name: T('Bremer 방벽', 'Bremer wall', 'ブレマーウォール', '布雷默墙', '布雷默牆') },
        { n: { c4: 2, ied: 1 }, name: T('드릴 리그', 'Drill rig', 'ドリルリグ', '钻机', '鑽機') },
        { n: { c4: 3, ied: 2, rpg7: 4, maaws: 4 }, name: L81 },
        { n: { c4: 1, ied: 4, rpg7: 4, maaws: 4, stingray: 25 }, pct: { ied: 25 }, name: 'Talon 9K-SAM' },
        { n: { c4: 3, ied: 1, rpg7: 7, maaws: 7, stingray: 42 }, pct: { c4: 40 }, name: 'Vanguard CIWS' },
        { n: { c4: 5, ied: 1, rpg7: 6, maaws: 6, mgl40: 50, m67: 50 }, name: 'FOB' }
      ]
    },

    /*
     * 차량과 탑재 무기.
     * perRound = 부위 배율 전 탄 1발의 기본 피해, blast = 폭발 반경 정보
     */
    vehicles: [
      {
        id: 'l2a6', name: 'L2A6', hp: 800, seats: 3, speed: 65,
        kind: T('주력 전차', 'Main battle tank', '主力戦車', '主战坦克', '主戰坦克'),
        weapons: [
          { dmg: 150, ammo: '120mm HEAT-MP', name: T('L55A1 120mm 주포', 'L55A1 120mm main gun', 'L55A1 120mm主砲', 'L55A1 120mm 主炮', 'L55A1 120mm 主砲') },
          { dmg: 60, perRound: true, ammo: '.308 Win', name: T('MG3A1 공축기관총', 'MG3A1 coaxial MG', 'MG3A1同軸機銃', 'MG3A1 并列机枪', 'MG3A1 並列機槍') },
          { dmg: 28, perRound: true, ammo: '5.56×45mm', name: T('M249 기관총', 'M249 machine gun', 'M249機関銃', 'M249 机枪', 'M249 機槍') }
        ]
      },
      {
        id: 'sph2', name: 'SPH-2', hp: 650, seats: 3, speed: 65,
        kind: T('자주포', 'Self-propelled howitzer', '自走砲', '自行火炮', '自走砲'),
        weapons: [
          { dmg: 450, ammo: '155mm HE', blast: { radius: 20, full: 7.5 }, name: T('L52 155mm 곡사포', 'L52 155mm howitzer', 'L52 155mm榴弾砲', 'L52 155mm 榴弹炮', 'L52 155mm 榴彈砲') },
          { dmg: 28, perRound: true, ammo: '5.56×45mm', name: T('M249 기관총', 'M249 machine gun', 'M249機関銃', 'M249 机枪', 'M249 機槍') }
        ],
        note: T('사거리 2.7 km, 재장전 25–27초', 'Range 2.7 km, reload 25–27 s', '射程2.7 km、装填25〜27秒', '射程 2.7 km，装填 25–27 秒', '射程 2.7 km，裝填 25–27 秒')
      },
      {
        id: 'havoc', name: 'Havoc', hp: 800, seats: 2, speed: 400,
        kind: T('공격 헬기', 'Attack helicopter', '攻撃ヘリ', '武装直升机', '武裝直升機'),
        weapons: [
          { dmg: 100, ammo: '30mm HE', blast: { radius: 3, full: 1 }, name: T('2A42 30mm 기관포', '2A42 30mm autocannon', '2A42 30mm機関砲', '2A42 30mm 机炮', '2A42 30mm 機砲') },
          { dmg: 300, ammo: ROCKET_122, blast: { radius: 3 }, name: T('B-13 로켓 포드', 'B-13 rocket pods', 'B-13ロケットポッド', 'B-13 火箭巢', 'B-13 火箭巢') }
        ],
        note: T('회당 $18,000 · Pilot Lv35', '$18,000 per life · Pilot Lv35', '1回 $18,000 · Pilot Lv35', '每次 $18,000 · Pilot Lv35', '每次 $18,000 · Pilot Lv35')
      },
      {
        id: 'gepard', name: 'Flakpanzer Gepard', hp: 800, seats: 2, speed: 65,
        kind: T('대공 전차', 'Anti-aircraft tank', '対空戦車', '防空坦克', '防空坦克'),
        weapons: [
          { dmg: 18, ammo: '35×228mm', name: T('Oerlikon GDF 35mm 쌍열', 'Twin Oerlikon GDF 35mm', 'Oerlikon GDF 35mm連装', 'Oerlikon GDF 35mm 双联', 'Oerlikon GDF 35mm 雙聯') }
        ]
      },
      {
        id: 'm113', name: 'M113 APC SV', hp: 1000, seats: 10, speed: 71, weapons: [],
        kind: T('병력 수송 장갑차', 'Armored personnel carrier', '装甲兵員輸送車', '装甲运兵车', '裝甲運兵車'),
        note: T('한 팀이 20점에 도달하면 기지에 등장', 'Appears at base once a team reaches 20 points', 'いずれかのチームが20点に達すると拠点に出現', '任一队伍达到 20 分后在基地出现', '任一隊伍達到 20 分後在基地出現')
      },
      {
        id: 'humvee', name: 'Humvee', hp: 500, seats: 4, speed: 113,
        kind: T('경차량', 'Light vehicle', '軽車両', '轻型载具', '輕型載具'),
        weapons: [
          { dmg: 28, perRound: true, ammo: '5.56×45mm', name: T('M249 (M249 사양)', 'M249 (M249 variant)', 'M249（M249仕様）', 'M249（M249 型）', 'M249（M249 型）') },
          { dmg: 60, perRound: true, ammo: '7.62×51mm', name: T('M134D 미니건 (미니건 사양)', 'M134D minigun (Minigun variant)', 'M134Dミニガン（ミニガン仕様）', 'M134D 转管机枪（Minigun 型）', 'M134D 轉管機槍（Minigun 型）') }
        ],
        note: T('기본형은 무장 없음', 'Base model is unarmed', '標準型は非武装', '基础型无武装', '基礎型無武裝')
      },
      {
        id: 'mh6', name: 'MH-6', hp: 400, seats: 6, speed: 350,
        kind: T('경헬기', 'Light helicopter', '軽ヘリ', '轻型直升机', '輕型直升機'),
        weapons: [
          { dmg: 60, perRound: true, ammo: '7.62×51mm', name: T('M134D 미니건 ×2 (AH-6M)', 'M134D minigun ×2 (AH-6M)', 'M134Dミニガン ×2（AH-6M）', 'M134D 转管机枪 ×2（AH-6M）', 'M134D 轉管機槍 ×2（AH-6M）') },
          { dmg: 100, ammo: ROCKET_122, blast: { radius: 6, full: 2 }, name: T('로켓 포드 (AH-6R)', 'Rocket pods (AH-6R)', 'ロケットポッド（AH-6R）', '火箭巢（AH-6R）', '火箭巢（AH-6R）') }
        ],
        note: T('무장형 AH-6M·AH-6R 변형 있음', 'Armed AH-6M and AH-6R variants exist', '武装型のAH-6M・AH-6Rあり', '另有武装型 AH-6M、AH-6R', '另有武裝型 AH-6M、AH-6R')
      }
    ],

    /* 수치 출처 */
    sources: [
      { site: 'metabot.gg', url: 'https://metabot.gg/en/wardogs/weapons', topic: T('사격장 실측 무기 데이터', 'Firing-range weapon data', '射撃場での実測武器データ', '靶场实测武器数据', '靶場實測武器數據') },
      { site: 'metabot.gg', url: 'https://metabot.gg/en/wardogs/ammo/5-56x45mm', topic: T('5.56 탄종 실측', '5.56 ammo tests', '5.56弾種の実測', '5.56 弹种实测', '5.56 彈種實測') },
      { site: 'Wardogs Zone', url: 'https://wardogs.zone/calculators/damage', topic: T('피해 계산기 (종류별 배율)', 'Damage calculator (class multipliers)', 'ダメージ計算機（種類別倍率）', '伤害计算器（分类倍率）', '傷害計算器（分類倍率）') },
      { site: 'Wardogs Zone', url: 'https://wardogs.zone/news/how-armor-works', topic: T('방어구 단계별 보호', 'Armor coverage by level', '防具レベル別の保護範囲', '各级护甲防护范围', '各級護甲防護範圍') },
      { site: 'Metaforge', url: 'https://metaforge.app/wardogs/database/weapons/page/1', topic: T('무기 데이터베이스', 'Weapon database', '武器データベース', '武器数据库', '武器資料庫') },
      { site: 'Metaforge', url: 'https://metaforge.app/wardogs/database/armor/level-3-helmet', topic: T('방어구', 'Armor', '防具', '护甲', '護甲') },
      { site: 'Metaforge', url: 'https://metaforge.app/wardogs/database/mounted-weapons/page/1?sub=emplacements', topic: T('설치 무기', 'Emplacements', '設置兵器', '固定武器', '固定武器') },
      { site: 'Dexerto Wiki', url: 'https://www.dexerto.com/wikis/wardogs/', topic: 'WARDOGS' },
      { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/weapons/', topic: T('무기 목록', 'Weapon list', '武器一覧', '武器列表', '武器列表') },
      { site: 'WARDOGS Hub UA', url: 'https://wardogshub.uk/en/database/emplaced-weapons/', topic: T('설치 무기 12종', '12 emplaced weapons', '設置兵器12種', '12 种固定武器', '12 種固定武器') },
      { site: 'wardogs.tools', url: 'https://wardogs.tools/database/buildables', topic: T('건축물 내구도', 'Structure durability', '建築物の耐久値', '建筑耐久度', '建築耐久度') },
      { site: 'wardogs.tools', url: 'https://wardogs.tools/database/vehicles', topic: T('차량', 'Vehicles', '車両', '载具', '載具') },
      { site: 'WarDogs.fit', url: 'https://www.wardogs.fit/guide/explosives-cheat-sheet', topic: T('폭발물 치트시트', 'Explosives cheat sheet', '爆発物チートシート', '爆炸物速查表', '爆炸物速查表') },
      { site: 'XGamingServer', url: 'https://xgamingserver.com/blog/wardogs-armor-guide/', topic: T('방어구 내구도', 'Armor durability', '防具の耐久値', '护甲耐久度', '護甲耐久度') },
      { site: 'wardogtools.gg', url: 'https://wardogtools.gg/methodology/weapons/', topic: T('거리 감쇠', 'Damage falloff', '距離減衰', '距离衰减', '距離衰減') },
      { site: 'ExitLag', url: 'https://www.exitlag.com/blog/wardogs-mortar/', topic: L81 },
      { site: 'Metaforge', url: 'https://metaforge.app/wardogs/database/vehicles/page/1', topic: T('차량 선체 피해', 'Vehicle hull damage', '車体ダメージ', '载具车体伤害', '載具車體傷害') },
      { site: 'guided.news', url: 'https://guided.news/en/guides/wardogs-fob-raiding-guide-c4-ied/', topic: T('FOB 공략 (C4·IED 피해율)', 'FOB raiding (C4 & IED damage)', 'FOB攻略（C4・IEDのダメージ率）', 'FOB 突袭（C4·IED 伤害比例）', 'FOB 突襲（C4·IED 傷害比例）') },
      { site: 'Guidexon', url: 'https://guidexon.com/wardogs-explosives-cheat-sheet/', topic: T('폭발물 치트시트', 'Explosives cheat sheet', '爆発物チートシート', '爆炸物速查表', '爆炸物速查表') },
      { site: 'All Things How', url: 'https://allthings.how/wardogs-tank-killing-guide-armor-zones-and-time-to-kill/', topic: T('전차 장갑 구역', 'Tank armor zones', '戦車の装甲区画', '坦克装甲分区', '坦克裝甲分區') },
      { site: 'metabot.gg', url: 'https://metabot.gg/en/wardogs/guides/armor-and-weight-guide', topic: T('방어구·가방 무게', 'Armor & backpack weights', '防具・バッグの重量', '护甲与背包重量', '護甲與背包重量') },
      { site: 'WarDogs.News', url: 'https://wardogs.news/guides/weight-classes/', topic: T('무게 등급', 'Weight classes', '重量クラス', '重量等级', '重量等級') },
      { site: 'GameWatcher', url: 'https://www.gamewatcher.com/wardogs/items', topic: T('아이템 무게', 'Item weights', 'アイテム重量', '物品重量', '物品重量') }
    ]
  };
})();
