/*
 * 패치노트. 공식 발표(Steam·X)와 보도를 바탕으로 요약했다. 날짜는 UTC.
 * cat: balance(밸런스·경제) · gameplay · stability(안정성·버그) · fair(악용 방지·제재) · ui
 * lab: 데미지 탭에서 관련 섹션 id (해당 변경이 사이트 수치·내용과 닿을 때)
 * tables: 이전 → 이후 표. 값이 커질수록 플레이어에게 불리한 항목만 싣는다 (가격·XP·해금 레벨)
 * check: 패치노트 탭 맨 위 요약. level = ok(사이트 수치 그대로) · updated(바뀐 수치 반영함) · pending(바뀌었지만 아직 반영 전)
 *
 * 새 패치 추가 절차와 자동 갱신은 tools/UPDATE_PATCHES.md 참고. 추가 후 node tools/check-patches.js 로 검사.
 */
(function () {
  var T = function (ko, en, ja, hans, hant) { return { ko: ko, en: en, ja: ja, 'zh-Hans': hans, 'zh-Hant': hant }; };

  var DOWN_1H = T('08:00 UTC부터 약 1시간', 'About 1 hour from 08:00 UTC', '08:00 UTCから約1時間', '08:00 UTC 起约 1 小时', '08:00 UTC 起約 1 小時');
  var NO_CHANGE = T('수치 변경 없음.', 'No changes to numbers.', '数値の変更はありません。', '数值没有改动。', '數值沒有改動。');
  var SUPPORT_L = T('대형 망치 (서포트)', 'Large Hammer (Support)', '大型ハンマー（サポート）', '大锤（支援）', '大錘（支援）');

  window.WD_DATA.patches = {
    check: {
      level: 'ok',
      title: T('사이트 수치는 그대로입니다.', 'Site numbers still hold.', 'サイトの数値は変わっていません。', '本站数值保持不变。', '本站數值維持不變。'),
      body: T(
        '지금까지 적용된 패치 중 무기 기본 피해량, 방어구 감소율, 아이템 무게를 바꾼 것은 없습니다. Havoc이 기관포에 받는 피해는 바뀌었지만 데미지 탭에는 그 값이 없습니다. 10월 15일 시즌 2에서 고구경 탄 피해 감소와 Level 4 방어구 하향이 예고돼 있어, 정식 패치노트가 나오는 대로 반영합니다.',
        'No patch applied so far has changed base weapon damage, armor reduction or item weights. The damage the Havoc takes from cannon fire changed, but the Damage tab doesn’t list that value. Season 2 on October 15 is set to cut high-caliber damage and weaken Level 4 armor, and that will be applied once the full patch notes are out.',
        'これまでに適用されたパッチで、武器の基礎ダメージ・防具の軽減率・アイテム重量を変えたものはありません。Havocが機関砲から受けるダメージは変わりましたが、ダメージタブにはその値がありません。10月15日のシーズン2では高口径弾のダメージ減少とLevel 4防具の弱体化が予告されており、正式なパッチノートが出しだい反映します。',
        '目前已上线的补丁都没有改动武器基础伤害、护甲减伤或物品重量。Havoc 受到的机炮伤害有调整，但伤害页没有收录该数值。10 月 15 日第 2 赛季预告削减高口径弹药伤害并削弱 Level 4 护甲，完整更新日志发布后会立即更新。',
        '目前已上線的更新都沒有改動武器基礎傷害、護甲減傷或物品重量。Havoc 受到的機砲傷害有調整，但傷害頁沒有收錄該數值。10 月 15 日第 2 賽季預告削減高口徑彈藥傷害並削弱 Level 4 護甲，完整更新日誌發布後會立即更新。')
    },

    next: {
      id: 'next', date: '2026-10-15',
      title: T('시즌 2 · 업데이트 0.2', 'Season 2 · Update 0.2', 'シーズン2・アップデート0.2', '第 2 赛季 · 更新 0.2', '第 2 賽季 · 更新 0.2'),
      summary: T(
        '10월 9일 Steam 패치노트 미리보기와 개발 영상 「The Road to Season 2」에서 공개된 내용입니다. 모든 밸런스 변경과 점검 시간이 담긴 정식 패치노트는 이번 주 초에 나오며, 세부 내용은 그때까지 바뀔 수 있습니다.',
        'What the October 9 Steam patch notes preview and the “The Road to Season 2” dev video have revealed. Full patch notes with every balance change and the maintenance window are due early this week, and details may still change until then.',
        '10月9日のSteamパッチノートプレビューと開発動画「The Road to Season 2」で公開された内容です。すべてのバランス変更とメンテナンス時間を含む正式なパッチノートは今週前半に出る予定で、それまでに内容が変わる可能性があります。',
        '以下为 10 月 9 日 Steam 更新日志预览与开发视频《The Road to Season 2》公布的内容。包含全部平衡调整与维护时间的完整更新日志将于本周初公布，细节在此之前仍可能变动。',
        '以下為 10 月 9 日 Steam 更新日誌預覽與開發影片《The Road to Season 2》公布的內容。包含全部平衡調整與維護時間的完整更新日誌將於本週初公布，細節在此之前仍可能變動。'),
      impact: { some: true, text: T(
        '고구경 탄 피해 감소와 Level 4 방어구 감소율 하향이 예고돼, 시즌 2가 시작되면 데미지 탭의 무기·방어구 수치가 바뀝니다. 정식 패치노트가 나오면 새 무기·차량·건축물과 함께 반영합니다.',
        'High-caliber damage cuts and a lower Level 4 armor reduction are planned, so weapon and armor numbers in the Damage tab will change when Season 2 starts. They’ll be updated together with the new weapons, vehicles and buildables once the full patch notes are out.',
        '高口径弾のダメージ減少とLevel 4防具の軽減率引き下げが予告されており、シーズン2開始時にダメージタブの武器・防具の数値が変わります。正式なパッチノートが出たら、新しい武器・車両・建築物とあわせて反映します。',
        '已预告削减高口径弹药伤害并下调 Level 4 护甲减伤，第 2 赛季开始后伤害页的武器与护甲数值会改变。完整更新日志发布后，会连同新武器、载具与建筑一起更新。',
        '已預告削減高口徑彈藥傷害並下調 Level 4 護甲減傷，第 2 賽季開始後傷害頁的武器與護甲數值會改變。完整更新日誌發布後，會連同新武器、載具與建築一起更新。') },
      items: [
        { cat: 'balance', lab: 'matrix', text: T(
          '고구경 탄 기본 피해 감소: .308 −25%, 7.62×54R −20%, 7.62×39 −19%, .50 −16%. 지금 수치에 대입하면 .308은 60→45, 7.62×54R은 55→44, 7.62×39는 42→약 34, .50은 107→약 90입니다(예상치). 저격소총은 부위별 피해를 올려 보완하고, 반동과 제압 효과도 다시 조정합니다.',
          'High-caliber base damage cuts: .308 −25%, 7.62×54R −20%, 7.62×39 −19%, .50 −16%. Applied to current values that is .308 60→45, 7.62×54R 55→44, 7.62×39 42→about 34 and .50 107→about 90 (projections). Sniper rifles get higher hit-location damage to compensate, and recoil and suppression are retuned.',
          '高口径弾の基礎ダメージ減少：.308 −25%、7.62×54R −20%、7.62×39 −19%、.50 −16%。現在の数値に当てはめると、.308は60→45、7.62×54Rは55→44、7.62×39は42→約34、.50は107→約90です（予想値）。スナイパーライフルは部位ダメージを上げて補い、反動と制圧効果も再調整されます。',
          '高口径弹药基础伤害削减：.308 −25%、7.62×54R −20%、7.62×39 −19%、.50 −16%。套用当前数值约为 .308 60→45、7.62×54R 55→44、7.62×39 42→约 34、.50 107→约 90（预估）。狙击步枪提高部位伤害作为补偿，后坐力与压制效果也会重新调整。',
          '高口徑彈藥基礎傷害削減：.308 −25%、7.62×54R −20%、7.62×39 −19%、.50 −16%。套用目前數值約為 .308 60→45、7.62×54R 55→44、7.62×39 42→約 34、.50 107→約 90（預估）。狙擊步槍提高部位傷害作為補償，後座力與壓制效果也會重新調整。') },
        { cat: 'balance', lab: 'armor', text: T(
          'Level 4 방어구 재조정: 갑옷·헬멧 피해 감소율이 65%에서 60%로 내려간다고 보도됐습니다(공식 수치 확인 전). Level 4 헬멧은 시야가 좁아지고 소리가 먹먹해지며 질주할 때 바이저에 김이 서리는 대신, 새 제압 시스템에서 이점을 얻습니다.',
          'Level 4 armor rework: armor and helmet damage reduction is reported to drop from 65% to 60% (not yet in an official post). The Level 4 helmet also gets a restricted view, muffled sound and a visor that fogs while sprinting, in exchange for benefits under the new suppression system.',
          'Level 4防具の再調整：アーマーとヘルメットのダメージ軽減率が65%から60%に下がると報じられています（公式の数値は未確認）。Level 4ヘルメットは視界が狭まり、音がこもり、ダッシュ中にバイザーが曇る代わりに、新しい制圧システムで有利になります。',
          'Level 4 护甲重做：据报道护甲与头盔减伤将从 65% 降至 60%（尚无官方数值）。Level 4 头盔还会限制视野、使声音发闷、冲刺时面罩起雾，但在新的压制系统中获得优势。',
          'Level 4 護甲重做：據報導護甲與頭盔減傷將從 65% 降至 60%（尚無官方數值）。Level 4 頭盔還會限制視野、使聲音發悶、衝刺時面罩起霧，但在新的壓制系統中獲得優勢。') },
        { cat: 'balance', text: T(
          '첫 진행도 초기화: 레벨, 병과 진행도, 해금이 처음으로 돌아갑니다. 남은 현금은 영구 화폐인 골드바로 바뀌고, 골드바로 산 치장 아이템은 계정에 남습니다.',
          'The first progression wipe: levels, role progression and unlocks reset. Leftover cash converts into Gold Bars, a permanent account currency, and cosmetics bought with Gold Bars stay on your account.',
          '初の進行度リセット：レベル、兵科の進行度、解放状況が最初に戻ります。残ったお金は永続通貨のゴールドバーに変わり、ゴールドバーで買った見た目アイテムはアカウントに残ります。',
          '首次进度重置：等级、兵种进度与解锁全部归零。剩余现金会转换为永久货币金条，用金条购买的外观物品保留在账号中。',
          '首次進度重置：等級、兵種進度與解鎖全部歸零。剩餘現金會轉換為永久貨幣金條，用金條購買的外觀物品保留在帳號中。') },
        { cat: 'balance', text: T(
          '새 자원 「인텔」: 총기 개조 화면에서 부착물을 여는 데 쓰일 예정입니다. 얻는 방법과 수치는 아직 공개되지 않았습니다.',
          'A new resource, Intel, is planned for unlocking attachments in the Gunsmith. How it’s earned and the numbers aren’t public yet.',
          '新しいリソース「インテル」：ガンスミス画面でアタッチメントを解放するのに使われる予定です。入手方法と数値はまだ公開されていません。',
          '新资源「情报」：将用于在改枪界面解锁配件。获取方式与数值尚未公开。',
          '新資源「情報」：將用於在改槍介面解鎖配件。取得方式與數值尚未公開。') },
        { cat: 'balance', text: T(
          'Lonestar(청팀) 보정: 시즌 1 승률이 청팀 약 10%, 적팀 40%, 녹팀 50%로 크게 벌어져, 청팀은 승리 시 현금·XP 보너스와 팀플레이 배율을 받고 스폰 위치(Bakurani 포함)와 복장이 바뀝니다.',
          'Lonestar (Blue) support: Season 1 win rates were about 10% for Blue against 40% for Red and 50% for Green, so Blue gets cash and XP win bonuses, teamplay multipliers, new spawn positions (including on Bakurani) and new uniforms.',
          'Lonestar（青チーム）の補正：シーズン1の勝率は青チーム約10%、赤40%、緑50%と大きく開いたため、青チームは勝利時のお金・XPボーナスとチームプレイ倍率を得て、スポーン位置（Bakurani含む）と服装が変わります。',
          'Lonestar（蓝队）补强：第 1 赛季胜率蓝队约 10%、红队 40%、绿队 50%，差距悬殊。蓝队获胜可获得现金与 XP 奖励及团队配合倍率，出生点（含 Bakurani）与服装也会调整。',
          'Lonestar（藍隊）補強：第 1 賽季勝率藍隊約 10%、紅隊 40%、綠隊 50%，差距懸殊。藍隊獲勝可獲得現金與 XP 獎勵及團隊配合倍率，出生點（含 Bakurani）與服裝也會調整。') },
        { cat: 'balance', text: T(
          '팀 이동 제한과 꼴찌 할인: 한 팀이 10점 넘게 앞서면 합류 후 15분 동안 팀을 바꿀 수 없습니다. 2위에 40점 이상 뒤진 꼴찌 팀은 판매상에서 20% 할인을 받습니다.',
          'Team-switch limits and a last-place discount: once a team leads by more than 10 points, you can’t switch teams for 15 minutes after joining. A last-place team 40+ points behind second gets 20% off at vendors.',
          'チーム移動の制限と最下位割引：あるチームが10点を超えてリードすると、参加後15分間はチームを変えられません。2位に40点以上離された最下位チームは販売所で20%割引になります。',
          '换队限制与垫底折扣：某队领先超过 10 分时，加入后 15 分钟内无法换队。落后第二名 40 分以上的垫底队伍在商人处享 8 折。',
          '換隊限制與墊底折扣：某隊領先超過 10 分時，加入後 15 分鐘內無法換隊。落後第二名 40 分以上的墊底隊伍在商人處享 8 折。') },
        { cat: 'balance', text: T(
          '실험적인 내기 판매상: 조건이 붙은 목표에 현금을 걸어 더 큰 보상을 노립니다. 미니맵 위에 걸린 금액과 진행 상황이 표시되며, 악용되면 시즌 중에 바뀌거나 빠질 수 있습니다.',
          'An experimental Wager Vendor lets you stake cash on objectives with extra conditions for bigger payouts. A tracker above the minimap shows your stake and progress, and it may change or be removed mid-season if it proves exploitable.',
          '実験的な賭けの販売所：条件付きの目標にお金を賭けて、より大きな報酬を狙えます。ミニマップの上に賭け金と進行状況が表示され、悪用されればシーズン中に変更・削除される可能性があります。',
          '实验性的下注商人：可在附加条件的目标上押注现金换取更高回报。小地图上方会显示押注金额与进度，若被滥用可能在赛季中调整或移除。',
          '實驗性的下注商人：可在附加條件的目標上押注現金換取更高回報。小地圖上方會顯示押注金額與進度，若被濫用可能在賽季中調整或移除。') },
        { cat: 'balance', text: T(
          'IR 거리 측정기가 배터리를 써야 하는 장비로 돌아옵니다.',
          'IR Rangefinders return, now needing batteries.',
          'IRレンジファインダーがバッテリー式で復活します。',
          'IR 测距仪回归，需要电池才能使用。',
          'IR 測距儀回歸，需要電池才能使用。') },
        { cat: 'gameplay', lab: 'weapons', text: T(
          '새 무기 4종: TCX-SPR(Spear) 돌격소총, M14 지정사수소총, PP-19 Bizon 기관단총, Evo-3 Ultra 경기관총. 새 부착물도 들어옵니다.',
          'Four new weapons: the TCX-SPR (Spear) assault rifle, M14 DMR, PP-19 Bizon SMG and Evo-3 Ultra LMG, plus new attachments.',
          '新武器4種：TCX-SPR（Spear）アサルトライフル、M14マークスマンライフル、PP-19 Bizonサブマシンガン、Evo-3 Ultra軽機関銃。新しいアタッチメントも追加されます。',
          '4 把新武器：TCX-SPR（Spear）突击步枪、M14 精确射手步枪、PP-19 Bizon 冲锋枪、Evo-3 Ultra 轻机枪，并加入新配件。',
          '4 把新武器：TCX-SPR（Spear）突擊步槍、M14 精確射手步槍、PP-19 Bizon 衝鋒槍、Evo-3 Ultra 輕機槍，並加入新配件。') },
        { cat: 'gameplay', lab: 'explosives', text: T(
          '화염병 추가: 불로 지역을 막아 적 보병의 진입을 막습니다.',
          'Molotov cocktails, for denying areas to enemy infantry.',
          '火炎瓶が追加。炎でエリアを封じ、敵歩兵の侵入を防ぎます。',
          '新增燃烧瓶，用火封锁区域，阻止敌方步兵进入。',
          '新增燃燒瓶，用火封鎖區域，阻止敵方步兵進入。') },
        { cat: 'gameplay', lab: 'vehicles', text: T(
          '새 차량 4종: Wolf-110, 무장형 Wolf-110 Assault, T-72B3 전차(레오파드보다 느리지만 싸고 연료를 덜 씀), Flakpanzer Gepard 대공 차량.',
          'Four new vehicles: the Wolf-110, the armed Wolf-110 Assault, the T-72B3 tank (slower than the Leopard but cheaper and more fuel-efficient) and the Flakpanzer Gepard anti-air vehicle.',
          '新車両4種：Wolf-110、武装型Wolf-110 Assault、T-72B3戦車（レオパルトより遅いが安く燃費が良い）、Flakpanzer Gepard対空車両。',
          '4 款新载具：Wolf-110、武装型 Wolf-110 Assault、T-72B3 坦克（比豹式慢，但更便宜、更省油）、Flakpanzer Gepard 防空车。',
          '4 款新載具：Wolf-110、武裝型 Wolf-110 Assault、T-72B3 坦克（比豹式慢，但更便宜、更省油）、Flakpanzer Gepard 防空車。') },
        { cat: 'gameplay', lab: 'structures', text: T(
          '새 건축물 3종: MG 진지(M2), 대형 대피소, 나무 발판. 건설 비용이 오르고 건설 속도는 느려지며, 박격포·Talon·드릴 장비도 조정됩니다.',
          'Three new buildables: an MG nest (M2), a large shelter and a wooden step. Construction costs more and builds slower, and mortars, Talons and drill rigs are adjusted.',
          '新建築物3種：MG陣地（M2）、大型シェルター、木製の足場。建設コストが上がって建設速度は遅くなり、迫撃砲・Talon・ドリルも調整されます。',
          '3 种新建筑：机枪阵地（M2）、大型掩体、木制踏板。建造成本提高、速度变慢，迫击炮、Talon 与钻机也会调整。',
          '3 種新建築：機槍陣地（M2）、大型掩體、木製踏板。建造成本提高、速度變慢，迫擊砲、Talon 與鑽機也會調整。') },
        { cat: 'gameplay', text: T(
          '비와 안개 날씨 추가. 시야, 교전 거리, 소리에 영향을 줍니다.',
          'Rain and fog weather that affects visibility, engagement ranges and sound.',
          '雨と霧の天候が追加。視界、交戦距離、音に影響します。',
          '新增雨天与雾天，会影响视野、交战距离与声音。',
          '新增雨天與霧天，會影響視野、交戰距離與聲音。') },
        { cat: 'gameplay', lab: 'weight', text: T(
          '낙하산의 최소 개방 높이가 높아집니다.',
          'Parachutes get a higher minimum deployment height.',
          'パラシュートの最低展開高度が上がります。',
          '降落伞的最低开伞高度提高。',
          '降落傘的最低開傘高度提高。') },
        { cat: 'stability', text: T(
          '성능 최적화, 버그 수정, 서버 안정성 개선이 함께 들어갑니다.',
          'Further performance optimisation, bug fixes and server stability improvements.',
          'パフォーマンス最適化、不具合修正、サーバー安定性の改善も含まれます。',
          '同时包含性能优化、错误修复与服务器稳定性改进。',
          '同時包含效能最佳化、錯誤修正與伺服器穩定性改善。') }
      ],
      sources: [
        { site: 'Steam', url: 'https://steamcommunity.com/app/1867240/announcements/' },
        { site: 'Steam Discussions', url: 'https://steamcommunity.com/app/1867240/discussions/0/585062414363418160/' },
        { site: 'Shacknews', url: 'https://www.shacknews.com/article/150958/wardogs-season-2-new-content' },
        { site: 'Screen Rant', url: 'https://screenrant.com/wardogs-season-2-new-weapons-vehicles-patch-notes/' },
        { site: 'Screen Rant (Blue Team)', url: 'https://screenrant.com/wardogs-season-2-has-an-experimental-plan-to-save-blue-team/' },
        { site: 'GamesRadar+', url: 'https://www.gamesradar.com/games/fps/wardogs-season-2-will-pay-people-to-join-blue-team-to-fix-its-notoriously-lower-win-rate-lonestar-gets-cash-and-xp-win-bonus-plus-multipliers/' },
        { site: 'OpenCritic', url: 'https://opencritic.com/news/37465/wardogs-season-2-revealed-new-weapons-vehicles-weather-major-gameplay-changes' },
        { site: 'IGGM', url: 'https://www.iggm.com/news/wardogs-season-2-developer-balance-changes-wipe-changes-gear-adjustments-intel-progression' }
      ]
    },

    list: [
      {
        id: 'balance-2026-10-02', date: '2026-10-02', type: 'hotfix', version: null,
        title: T('IR 고글·CWIS 밸런스 핫픽스', 'IR goggles & CWIS balance hotfix', 'IRゴーグル・CWISバランスホットフィックス', 'IR 护目镜与 CWIS 平衡热修复', 'IR 護目鏡與 CWIS 平衡熱修復'),
        summary: T(
          '보안 핫픽스와 같은 날 나온 서버 쪽 밸런스 조정. 클라이언트 다운로드와 점검 없이 지역 서버가 재시작할 때 12시간에 걸쳐 적용됐습니다.',
          'A server-side balance change released the same day as the security hotfix. No client download or downtime; it rolled out over 12 hours as regional servers restarted.',
          'セキュリティのホットフィックスと同じ日に出たサーバー側のバランス調整。クライアントのダウンロードやメンテナンスはなく、地域サーバーの再起動に合わせて12時間かけて適用されました。',
          '与安全热修复同日推出的服务器端平衡调整。无需下载客户端，也没有停机，随各地区服务器重启在 12 小时内生效。',
          '與安全熱修復同日推出的伺服器端平衡調整。不需下載用戶端，也沒有停機，隨各地區伺服器重啟在 12 小時內生效。'),
        downtime: T('없음 · 서버 재시작 때 12시간에 걸쳐 적용', 'None · applied over 12 hours as servers restarted', 'なし・サーバー再起動に合わせ12時間かけて適用', '无 · 服务器重启时 12 小时内生效', '無 · 伺服器重啟時 12 小時內生效'),
        impact: { some: true, text: T(
          'Havoc이 CWIS에 다시 빨리 격추됩니다(약 6초). 데미지 탭에는 이 값이 없어 사이트 수치는 그대로입니다.',
          'The Havoc goes down to the CWIS quickly again (about 6 s). The Damage tab doesn’t list this value, so site numbers are unchanged.',
          'HavocはCWISで再び素早く撃墜されます（約6秒）。ダメージタブにはこの値を載せていないため、サイトの数値は変わりません。',
          'Havoc 又会被 CWIS 快速击落（约 6 秒）。伤害页未收录该数值，本站数值不变。',
          'Havoc 又會被 CWIS 快速擊落（約 6 秒）。傷害頁未收錄該數值，本站數值不變。') },
        items: [
          { cat: 'balance', lab: 'vehicles', text: T(
            'CWIS가 Havoc을 파괴하는 시간이 약 12초에서 약 6초로 줄었습니다. 직전 패치(0.1.2)의 조정이 지나쳤다고 보고 되돌린 것입니다.',
            'The CWIS now destroys the Havoc in about 6 seconds instead of 12, walking back an over-correction in the previous patch (0.1.2).',
            'CWISがHavocを破壊するまでの時間が約12秒から約6秒に短縮。直前のパッチ（0.1.2）の調整が行き過ぎだったとして戻しました。',
            'CWIS 摧毁 Havoc 的时间从约 12 秒缩短到约 6 秒，修正上一个补丁（0.1.2）的过度调整。',
            'CWIS 摧毀 Havoc 的時間從約 12 秒縮短到約 6 秒，修正上一個更新（0.1.2）的過度調整。') },
          { cat: 'balance', text: T(
            'IR 거리 측정기(열화상 고글·쌍안경)를 시즌 2까지 경기 내 판매상에서 뺐습니다. 너무 강하다는 의견에 개발사도 동의했고, 시즌 2부터는 배터리가 있어야 쓸 수 있습니다.',
            'IR Rangefinders (thermal goggles and binoculars) are pulled from the in-match vendor until Season 2. The developers agreed they were overpowered; from Season 2 they need batteries.',
            'IRレンジファインダー（サーマルゴーグル・双眼鏡）をシーズン2まで試合内の販売所から外しました。強すぎるという意見に開発も同意し、シーズン2からはバッテリーが必要になります。',
            'IR 测距仪（热成像护目镜与望远镜）在第 2 赛季前从局内商店下架。开发者认同其过强，第 2 赛季起需要电池才能使用。',
            'IR 測距儀（熱成像護目鏡與望遠鏡）在第 2 賽季前從局內商店下架。開發者認同其過強，第 2 賽季起需要電池才能使用。') }
        ],
        sources: [
          { site: 'Steam', url: 'https://store.steampowered.com/news/app/1867240/view/670629928317748295' },
          { site: 'X @WARDOGSUpdates', url: 'https://x.com/WARDOGSUpdates/status/2106044339587563585' },
          { site: 'PatchBot', url: 'https://patchbot.io/games/wardogs/articles/1654-ir-goggles-cwis-balance-hotfix' },
          { site: 'timesaver.gg', url: 'https://timesaver.gg/blog/wardogs-ir-goggles-cwis-hotfix' }
        ]
      },

      {
        id: 'hotfix-2026-10-02', date: '2026-10-02', type: 'hotfix', version: null,
        title: T('보안·안정성 핫픽스', 'Security & stability hotfix', 'セキュリティ・安定性ホットフィックス', '安全与稳定性热修复', '安全與穩定性熱修復'),
        summary: T(
          '일부 플레이어에게 영향을 주던 사소한 보안·안정성 문제를 고치는 핫픽스. 전날 Steam과 @WARDOGSUpdates로 예고됐습니다.',
          'A hotfix for minor security and stability issues affecting some players, announced the day before on Steam and @WARDOGSUpdates.',
          '一部プレイヤーに影響していた軽微なセキュリティ・安定性の問題を直すホットフィックス。前日にSteamと@WARDOGSUpdatesで予告されました。',
          '修复影响部分玩家的轻微安全与稳定性问题，前一天在 Steam 与 @WARDOGSUpdates 预告。',
          '修正影響部分玩家的輕微安全與穩定性問題，前一天在 Steam 與 @WARDOGSUpdates 預告。'),
        downtime: DOWN_1H,
        impact: { some: false, text: T('알려진 수치 변경 없음.', 'No known changes to numbers.', '数値の変更は確認されていません。', '未发现数值改动。', '未發現數值改動。') },
        items: [
          { cat: 'stability', text: T(
            '사소한 보안·안정성 문제 수정. 어떤 버그나 오류 코드인지는 밝히지 않았고, 세부 패치노트도 공개되지 않았습니다.',
            'Minor security and stability fixes. No specific bug or error code was named, and no detailed patch notes were published.',
            '軽微なセキュリティ・安定性の修正。具体的な不具合やエラーコードは明かされず、詳細なパッチノートも公開されていません。',
            '修复轻微的安全与稳定性问题。官方未说明具体漏洞或错误代码，也未公布详细更新日志。',
            '修正輕微的安全與穩定性問題。官方未說明具體漏洞或錯誤代碼，也未公布詳細更新日誌。') }
        ],
        sources: [
          { site: 'X @WARDOGSUpdates', url: 'https://x.com/WARDOGSUpdates/status/2105813574387970367' },
          { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/news/security-stability-hotfix-2-october/' },
          { site: 'PatchBot', url: 'https://patchbot.io/games/wardogs/articles/1648-security-stability-hotfix' }
        ]
      },

      {
        id: '0-1-2', date: '2026-09-30', type: 'patch', version: '0.1.2',
        title: T('악용 단속과 WD-L020 크래시 수정', 'Exploit crackdown and WD-L020 crash fix', '不正の取り締まりとWD-L020クラッシュ修正', '打击漏洞与修复 WD-L020 崩溃', '打擊漏洞與修正 WD-L020 當機'),
        summary: T(
          'XP·현금 악용을 막고 Windows 11에서 나던 크래시를 고친 업데이트. 악용에 대한 관용도 끝났습니다.',
          'Closes XP and cash exploits and fixes a Windows 11 crash. Leniency on exploits is over.',
          'XP・お金の不正を塞ぎ、Windows 11で起きていたクラッシュを修正したアップデート。不正への猶予も終わりました。',
          '封堵经验与刷钱漏洞，并修复 Windows 11 崩溃。对漏洞滥用不再宽容。',
          '封堵經驗與刷錢漏洞，並修正 Windows 11 當機。對漏洞濫用不再寬容。'),
        downtime: DOWN_1H,
        impact: { some: true, text: T(
          '무기 기본 피해량은 그대로입니다. Havoc이 기관포에 받는 피해, 건축물 약점 위치, 차량 안 투척물 사용 규칙이 바뀌었습니다.',
          'Base weapon damage is unchanged. The damage the Havoc takes from cannon fire, buildable weak-spot placement and throwable use inside vehicles changed.',
          '武器の基礎ダメージは変わりません。Havocが機関砲から受けるダメージ、建築物の弱点の位置、車両内での投擲物の扱いが変わりました。',
          '武器基础伤害不变。Havoc 受到的机炮伤害、建筑弱点位置和车内投掷物规则有调整。',
          '武器基礎傷害不變。Havoc 受到的機砲傷害、建築弱點位置與車內投擲物規則有調整。') },
        items: [
          { cat: 'stability', text: T(
            'WD-L020 크래시 수정: Windows 11 업데이트 KB5124010 때문에 생기던 문제로, 이제 Windows 업데이트를 지우지 않아도 됩니다.',
            'WD-L020 fixed. The crash caused by Windows 11 update KB5124010 is patched, so you no longer need to uninstall that update to play.',
            'WD-L020を修正。Windows 11の更新プログラムKB5124010が原因のクラッシュで、更新をアンインストールする必要はなくなりました。',
            '修复 WD-L020：由 Windows 11 更新 KB5124010 引起的崩溃已修复，无需再卸载该更新。',
            '修正 WD-L020：由 Windows 11 更新 KB5124010 引起的當機已修正，不必再解除安裝該更新。') },
          { cat: 'gameplay', lab: 'vehicles', text: T(
            'Havoc이 20mm·30mm 기관포에 피해를 더 받던 버그를 고쳤습니다. 이 때문에 CWIS로 Havoc을 잡기가 너무 어려워져 10월 2일 핫픽스에서 다시 조정됐습니다.',
            'Fixed a Havoc bug that made it take extra damage from 20 mm and 30 mm cannon fire. That left the Havoc too hard to kill with the CWIS, which the October 2 hotfix adjusted again.',
            'Havocが20mm・30mm機関砲からのダメージを多く受けていた不具合を修正。これでCWISでHavocを落とすのが難しくなりすぎ、10月2日のホットフィックスで再調整されました。',
            '修复 Havoc 受到 20mm 与 30mm 机炮额外伤害的漏洞。此后 CWIS 很难击落 Havoc，10 月 2 日热修复再次调整。',
            '修正 Havoc 受到 20mm 與 30mm 機砲額外傷害的漏洞。此後 CWIS 很難擊落 Havoc，10 月 2 日熱修復再次調整。') },
          { cat: 'gameplay', lab: 'structures', text: T(
            '건축물 약점이 방금 맞힌 자리에 다시 생기거나, 구석으로 밀리거나, 반대편으로 튀던 문제를 고쳤습니다. 이제 서 있는 자리에서 닿는 곳을 우선합니다.',
            'Buildable crit spots no longer reappear where you just hit, get pushed into corners or jump to the far side. They now favor a spot you can reach from where you’re standing.',
            '建築物の弱点が、今当てた場所に再出現したり、隅に寄ったり、反対側へ移ったりする問題を修正。立っている位置から届く場所が優先されます。',
            '修复建筑弱点在刚命中处重现、被挤到角落或跳到另一侧的问题，现在会优先出现在你所站位置够得到的地方。',
            '修正建築弱點在剛命中處重現、被擠到角落或跳到另一側的問題，現在會優先出現在你所站位置搆得到的地方。') },
          { cat: 'gameplay', lab: 'explosives', text: T(
            '밀폐된 차량 좌석에서는 투척물(수류탄·연막탄·C4)을 쓸 수 없습니다.',
            'Throwables (grenades, smoke and C4) can no longer be used from enclosed vehicle seats.',
            '密閉された車両の座席からは投擲物（手榴弾・スモーク・C4）を使えなくなりました。',
            '封闭式载具座位无法再使用投掷物（手雷、烟雾弹、C4）。',
            '封閉式載具座位無法再使用投擲物（手榴彈、煙霧彈、C4）。') },
          { cat: 'fair', text: T(
            '부활 판정을 서버가 전부 검사해 먼 거리에서 악용할 수 없습니다.',
            'Revive checks are now fully server-authoritative, so they can’t be abused across long distances.',
            '蘇生の判定をサーバーがすべて検証し、遠距離からの悪用ができなくなりました。',
            '复活判定改为完全由服务器验证，无法再远距离滥用。',
            '復活判定改為完全由伺服器驗證，無法再遠距離濫用。') },
          { cat: 'fair', text: T(
            '차량으로 통과하는 악용의 보상에 상한을 뒀습니다.',
            'Rewards from the vehicle fly-through exploit are capped.',
            '車両のすり抜け不正による報酬に上限を設定。',
            '载具穿越漏洞的奖励设置上限。',
            '載具穿越漏洞的獎勵設定上限。') },
          { cat: 'fair', text: T(
            '반쯤 지은 건축물을 부수면 건설 진행도만큼만 보상합니다.',
            'Destroying a half-built structure pays in proportion to its build progress.',
            '建設途中の建築物を壊したときの報酬は、建設の進み具合に比例します。',
            '摧毁未完工建筑的奖励按建造进度计算。',
            '摧毀未完工建築的獎勵依建造進度計算。') },
          { cat: 'fair', text: T(
            '구역 밖 FOB에 팔레트를 넣으면 보상이 줄어듭니다.',
            'Pallets deposited into a FOB outside the zone pay less.',
            'エリア外のFOBにパレットを納めると報酬が減ります。',
            '向区域外的 FOB 投放托盘奖励减少。',
            '向區域外的 FOB 投放棧板獎勵減少。') },
          { cat: 'fair', text: T(
            '관용 종료: 악용자와 현금 거래자는 현금과 진행도가 초기화됐고, 반복하면 경고 없이 영구 정지될 수 있습니다.',
            'Leniency is over: exploiters and real-money traders have had cash and progression reset, and repeat abuse risks a permanent ban without warning.',
            '猶予は終了：不正利用者とRMT業者はお金と進行度をリセット。繰り返すと警告なしで永久BANの可能性があります。',
            '不再宽容：滥用者和现金交易者的现金与进度已被重置，屡犯可能被直接永久封禁。',
            '不再寬容：濫用者與現金交易者的現金與進度已被重置，屢犯可能被直接永久封禁。') },
          { cat: 'ui', text: T(
            '서버 목록 고급 필터를 다시 켰고, 익명 모드를 개선했으며, 지역 선택에 고른 지역 수가 나옵니다. DEPLOY 선택 화면에서 게임패드를 쓸 수 있습니다.',
            'Advanced server list filters are back, anonymous mode improved, region select shows how many regions you picked, and gamepads work on the DEPLOY selection screen.',
            'サーバーリストの詳細フィルターが復活、匿名モードを改善、地域選択に選択数を表示。DEPLOY選択画面でゲームパッドが使えます。',
            '服务器列表高级筛选恢复，匿名模式改进，地区选择会显示已选数量，DEPLOY 选择界面支持手柄。',
            '伺服器列表進階篩選恢復，匿名模式改進，地區選擇會顯示已選數量，DEPLOY 選擇畫面支援手把。') },
          { cat: 'ui', text: T(
            '보병 모드와 저레벨 서버로 사람이 더 모이도록 UI를 조금 바꿨습니다.',
            'Small UI changes to steer more players toward Infantry Mode and low-level servers.',
            '歩兵モードと低レベルサーバーに人が集まるようUIを少し変更。',
            '小幅调整界面，引导更多玩家进入步兵模式与低等级服务器。',
            '小幅調整介面，引導更多玩家進入步兵模式與低等級伺服器。') }
        ],
        sources: [
          { site: 'PCGamesN', url: 'https://www.pcgamesn.com/wardogs/update-xp-cash-exploits-bans' },
          { site: 'MP1st', url: 'https://mp1st.com/title-updates-and-patches/wardogs-update-0-1-2-deployed-on-september-30-as-servers-go-down' },
          { site: 'Gfinity', url: 'https://www.gfinityesports.com/article/wardogs-update-012-patch-notes-cash-and-xp-exploit-fixes-are-here' },
          { site: 'GameWatcher', url: 'https://www.gamewatcher.com/wardogs-update-0-1-2-patch-notes-xp-exploits-wd-l020-crash-fix-and-season-2-tease' }
        ]
      },

      {
        id: '0-11', date: '2026-09-14', type: 'patch', version: '0.11',
        title: T('서버 목록 분리', 'Server browser split', 'サーバーブラウザの分割', '服务器列表拆分', '伺服器列表拆分'),
        summary: T(
          '서버 목록을 공식과 커뮤니티로 나누고 현금 악용을 막은 첫 정기 패치. 발표 당시 스튜디오 집계 최고 동시 접속자는 40만 명이었습니다.',
          'The first scheduled patch: the server browser was split into Official and Community, and cash exploits were closed. The studio counted 400,000 peak concurrent players at the time.',
          '初の定期パッチ。サーバーブラウザを公式とコミュニティに分け、お金の不正を塞ぎました。発表時点のスタジオ集計で最大同時接続は40万人。',
          '首个定期补丁：服务器列表分为官方与社区，并封堵刷钱漏洞。公告时工作室统计的最高同时在线为 40 万人。',
          '首個定期更新：伺服器列表分為官方與社群，並封堵刷錢漏洞。公告時工作室統計的最高同時在線為 40 萬人。'),
        downtime: DOWN_1H,
        impact: { some: false, text: NO_CHANGE },
        items: [
          { cat: 'ui', text: T(
            '서버 목록을 공식과 커뮤니티로 나눴습니다. 공식 목록에는 필터가 없습니다.',
            'The server browser is split into Official and Community. Official has no filters at all.',
            'サーバーブラウザを公式とコミュニティに分割。公式にはフィルターがありません。',
            '服务器列表分为官方与社区，官方列表没有筛选。',
            '伺服器列表分為官方與社群，官方列表沒有篩選。') },
          { cat: 'ui', text: T(
            '커뮤니티 목록: 필터가 더 정확해지고, 텍스트 검색과 빈 서버·꽉 찬 서버 보기 토글이 생겼습니다.',
            'Community gets more reliable filters, text search and a Show Empty/Full toggle on the quick bar.',
            'コミュニティ：フィルターの精度が上がり、テキスト検索と空き・満員サーバー表示の切り替えが追加。',
            '社区列表：筛选更可靠，新增文字搜索与“显示空/满服务器”开关。',
            '社群列表：篩選更可靠，新增文字搜尋與「顯示空／滿伺服器」切換。') },
          { cat: 'ui', text: T(
            '커뮤니티 서버는 맵이 바뀌거나 재시작해도 같은 ID를 유지해 ID로 바로 들어갈 수 있습니다. 대신 ID가 훨씬 길어졌습니다.',
            'Community servers keep one ID through map changes and restarts, so you can join by ID, though the number is much longer than before.',
            'コミュニティサーバーはマップ変更や再起動でも同じIDを保つので、IDで直接入れます。そのぶんIDはかなり長くなりました。',
            '社区服务器在换图或重启后保留同一 ID，可直接用 ID 加入，但 ID 比以前长得多。',
            '社群伺服器在換圖或重啟後保留同一 ID，可直接用 ID 加入，但 ID 比以前長得多。') },
          { cat: 'balance', text: T(
            '다음 일주일 동안 커뮤니티 서버 경기 종료 현금 보너스 5%.',
            'A 5% end-of-match cash bonus on Community servers for the following week.',
            '翌1週間、コミュニティサーバーで試合終了時のお金ボーナス5%。',
            '接下来一周，社区服务器结算现金加成 5%。',
            '接下來一週，社群伺服器結算現金加成 5%。') },
          { cat: 'fair', text: T(
            '여러 현금 악용을 고치고, 경제 악용과 XP 파밍에 대한 규칙을 명확히 했습니다.',
            'Fixed several cash exploits and set clearer rules on economy abuse and XP farming.',
            '複数のお金の不正を修正し、経済の悪用とXPファームのルールを明確化。',
            '修复多个刷钱漏洞，并明确经济滥用与刷经验的规则。',
            '修正多個刷錢漏洞，並明確經濟濫用與刷經驗的規則。') },
          { cat: 'stability', text: T('GPU 크래시 경로를 더 고쳤습니다.', 'Fixed more GPU crash paths.', 'GPUクラッシュの原因をさらに修正。', '修复更多 GPU 崩溃情形。', '修正更多 GPU 當機情形。') },
          { cat: 'stability', text: T('아시아 서버 수용량을 늘렸습니다.', 'Increased server capacity in Asia.', 'アジアのサーバー容量を増強。', '提升亚洲服务器容量。', '提升亞洲伺服器容量。') }
        ],
        sources: [
          { site: 'Steam', url: 'https://steamcommunity.com/app/1867240/discussions/0/562541966849578828/' },
          { site: 'games.gg', url: 'https://games.gg/news/wardogs-patch-011-server-browser-update/' },
          { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/news/patch-0-11-server-browser-maintenance/' }
        ]
      },

      {
        id: 'hotfix-1', date: '2026-09-10', type: 'hotfix', version: null,
        title: T('출시 안정화 핫픽스 #1', 'Launch Stability Hotfix #1', 'ローンチ安定化ホットフィックス #1', '上线稳定性热修复 #1', '上線穩定性熱修復 #1'),
        summary: T(
          '출시 4시간여 만에 나온 클라이언트 핫픽스. 첫날 밤의 접속 문제 세 가지를 잡았습니다.',
          'A client hotfix shipped just over four hours after launch, aimed at three launch-night connection problems.',
          'リリースから4時間あまりで出たクライアントのホットフィックス。初日夜の接続問題3つに対応しました。',
          '上线四小时多后推出的客户端热修复，针对首晚的三个连接问题。',
          '上線四小時多後推出的用戶端熱修復，針對首晚的三個連線問題。'),
        downtime: T('20:20 UTC 배포 · 재시작 필요', 'Shipped 20:20 UTC · restart required', '20:20 UTC配信・再起動が必要', '20:20 UTC 发布 · 需重启', '20:20 UTC 發布 · 需重新啟動'),
        impact: { some: false, text: NO_CHANGE },
        items: [
          { cat: 'stability', text: T('서버에 들어가지 못하던 문제를 고쳤습니다.', 'Fixed players being unable to join servers.', 'サーバーに入れない問題を修正。', '修复无法加入服务器的问题。', '修正無法加入伺服器的問題。') },
          { cat: 'stability', text: T('플레이 중 갑자기 서버에서 튕기던 문제를 고쳤습니다.', 'Fixed players being kicked from servers mid-match.', 'プレイ中にサーバーから突然キックされる問題を修正。', '修复游戏中被意外踢出服务器的问题。', '修正遊戲中被意外踢出伺服器的問題。') },
          { cat: 'stability', text: T(
            '로그인 대기열이 지나치게 길던 문제: 기다리는 동안 로그인 티켓이 만료되어 초당 100명이 아니라 10명만 들어가고 있었습니다. 이제 대기열 맨 앞에서 Valve 티켓을 새로 받습니다.',
            'Fixed very long login queues. Login tickets were expiring while players waited, so only ten players a second got through instead of a hundred. A fresh Valve ticket is now issued at the front of the queue.',
            'ログイン待機列が長すぎる問題を修正。待機中にログインチケットが期限切れになり、毎秒100人ではなく10人しか入れていませんでした。今は列の先頭でValveのチケットを新たに受け取ります。',
            '修复登录排队过长的问题：排队时登录票据过期，每秒只能进入 10 人而不是 100 人。现在排到队首时才向 Valve 申请新票据。',
            '修正登入排隊過長的問題：排隊時登入票證過期，每秒只能進入 10 人而不是 100 人。現在排到隊首時才向 Valve 申請新票證。') },
          { cat: 'stability', text: T(
            '적용하려면 게임을 다시 시작해야 했고, 재접속한 플레이어는 대기열에서 묶음 단위로 입장했습니다.',
            'Everyone had to restart the game to get it; on relaunch, players re-entered the login queue and were let in in controlled batches.',
            '適用にはゲームの再起動が必要で、再接続したプレイヤーは待機列から少しずつまとめて入場しました。',
            '需要重启游戏才能生效，重新进入后玩家会按批次从队列入场。',
            '需要重新啟動遊戲才能生效，重新進入後玩家會按批次從佇列入場。') }
        ],
        sources: [
          { site: 'Steam', url: 'https://steamcommunity.com/app/1867240/discussions/0/562541634873654728/' },
          { site: 'PatchBot', url: 'https://patchbot.io/games/wardogs/articles/1394-launch-stability-hotfix-1' },
          { site: 'All Things How', url: 'https://allthings.how/wardogs-login-queue-explained-why-you-can-t-get-in-at-launch/' }
        ]
      },

      {
        id: 'season-1', date: '2026-09-09', type: 'season', version: 'Season 1',
        title: T('시즌 1 · 얼리 액세스 출시', 'Season 1 · Early Access launch', 'シーズン1・アーリーアクセス開始', '第 1 赛季 · 抢先体验上线', '第 1 賽季 · 搶先體驗上線'),
        summary: T(
          '얼리 액세스 하루 전 공개된 시즌 1 변경 사항. 게임은 9월 10일 16:00 UTC에 출시됐습니다. 레벨 곡선을 늦추고 FOB·망치 가격을 올렸으며, 일부 지상 차량은 더 싸고 빨리 열리게 바꿨습니다.',
          'Season 1 changes published the day before Early Access, which opened on September 10 at 16:00 UTC. The level curve slowed, FOB and hammer prices rose, and some ground vehicles became cheaper and unlock sooner.',
          'アーリーアクセス前日に公開されたシーズン1の変更点。ゲームは9月10日16:00 UTCに開始。レベル曲線を遅くし、FOBとハンマーを値上げ、一部の地上車両は安く早く解放されるようになりました。',
          '抢先体验前一天公布的第 1 赛季改动。游戏于 9 月 10 日 16:00 UTC 上线。放慢升级曲线，FOB 与锤子涨价，部分地面载具更便宜、解锁更早。',
          '搶先體驗前一天公布的第 1 賽季改動。遊戲於 9 月 10 日 16:00 UTC 上線。放慢升級曲線，FOB 與錘子漲價，部分地面載具更便宜、解鎖更早。'),
        downtime: null,
        impact: { some: true, text: T(
          '피해량·방어구 변경은 없습니다. 차량 포탑 회전 속도에 상한이 생겼고, 155mm·122mm·조명탄 설치물이 로드아웃 공간을 더 차지합니다.',
          'No damage or armor changes. Vehicle turrets got a rotation speed cap, and 155 mm, 122 mm and flare deployables take more loadout room.',
          'ダメージ・防具の変更はありません。車両砲塔の旋回速度に上限が付き、155mm・122mm・照明弾の設置物がロードアウトの枠をより多く使うようになりました。',
          '伤害与护甲没有改动。车辆炮塔有了转速上限，155mm、122mm 和照明弹部署物占用更多装备空间。',
          '傷害與護甲沒有改動。車輛砲塔有了轉速上限，155mm、122mm 與照明彈部署物佔用更多裝備空間。') },
        items: [
          { cat: 'balance', text: T(
            '레벨 10~20 구간을 느리게, 35부터는 완만하게 조정. 플레이 20~25시간이면 대략 레벨 20에 도달합니다.',
            'Levels 10–20 slowed down and the curve flattened from 35 on. Around 20–25 hours of play lands near level 20.',
            'レベル10〜20を遅く、35以降はゆるやかに調整。20〜25時間のプレイでおおよそレベル20に届きます。',
            '放慢 10–20 级的升级速度，35 级以后曲线变平缓。玩 20–25 小时大约能到 20 级。',
            '放慢 10–20 級的升級速度，35 級以後曲線變平緩。玩 20–25 小時大約能到 20 級。') },
          { cat: 'balance', text: T(
            '포병은 커리어 Lv90, 중전차는 드라이버 Lv35에서 해금. 드라이버 트랙은 공격 차량으로 자연스럽게 올라가도록 재구성했습니다.',
            'Artillery now unlocks at Career 90 and the heavy tank at Driver 35. The Driver track was reworked to climb more smoothly through attack vehicles.',
            '砲兵はキャリアLv90、重戦車はドライバーLv35で解放。ドライバーの系統は攻撃車両へ自然に進めるよう組み直されました。',
            '火炮改为生涯 90 级解锁，重型坦克改为驾驶员 35 级解锁。驾驶员路线重新安排，攻击载具的解锁更循序渐进。',
            '火砲改為生涯 90 級解鎖，重型坦克改為駕駛員 35 級解鎖。駕駛員路線重新安排，攻擊載具的解鎖更循序漸進。') },
          { cat: 'balance', text: T(
            'FOB와 망치 가격 인상: 요새를 짓는 것이 당연한 선택이 아니라 진짜 지출 결정이 되도록. 일부 지상 차량은 더 저렴해졌습니다.',
            'FOB and hammer prices went up so building a fortified position is a real spending decision, not a default. Several ground vehicles got cheaper.',
            'FOBとハンマーを値上げし、拠点づくりを「当たり前」ではなく本当の出費の判断に。一部の地上車両は安くなりました。',
            'FOB 和锤子涨价，让修筑据点成为真正的花钱决定，而不是默认选项。部分地面载具降价。',
            'FOB 與錘子漲價，讓修築據點成為真正的花錢決定，而不是預設選項。部分地面載具降價。') },
          { cat: 'gameplay', lab: 'vehicles', text: T(
            '차량 포탑에 최대 회전 속도 제한이 생겼습니다.',
            'Vehicle turrets now have a maximum rotation speed.',
            '車両の砲塔に最大旋回速度が設けられました。',
            '车辆炮塔新增最大转速限制。',
            '車輛砲塔新增最大轉速限制。') },
          { cat: 'gameplay', lab: 'structures', text: T(
            '155mm·122mm·조명탄 설치물이 로드아웃 공간을 더 차지합니다.',
            '155 mm, 122 mm and flare deployables take up more loadout room.',
            '155mm・122mm・照明弾の設置物がロードアウトの枠をより多く使います。',
            '155mm、122mm 和照明弹部署物占用更多装备空间。',
            '155mm、122mm 與照明彈部署物佔用更多裝備空間。') },
          { cat: 'gameplay', text: T(
            'Z20 Lakota 밸런스 조정. 둔하던 기수 조작을 고치고 추격 카메라 회전 소음을 6 dB 줄였습니다.',
            'Z20 Lakota balance pass, with its sluggish pitch fixed and the chase-camera rotation rattle cut by 6 dB.',
            'Z20 Lakotaのバランス調整。鈍かった機首の上下操作を直し、追跡カメラ回転時のガタつき音を6 dB下げました。',
            'Z20 Lakota 平衡调整，修复俯仰迟钝，追逐镜头旋转时的嘎嘎声降低 6 dB。',
            'Z20 Lakota 平衡調整，修正俯仰遲鈍，追逐鏡頭旋轉時的喀喀聲降低 6 dB。') },
          { cat: 'stability', text: T('전차 조준에 영향을 주던 DPI 문제 수정.', 'Fixed a DPI issue that affected tank aiming.', '戦車の照準に影響していたDPIの問題を修正。', '修复影响坦克瞄准的 DPI 问题。', '修正影響坦克瞄準的 DPI 問題。') },
          { cat: 'stability', text: T(
            '음성 채팅: 참가에 한 번 실패하면 계속 먹통이 되던 문제, 오래된 채널 재접속, 푸시투토크 대상, 재인증을 고쳤습니다. 부하가 클 때 안정성을 높이고 통신 상태 표시를 추가했습니다.',
            'Voice chat no longer breaks for good after a failed join; rejoining stale channels, push-to-talk targeting and reauthentication were fixed. Reliability under load improved and a comms status display was added.',
            'ボイスチャット：参加に一度失敗すると使えなくなる問題、古いチャンネルへの再接続、プッシュトゥトークの対象、再認証を修正。高負荷時の安定性を高め、通信状態の表示を追加しました。',
            '语音聊天：修复加入失败一次后永久失效、重新加入旧频道、按键通话目标与重新验证的问题。提升高负载下的稳定性，并新增通讯状态显示。',
            '語音聊天：修正加入失敗一次後永久失效、重新加入舊頻道、按鍵通話目標與重新驗證的問題。提升高負載下的穩定性，並新增通訊狀態顯示。') },
          { cat: 'fair', text: T('교회 지붕 악용을 막았습니다.', 'Closed a church-roof exploit.', '教会の屋根を使った不正を塞ぎました。', '封堵教堂屋顶漏洞。', '封堵教堂屋頂漏洞。') },
          { cat: 'fair', text: T(
            '신고에 가중치 적용: 반복·악의적으로 신고하는 사람의 신고는 덜 반영됩니다. 치터 제재는 서버 안에 공지됩니다.',
            'Reports are now weighted, so repeat and bad-faith reporters count for less. Cheater bans are announced in-server.',
            '通報に重み付け：繰り返し・悪意のある通報は反映されにくくなります。チーターの処分はサーバー内で告知されます。',
            '举报加入权重：重复或恶意举报的影响降低。外挂封禁会在服务器内公告。',
            '檢舉加入權重：重複或惡意檢舉的影響降低。外掛封禁會在伺服器內公告。') }
        ],
        tables: [
          {
            cat: 'balance', title: T('레벨별 누적 XP', 'Cumulative XP by level', 'レベル別累計XP', '各等级累计 XP', '各等級累計 XP'),
            rows: [
              [T('레벨 10', 'Level 10', 'レベル10', '10 级', '10 級'), '25,000', '35,000'],
              [T('레벨 20', 'Level 20', 'レベル20', '20 级', '20 級'), '111,500', '250,000']
            ]
          },
          {
            cat: 'balance', title: T('해금 레벨', 'Unlock levels', '解放レベル', '解锁等级', '解鎖等級'),
            rows: [
              [SUPPORT_L, 'Lv7', 'Lv8'],
              ['URAL', 'Lv4', 'Lv3'],
              ['URAL Covered', 'Lv30', 'Lv18'],
              ['URAL Attack', 'Lv40', 'Lv25'],
              [T('험비 (미니건)', 'Humvee (minigun)', 'ハンヴィー（ミニガン）', '悍马（转管机枪）', '悍馬（轉管機槍）'), 'Lv35', 'Lv30']
            ]
          },
          {
            cat: 'balance', title: T('가격', 'Prices', '価格', '价格', '價格'),
            rows: [
              [T('FOB (판매상)', 'FOB (vendor)', 'FOB（販売所）', 'FOB（商店）', 'FOB（商店）'), '$2,500', '$7,500'],
              [T('중형 망치 (서포트)', 'Medium Hammer (Support)', '中型ハンマー（サポート）', '中锤（支援）', '中錘（支援）'), '$10,000', '$25,000'],
              [SUPPORT_L, '$25,000', '$75,000'],
              [T('6–10× MRAD 스코프 (리콘)', '6–10× MRAD scope (Recon)', '6–10× MRADスコープ（リコン）', '6–10× MRAD 瞄准镜（侦察）', '6–10× MRAD 瞄準鏡（偵察）'), '$25,000', '$40,000'],
              [T('6–10× MOA 스코프 (리콘)', '6–10× MOA scope (Recon)', '6–10× MOAスコープ（リコン）', '6–10× MOA 瞄准镜（侦察）', '6–10× MOA 瞄準鏡（偵察）'), '$30,000', '$45,000'],
              [T('리틀버드 미니건 (파일럿)', 'Little Bird, miniguns (Pilot)', 'リトルバード・ミニガン（パイロット）', '小鸟直升机·转管机枪（飞行员）', '小鳥直升機·轉管機槍（飛行員）'), '$25,000', '$50,000'],
              ['URAL', '$50,000', '$35,000'],
              ['Z20 Lakota', '$50,000', '$35,000'],
              [T('듄 버기', 'Dune Buggy', 'デューンバギー', '沙滩车', '沙灘車'), '$35,000', '$25,000']
            ]
          }
        ],
        sources: [
          { site: 'Steam', url: 'https://steamcommunity.com/games/1867240/announcements/detail/701027323413004456' },
          { site: 'Shacknews', url: 'https://www.shacknews.com/article/150678/wardogs-season-1-changelog-patch-notes-2026-09-09' },
          { site: 'All Things How', url: 'https://allthings.how/wardogs-season-1-changelog-every-progression-and-economy-change-at-launch/' },
          { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/news/season-1-changelog-pre-load-live/' }
        ]
      }
    ]
  };
})();
