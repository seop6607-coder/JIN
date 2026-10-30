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
      level: 'updated',
      title: T('시즌 2 수치를 반영했습니다.', 'Season 2 numbers are in.', 'シーズン2の数値を反映しました。', '已更新为第 2 赛季数值。', '已更新為第 2 賽季數值。'),
      body: T(
        '고구경 탄(.308·7.62×54R·7.62×39·.50) 피해 감소, Level 3·4 방어구 감소율 하향, 무기 종류별 부위 배율 조정(저격소총 머리 ×4.27 등)을 데미지 탭에 적용했습니다. 공식 수치가 없어 부위 배율과 새 무기 4종의 연사 속도·무게는 커뮤니티 데이터베이스(Metaforge·WardogsXP) 값을 썼고, FAL은 .308 탄으로 확인돼 피해를 45로 낮췄습니다. 바뀐 부위의 시즌 1 실측값은 검증표에서 뺐고, 이후 백엔드 업데이트와 핑 제한은 사이트 수치를 바꾸지 않았습니다.',
        'High-caliber (.308, 7.62×54R, 7.62×39, .50) damage cuts, the lower Level 3 and 4 armor reduction and the new hit-location multipliers by class (e.g. sniper head ×4.27) are applied in the Damage tab. With no official numbers, the multipliers and the four new weapons’ fire rate and weight come from community databases (Metaforge, WardogsXP), and the FAL is confirmed on .308, so its damage drops to 45. Season 1 measurements for changed zones were dropped from the check table, and the later backend update and ping cap don’t change site numbers.',
        '高口径弾（.308・7.62×54R・7.62×39・.50）のダメージ減少、Level 3・4防具の軽減率引き下げ、武器種別の部位倍率の調整（スナイパーの頭 ×4.27 など）をダメージタブに適用しました。公式の数値がないため、部位倍率と新武器4種の連射速度・重量はコミュニティのデータベース（Metaforge・WardogsXP）の値を使い、FALは.308弾と確認できたのでダメージを45に下げました。変わった部位のシーズン1実測値は検証表から外し、その後のバックエンド更新とping上限はサイトの数値を変えていません。',
        '已在伤害页套用高口径弹药（.308、7.62×54R、7.62×39、.50）伤害削减、Level 3 与 4 护甲减伤下调，以及各武器类别的部位倍率调整（如狙击步枪头部 ×4.27）。由于没有官方数值，部位倍率与 4 把新武器的射速、重量采用社区数据库（Metaforge、WardogsXP）的数值；FAL 已确认使用 .308 弹，伤害降为 45。受影响部位的第 1 赛季实测值已从核对表移除，之后的后端更新与延迟上限未改动本站数值。',
        '已在傷害頁套用高口徑彈藥（.308、7.62×54R、7.62×39、.50）傷害削減、Level 3 與 4 護甲減傷下調，以及各武器類別的部位倍率調整（如狙擊步槍頭部 ×4.27）。由於沒有官方數值，部位倍率與 4 把新武器的射速、重量採用社群資料庫（Metaforge、WardogsXP）的數值；FAL 已確認使用 .308 彈，傷害降為 45。受影響部位的第 1 賽季實測值已從核對表移除，之後的後端更新與延遲上限未改動本站數值。')
    },

    // 다음 예고가 나오면 여기에 넣는다
    next: {
      date: '2026-11-12',
      title: T('시즌 3', 'Season 3', 'シーズン3', '第 3 赛季', '第 3 賽季'),
      summary: T(
        '개발자가 Steam 답글에서 시즌 3을 11월 12일(목)로 앞당겼다고 밝혔고, PCGamesN도 이 날짜를 보도했습니다. Steam 공지나 X 게시물로 나온 공식 발표는 아직 없습니다. 10월 26일 주로 예고됐던 "시즌 2 회고·시즌 3 미리보기" 개발 영상은 정보를 확실히 정한 뒤 내겠다며 다시 미뤄졌고, 새 날짜는 없습니다.',
        'A developer said in a Steam reply that Season 3 has been brought forward to Thursday, November 12, and PCGamesN reports the same date. There’s no Steam announcement or X post yet. The “Season 2 Reflection & Season 3 Preview” dev vlog planned for the week of October 26 was pushed back again so the team can get the information right, with no new date.',
        '開発者がSteamの返信でシーズン3を11月12日（木）に前倒ししたと明かし、PCGamesNも同じ日付を報じています。Steamのお知らせやXでの正式発表はまだありません。10月26日の週に予定されていた「シーズン2の振り返り・シーズン3プレビュー」の開発動画は、情報を固めてから出すとして再び延期され、新しい日付は未定です。',
        '开发者在 Steam 回复中表示第 3 赛季已提前至 11 月 12 日（周四），PCGamesN 也报道了这一日期。Steam 公告或 X 尚未正式发布。原定 10 月 26 日当周发布的“第 2 赛季回顾与第 3 赛季前瞻”开发视频再次延期，团队表示要先把信息确定下来，新日期未定。',
        '開發者在 Steam 回覆中表示第 3 賽季已提前至 11 月 12 日（週四），PCGamesN 也報導了這個日期。Steam 公告或 X 尚未正式發布。原定 10 月 26 日當週發布的「第 2 賽季回顧與第 3 賽季前瞻」開發影片再次延期，團隊表示要先把資訊確定下來，新日期未定。'),
      impact: { some: false, text: T('바뀔 수치는 아직 발표되지 않았습니다.', 'No number changes announced yet.', '変わる数値はまだ発表されていません。', '尚未公布数值改动。', '尚未公布數值改動。') },
      items: [
        { cat: 'balance', text: T(
          '시즌 길이: 11월 12일이면 시즌 2는 4주 만에 끝납니다. 10월 24일 공식 팟캐스트 The Hotzone 1화에서 개발진은 시즌 2를 6~8주 대신 4~5주로 줄이고, 이후 시즌은 약 3개월에 중간 업데이트를 한 번 넣는 방향을 이야기했습니다.',
          'Season length: a November 12 start ends Season 2 after four weeks. On the first episode of the official podcast The Hotzone (October 24), the developers talked about cutting Season 2 to four or five weeks instead of six to eight, with later seasons running about three months and a smaller update midway.',
          'シーズンの長さ：11月12日開始ならシーズン2は4週間で終わります。10月24日の公式ポッドキャスト「The Hotzone」第1回で、開発陣はシーズン2を6〜8週間ではなく4〜5週間に縮め、以降のシーズンは約3か月で途中に小さな更新を1回入れる方向を話しました。',
          '赛季长度：若 11 月 12 日开始，第 2 赛季将在 4 周后结束。在 10 月 24 日官方播客 The Hotzone 第 1 集中，开发团队谈到将第 2 赛季从 6 至 8 周缩短为 4 至 5 周，之后的赛季约为 3 个月，并在中途推出一次较小的更新。',
          '賽季長度：若 11 月 12 日開始，第 2 賽季將在 4 週後結束。在 10 月 24 日官方 Podcast The Hotzone 第 1 集中，開發團隊談到將第 2 賽季從 6 至 8 週縮短為 4 至 5 週，之後的賽季約為 3 個月，並在中途推出一次較小的更新。') },
        { cat: 'balance', text: T(
          '경제 초기화: 시즌 3과 함께 경제가 다시 초기화된다고 보도됐습니다.',
          'Economy reset: Season 3 is reported to bring a fresh economy reset.',
          '経済のリセット：シーズン3とともに経済が再びリセットされると報じられています。',
          '经济重置：据报道，第 3 赛季将再次重置经济。',
          '經濟重置：據報導，第 3 賽季將再次重置經濟。') },
        { cat: 'balance', text: T(
          '골드 스킨: 시즌 2가 짧아진 만큼 골드 스킨을 얻을 수 있는 기간을 늘릴 계획이라고 보도됐습니다.',
          'Gold skins: with Season 2 cut short, Bulkhead reportedly plans to extend how long gold skins stay available.',
          'ゴールドスキン：シーズン2が短くなった分、ゴールドスキンを入手できる期間を延ばす予定だと報じられています。',
          '金色皮肤：由于第 2 赛季缩短，据报道 Bulkhead 计划延长金色皮肤的获取时间。',
          '金色外觀：由於第 2 賽季縮短，據報導 Bulkhead 計畫延長金色外觀的取得時間。') },
        { cat: 'ui', text: T(
          'Limited Mode: 파워 웨폰과 차량이 없는 Limited Mode 서버가 시즌 3과 함께 나올 것으로 보도됐고, 팟캐스트에서는 적외선 장비도 Limited Mode에는 넣지 않는다고 했습니다.',
          'Limited Mode: servers with no power weapons or vehicles are reported to arrive with Season 3, and the podcast said infrared gear won’t be in Limited Mode either.',
          'Limited Mode：パワーウェポンと車両のないLimited Modeサーバーがシーズン3とともに登場すると報じられ、ポッドキャストでは赤外線装備もLimited Modeには入れないと話しました。',
          'Limited Mode：据报道，没有强力武器与载具的 Limited Mode 服务器将随第 3 赛季推出；播客中也表示 Limited Mode 不会加入红外装备。',
          'Limited Mode：據報導，沒有強力武器與載具的 Limited Mode 伺服器將隨第 3 賽季推出；Podcast 中也表示 Limited Mode 不會加入紅外線裝備。') },
        { cat: 'gameplay', text: T(
          '적외선 거리측정기(열화상): 시즌 3에서 어떻게 할지는 정하지 않았습니다. 팟캐스트에서 다시 빼자는 의견, 저격수용으로 남기자는 의견, 수풀에 가려지게 고치자는 의견이 함께 나왔고, 개발진은 확정된 이야기가 아니라고 했습니다.',
          'IR rangefinder (thermals): nothing is decided for Season 3. On the podcast, one developer suggested pulling it again, others wanted to keep it for snipers, and another floated a rework such as foliage blocking it; the team stressed none of it is final.',
          '赤外線レンジファインダー（サーマル）：シーズン3でどうするかは決まっていません。ポッドキャストでは再び外す案、スナイパー用に残す案、草木で遮られるよう作り直す案が出ており、開発陣は確定ではないとしています。',
          '红外测距仪（热成像）：第 3 赛季如何处理尚未决定。播客中有人提议再次移除，有人希望为狙击手保留，也有人提出改为可被植被遮挡等重做方案；开发团队强调均未定案。',
          '紅外線測距儀（熱成像）：第 3 賽季如何處理尚未決定。Podcast 中有人提議再次移除，有人希望為狙擊手保留，也有人提出改為可被植被遮擋等重做方案；開發團隊強調皆未定案。') }
      ],
      sources: [
        { site: 'X @WARDOGS · 10/17', url: 'https://x.com/WARDOGS/status/2111412655726489872' },
        { site: 'X @WARDOGS · 10/23', url: 'https://x.com/WARDOGS/status/2113646629907538020' },
        { site: 'PCGamesN', url: 'https://www.pcgamesn.com/wardogs/season-2-developer-thoughts' },
        { site: 'PCGamesN · 10/30', url: 'https://www.pcgamesn.com/wardogs/season-3-preview-vlog-delayed' },
        { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/news/wardogs-season-3-12-november-hot-zone-podcast/' },
        { site: 'gitm.gg · Season 2 length', url: 'https://gitm.gg/guides/wardogs-season-02-end/' },
        { site: 'gitm.gg · thermals', url: 'https://gitm.gg/guides/wardogs-ir-range-finder-removed/' },
        { site: 'DCInside', url: 'https://gall.dcinside.com/mgallery/board/view/?id=wardogs&no=45541' }
      ]
    },

    list: [
      {
        id: 'region-lock-2026-10-21', date: '2026-10-21', type: 'hotfix', version: null,
        title: T('핑 상한 175ms와 지역 제한 시작', '175 ms ping cap and region locking begin', 'ping上限175msと地域制限の開始', '延迟上限 175 ms 与区域限制启动', '延遲上限 175 ms 與區域限制啟動'),
        summary: T(
          '치트가 많은 지역에서 들어오는 플레이어를 막기 위해 공식 서버의 최대 핑을 175ms로 낮추고 지역 제한을 시작했습니다. 서버 쪽 변경이라 내려받을 패치는 없고, 몇 시간에 걸쳐 적용됐습니다. 전날에는 차량 비행 버그 악용자를 영구 정지하겠다는 공지가 나왔습니다.',
          'To keep out players from regions more prone to cheating, official servers’ maximum ping drops to 175 ms and region locking begins. It’s a server-side change with nothing to download, rolled out over a few hours. The day before, Bulkhead warned it will permanently ban players abusing a vehicle flying bug.',
          'チートの多い地域からのプレイヤーを防ぐため、公式サーバーの最大pingを175msに下げ、地域制限を始めました。サーバー側の変更なのでダウンロードはなく、数時間かけて適用されました。前日には車両で飛ぶバグの悪用者を永久停止するという告知が出ました。',
          '为挡住作弊较多地区的玩家，官方服务器最高延迟降至 175 ms，并开始区域限制。这是服务器端改动，无需下载，在数小时内陆续生效。前一天还发布公告，滥用载具飞行漏洞的玩家将被永久封禁。',
          '為擋住作弊較多地區的玩家，官方伺服器最高延遲降至 175 ms，並開始區域限制。這是伺服器端改動，無需下載，在數小時內陸續生效。前一天還發布公告，濫用載具飛行漏洞的玩家將被永久停權。'),
        downtime: T('없음 · 몇 시간에 걸쳐 적용', 'None · rolled out over a few hours', 'なし・数時間かけて適用', '无 · 数小时内陆续生效', '無 · 數小時內陸續生效'),
        impact: { some: false, text: NO_CHANGE },
        items: [
          { cat: 'fair', text: T(
            '공식 서버의 최대 핑을 175ms로 낮췄습니다. Bulkhead는 치트가 많은 지역에서 몰려드는 플레이어로부터 가장 많은 플레이어를 지키려는 조치라고 설명했습니다.',
            'Official servers’ maximum ping is now 175 ms. Bulkhead says it’s meant to protect the most players from an influx from regions more prone to cheating.',
            '公式サーバーの最大pingを175msに下げました。Bulkheadは、チートの多い地域から流れ込むプレイヤーから、できるだけ多くのプレイヤーを守るための措置だと説明しています。',
            '官方服务器的最高延迟降至 175 ms。Bulkhead 表示，此举是为了让大多数玩家免受作弊较多地区涌入玩家的影响。',
            '官方伺服器的最高延遲降至 175 ms。Bulkhead 表示，此舉是為了讓大多數玩家免受作弊較多地區湧入玩家的影響。') },
          { cat: 'fair', text: T(
            '지역 제한은 백엔드에서 진행 중이며 효과가 나타나기까지 시간이 걸립니다. 대상 지역이나 완료 시점은 밝히지 않았습니다. CEO Joe Brammer는 VPN 같은 요인 때문에 실제 위치를 가려내기 어렵다며, 일부 플레이어가 불편을 겪더라도 다수를 지키기 위한 임시 조치라고 말했습니다.',
            'Region locking is rolling out on the backend and will take time to show an effect; no region list or completion date was given. CEO Joe Brammer said VPNs and other factors make players’ real locations hard to pin down, calling this a temporary measure that harms a share of players to protect the larger group.',
            '地域制限はバックエンドで進めており、効果が出るまで時間がかかります。対象地域や完了時期は示されていません。CEOのJoe Brammerは、VPNなどで実際の居場所を特定しにくいとし、一部のプレイヤーに不便をかけてでも大多数を守るための一時的な措置だと述べました。',
            '区域限制正在后端推进，需要一段时间才会见效，尚未公布涉及地区或完成时间。CEO Joe Brammer 表示，VPN 等因素让玩家真实位置难以判断，这是为保护多数玩家而牺牲一部分玩家的临时措施。',
            '區域限制正在後端推進，需要一段時間才會見效，尚未公布涉及地區或完成時間。CEO Joe Brammer 表示，VPN 等因素讓玩家真實位置難以判斷，這是為保護多數玩家而犧牲一部分玩家的臨時措施。') },
          { cat: 'fair', text: T(
            '10월 20일 공지: 지상 차량으로 맵 위를 "날아다니는" 버그를 악용하는 플레이어가 있어 서버 쪽 수정을 준비하고 있으며, 그동안 악용하다 걸리면 영구 정지합니다. 수정이 적용됐는지는 아직 확인되지 않았습니다.',
            'October 20 notice: some players are abusing a bug that lets ground vehicles “fly” around the map. A server-side fix is in the works, and anyone caught abusing it meanwhile will be permanently banned. The fix hasn’t been confirmed live yet.',
            '10月20日の告知：地上車両でマップ上を「飛び回る」バグを悪用するプレイヤーがいるため、サーバー側の修正を準備中です。それまで悪用が見つかったプレイヤーは永久停止になります。修正の適用はまだ確認されていません。',
            '10 月 20 日公告：有玩家利用让地面载具在地图上“飞行”的漏洞。服务器端修复正在制作中，在此期间被发现滥用者将被永久封禁。修复是否已上线尚未确认。',
            '10 月 20 日公告：有玩家利用讓地面載具在地圖上「飛行」的漏洞。伺服器端修復正在製作中，在此期間被發現濫用者將被永久停權。修復是否已上線尚未確認。') }
        ],
        sources: [
          { site: 'X @WARDOGS', url: 'https://x.com/WARDOGS/status/2112984169735139816' },
          { site: 'X @WARDOGSUpdates', url: 'https://x.com/WARDOGSUpdates/status/2112543533856927879' },
          { site: 'GamingBolt', url: 'https://gamingbolt.com/wardogs-starts-region-locking-to-curtail-cheaters-studio-boss-says-its-not-a-permanent-solution' },
          { site: 'GameWatcher', url: 'https://www.gamewatcher.com/wardogs-begins-region-locking-to-combat-cheaters-as-season-3-could-arrive-early' },
          { site: 'Last Word on Gaming', url: 'https://lastwordongaming.com/2026/10/22/wardogs-region-locking-players/' },
          { site: 'GameRiv', url: 'https://gameriv.com/wardogs-developers-introduce-175ms-ping-cap-and-region-locking-to-fight-cheating/' }
        ]
      },

      {
        id: 'backend-2026-10-15', date: '2026-10-15', type: 'hotfix', version: null,
        title: T('Lonestar 보너스 철회와 운전병 악용 수정', 'Lonestar bonus pulled and Driver exploit fixed', 'Lonestarボーナスの撤回とドライバー悪用の修正', '撤回 Lonestar 奖励并修复驾驶员漏洞', '撤回 Lonestar 獎勵並修復駕駛員漏洞'),
        summary: T(
          '시즌 2 첫날 나온 서버 쪽(백엔드) 업데이트. Lonestar 승리 보너스를 없애고 운전병 진행도 악용을 막았으며, 각 서버가 다음에 재시작될 때 적용됩니다. 10월 17일에는 시즌 3을 앞당기겠다는 공지가 이어졌습니다.',
          'A server-side (backend) update on Season 2’s first day. It removes the Lonestar win bonus and closes a Driver progression exploit, taking effect as each server next restarts. An October 17 announcement followed, saying Season 3 may come early.',
          'シーズン2初日に出たサーバー側（バックエンド）のアップデート。Lonestarの勝利ボーナスをなくし、ドライバー進行度の悪用を防ぎました。各サーバーの次回再起動時に適用されます。10月17日にはシーズン3を前倒しするという告知が続きました。',
          '第 2 赛季首日推出的服务器端（后端）更新。取消 Lonestar 获胜奖励并堵住驾驶员进度漏洞，各服务器下次重启时生效。10 月 17 日又发布公告，表示可能提前推出第 3 赛季。',
          '第 2 賽季首日推出的伺服器端（後端）更新。取消 Lonestar 獲勝獎勵並堵住駕駛員進度漏洞，各伺服器下次重啟時生效。10 月 17 日又發布公告，表示可能提前推出第 3 賽季。'),
        downtime: T('없음 · 서버 재시작 때 적용', 'None · applied as servers restart', 'なし・サーバー再起動時に適用', '无 · 服务器重启时生效', '無 · 伺服器重啟時生效'),
        impact: { some: false, text: NO_CHANGE },
        items: [
          { cat: 'balance', text: T(
            '시즌 2와 함께 넣었던 Lonestar(파란 팀) 승리 현금·XP 보너스를 하루 만에 없앴습니다. 실력 있는 플레이어들이 곧바로 Lonestar로 몰려 Lonestar가 대부분의 경기를 이겼기 때문입니다.',
            'The Lonestar (Blue team) win cash and XP bonus added with Season 2 is gone after a day. The most competitive players moved to Lonestar right away, and it started winning most games.',
            'シーズン2と同時に入れたLonestar（青チーム）の勝利時のお金・XPボーナスを1日で廃止しました。腕の立つプレイヤーがすぐLonestarに集まり、Lonestarがほとんどの試合に勝つようになったためです。',
            '随第 2 赛季加入的 Lonestar（蓝队）获胜现金与 XP 奖励在一天后取消。高水平玩家立刻涌向 Lonestar，使其赢下了大部分对局。',
            '隨第 2 賽季加入的 Lonestar（藍隊）獲勝現金與 XP 獎勵在一天後取消。高水準玩家立刻湧向 Lonestar，使其贏下了大部分對局。') },
          { cat: 'fair', text: T(
            '운전병 진행도를 고치고, 근처에 전진 기지를 두고 빠르게 왕복해 운전병 XP를 올려 전차를 일찍 여는 악용을 막았습니다. 심하게 악용한 플레이어(1,000명 미만으로 추산)는 24시간 정지와 함께 현금·XP가 초기화됩니다.',
            'Driver progression is fixed, closing an exploit where players ran quick round trips to a nearby forward base to farm Driver XP and unlock tanks early. Heavy abusers (estimated at under 1,000 players) get a 24-hour ban and have their cash and XP wiped.',
            'ドライバー進行度を修正し、近くに前進基地を置いて素早く往復しドライバーXPを稼いで戦車を早く解放する悪用を防ぎました。悪質に利用したプレイヤー（1,000人未満と推定）は24時間の停止に加え、お金とXPがリセットされます。',
            '修复驾驶员进度，堵住在附近设置前进基地快速往返刷驾驶员 XP、提早解锁坦克的漏洞。严重滥用的玩家（估计不到 1,000 人）将被封禁 24 小时，现金与 XP 也会清零。',
            '修正駕駛員進度，堵住在附近設置前進基地快速往返刷駕駛員 XP、提早解鎖坦克的漏洞。嚴重濫用的玩家（估計不到 1,000 人）將被停權 24 小時，現金與 XP 也會歸零。') },
          { cat: 'ui', text: T(
            '예고: 파워 웨폰과 차량이 없는 Limited Mode 서버가 지금의 저레벨 서버를 대신할 예정입니다. 출시일은 아직 없습니다.',
            'Coming: Limited Mode servers with no power weapons or vehicles will replace the current low-level servers. No date yet.',
            '予告：パワーウェポンと車両のないLimited Modeサーバーが、今の低レベルサーバーに代わる予定です。時期は未定です。',
            '预告：没有强力武器与载具的 Limited Mode 服务器将取代现有的低等级服务器，尚无上线日期。',
            '預告：沒有強力武器與載具的 Limited Mode 伺服器將取代現有的低等級伺服器，尚無上線日期。') },
          { cat: 'balance', text: T(
            '10월 17일 공지: Bulkhead는 시즌 2의 빠른 진행 속도가 잘못된 판단이었다고 인정했습니다. 며칠 만에 Level 4 방어구와 주력 전차 같은 최종 장비에 닿는 플레이어가 나왔기 때문입니다. 이미 진행 중인 플레이어에게 불공평하다며 시즌 2를 다시 초기화하지는 않고, 대신 시즌 3과 일부 콘텐츠를 크게 앞당기는 방안을 검토합니다. 자세한 계획은 개발 영상에서 밝히기로 했고, 10월 23일 공지로 "시즌 2 회고·시즌 3 미리보기" 영상이 10월 26일 주로 미뤄졌습니다. 10월 30일에는 커뮤니티 매니저가 이번 주에도 영상이 없다며 다시 미뤘습니다.',
            'October 17 announcement: Bulkhead admitted Season 2’s faster progression was the wrong call, since some players reached end-game gear like Level 4 armor and main battle tanks within days. It won’t re-wipe Season 2, calling that unfair on players already climbing, and is instead looking at bringing Season 3 and some of its content significantly forward. The plan comes in a dev vlog, and an October 23 post moved that “Season 2 Reflection & Season 3 Preview” vlog to the week of October 26. On October 30 the community manager said there would be no video that week either.',
            '10月17日の告知：Bulkheadはシーズン2の速い進行ペースが誤った判断だったと認めました。数日でLevel 4防具や主力戦車といった終盤の装備に届くプレイヤーが出たためです。すでに進めているプレイヤーに不公平だとしてシーズン2の再リセットは行わず、代わりにシーズン3と一部のコンテンツを大きく前倒しする方向で検討しています。詳しい計画は開発動画で説明する予定で、10月23日の告知で「シーズン2の振り返り・シーズン3プレビュー」動画は10月26日の週に延期されました。10月30日にはコミュニティマネージャーが今週も動画は出ないとして再び延期しました。',
            '10 月 17 日公告：Bulkhead 承认第 2 赛季加快进度是错误决定，因为有玩家几天内就拿到 Level 4 护甲与主战坦克等终局装备。考虑到对已在推进的玩家不公平，第 2 赛季不会再次重置，改为考虑大幅提前推出第 3 赛季及部分内容。详细计划将在开发视频中公布；10 月 23 日的公告将这支“第 2 赛季回顾与第 3 赛季前瞻”视频延后到 10 月 26 日当周。10 月 30 日社区经理表示本周也不会发布视频，再次延期。',
            '10 月 17 日公告：Bulkhead 承認第 2 賽季加快進度是錯誤決定，因為有玩家幾天內就拿到 Level 4 護甲與主力戰車等終局裝備。考量到對已在推進的玩家不公平，第 2 賽季不會再次重置，改為考慮大幅提前推出第 3 賽季及部分內容。詳細計畫將在開發影片中公布；10 月 23 日的公告將這支「第 2 賽季回顧與第 3 賽季前瞻」影片延後到 10 月 26 日當週。10 月 30 日社群經理表示本週也不會發布影片，再次延期。') }
        ],
        sources: [
          { site: 'X @WARDOGS', url: 'https://x.com/WARDOGS/status/2111412655726489872' },
          { site: 'X @WARDOGS · 10/23', url: 'https://x.com/WARDOGS/status/2113646629907538020' },
          { site: 'PC Gamer', url: 'https://www.pcgamer.com/games/fps/we-f-ked-up-1-day-into-wardogs-season-2-the-blue-team-bribery-bonus-is-being-dropped/' },
          { site: 'PCGamesN', url: 'https://www.pcgamesn.com/wardogs/season-2-mistakes-bulkhead-apology' },
          { site: 'PCGamesN · 10/30', url: 'https://www.pcgamesn.com/wardogs/season-3-preview-vlog-delayed' },
          { site: 'DualShockers', url: 'https://www.dualshockers.com/wardogs-admits-defeat-over-season-2-changes/' },
          { site: 'GameFragger', url: 'https://gamefragger.com/pc/first-person-shooter/wardogs-developer-admits-it-messed-up-season-2-and-pulls-the-blue-team-bonus-after-less-than-a-day-a29879' },
          { site: 'gamerheadlines', url: 'https://gamerheadlines.com/wardogs-season-2-progression-wrong-call-season-3/' },
          { site: 'timesaver.gg', url: 'https://timesaver.gg/blog/wardogs-blue-team-lonestar-bonus-removed-season-2' },
          { site: 'PCGamesN · Season 3', url: 'https://www.pcgamesn.com/wardogs/season-3-early-start' },
          { site: 'VICE', url: 'https://www.vice.com/en/article/wardogs-developer-responds-to-season-2-backlash/' }
        ]
      },

      {
        id: 'season-2', date: '2026-10-15', type: 'season', version: '0.2',
        title: T('시즌 2 · 업데이트 0.2', 'Season 2 · Update 0.2', 'シーズン2・アップデート0.2', '第 2 赛季 · 更新 0.2', '第 2 賽季 · 更新 0.2'),
        summary: T(
          '10월 14일 Steam에 정식 패치노트가 올라왔고, 10월 15일 점검이 끝나면 시작됩니다. 첫 진행도 초기화와 함께 무기·방어구 밸런스, 새 무기·차량·건축물, 비 날씨가 들어옵니다.',
          'Full patch notes went up on Steam on October 14, and the season starts after maintenance on October 15. Alongside the first progression wipe come weapon and armor balance, new weapons, vehicles and buildables, and rain.',
          '10月14日にSteamで正式なパッチノートが公開され、10月15日のメンテナンス後に開始します。初の進行度リセットとともに、武器・防具のバランス調整、新しい武器・車両・建築物、雨の天候が追加されます。',
          '10 月 14 日 Steam 发布了完整更新日志，10 月 15 日维护结束后开始。随首次进度重置一同到来的有武器与护甲平衡调整、新武器、载具与建筑，以及雨天天气。',
          '10 月 14 日 Steam 發布了完整更新日誌，10 月 15 日維護結束後開始。隨首次進度重置一同到來的有武器與護甲平衡調整、新武器、載具與建築，以及雨天天氣。'),
        downtime: T('10월 15일 08:00–09:30 UTC (약 90분)', 'Oct 15, 08:00–09:30 UTC (about 90 min)', '10月15日 08:00〜09:30 UTC（約90分）', '10 月 15 日 08:00–09:30 UTC（约 90 分钟）', '10 月 15 日 08:00–09:30 UTC（約 90 分鐘）'),
        impact: { some: true, text: T(
          '데미지 탭에 시즌 2 수치를 반영했습니다: 고구경 탄 피해 감소, Level 3·4 방어구 감소율 하향, 무기 종류별 부위 배율, 새 무기 4종. 부위 배율과 새 무기의 연사 속도·무게는 커뮤니티 데이터베이스 값입니다.',
          'Season 2 numbers are in the Damage tab: high-caliber damage cuts, lower Level 3 and 4 armor reduction, class hit-location multipliers and four new weapons. The multipliers and the new weapons’ fire rate and weight come from community databases.',
          'ダメージタブにシーズン2の数値を反映しました：高口径弾のダメージ減少、Level 3・4防具の軽減率引き下げ、武器種別の部位倍率、新武器4種。部位倍率と新武器の連射速度・重量はコミュニティのデータベースの値です。',
          '伤害页已更新为第 2 赛季数值：高口径弹药伤害削减、Level 3 与 4 护甲减伤下调、各武器类别部位倍率、4 把新武器。部位倍率与新武器的射速、重量来自社区数据库。',
          '傷害頁已更新為第 2 賽季數值：高口徑彈藥傷害削減、Level 3 與 4 護甲減傷下調、各武器類別部位倍率、4 把新武器。部位倍率與新武器的射速、重量來自社群資料庫。') },
        items: [
          { cat: 'balance', lab: 'matrix', text: T(
            '고구경 탄 기본 피해 감소: .308 −25%(60→45), 7.62×54R −20%(55→44), 7.62×39 −19%(42→34), .50 −16%(107→90). 저격소총은 부위별 피해 배율을 올려 보완하며, 정찰 소총은 헬멧 없는 머리를 한 발에, Level 1 헬멧을 쓴 머리는 두 발에 처치합니다.',
            'High-caliber base damage cuts: .308 −25% (60→45), 7.62×54R −20% (55→44), 7.62×39 −19% (42→34), .50 −16% (107→90). Sniper rifles get higher hit-location multipliers to compensate; the Scout Rifle now one-shots an unhelmeted head and kills through a Level 1 helmet in two.',
            '高口径弾の基礎ダメージ減少：.308 −25%（60→45）、7.62×54R −20%（55→44）、7.62×39 −19%（42→34）、.50 −16%（107→90）。スナイパーライフルは部位倍率を上げて補い、スカウトライフルはヘルメットなしの頭を1発、Level 1ヘルメットなら2発で倒します。',
            '高口径弹药基础伤害削减：.308 −25%（60→45）、7.62×54R −20%（55→44）、7.62×39 −19%（42→34）、.50 −16%（107→90）。狙击步枪提高部位倍率作为补偿，侦察步枪可一枪击杀无头盔目标的头部，戴 Level 1 头盔则需两枪。',
            '高口徑彈藥基礎傷害削減：.308 −25%（60→45）、7.62×54R −20%（55→44）、7.62×39 −19%（42→34）、.50 −16%（107→90）。狙擊步槍提高部位倍率作為補償，偵察步槍可一槍擊殺無頭盔目標的頭部，戴 Level 1 頭盔則需兩槍。') },
          { cat: 'balance', lab: 'formula', text: T(
            '부위 배율 조정: 지정사수소총은 머리와 상체 피해가 조금 약해져 돌격소총과 저격소총 사이에 놓이고, 돌격소총과 경기관총은 몸통 피해가 더 고르게 들어갑니다. 경기관총은 몸통 피해를 돌격소총에 가깝게 맞추고 탄창 크기와 지속 사격으로 차별화합니다. 공식 배율은 공개되지 않아 데미지 탭에는 커뮤니티 데이터베이스 값(돌격소총·경기관총 몸통 ×0.97, 지정사수 몸통 ×1.18)을 넣었습니다.',
            'Hit-location tuning: DMR head and upper-body hits are slightly weaker, placing them between assault rifles and snipers, while assault rifles and LMGs get more consistent body damage. LMG body damage moves closer to assault rifles, leaving magazine size and sustained fire as their edge. Official multipliers weren’t published, so the Damage tab uses community database values (×0.97 to the body for assault rifles and LMGs, ×1.18 for DMRs).',
            '部位倍率の調整：マークスマンライフルは頭と上半身へのダメージが少し弱まり、アサルトライフルとスナイパーライフルの中間に位置づけられます。アサルトライフルと軽機関銃は胴体へのダメージが安定します。軽機関銃の胴体ダメージはアサルトライフルに近づき、マガジン容量と持続射撃で差をつけます。公式の倍率は公開されていないため、ダメージタブにはコミュニティのデータベースの値（アサルトライフル・軽機関銃の胴体 ×0.97、マークスマンの胴体 ×1.18）を入れました。',
            '部位倍率调整：精确射手步枪的头部与上半身伤害略微降低，定位介于突击步枪与狙击步枪之间；突击步枪与轻机枪的躯干伤害更稳定。轻机枪躯干伤害向突击步枪靠拢，以弹匣容量与持续火力作为区别。官方倍率尚未公开，伤害页采用社区数据库数值（突击步枪与轻机枪躯干 ×0.97，精确射手步枪躯干 ×1.18）。',
            '部位倍率調整：精確射手步槍的頭部與上半身傷害略微降低，定位介於突擊步槍與狙擊步槍之間；突擊步槍與輕機槍的軀幹傷害更穩定。輕機槍軀幹傷害向突擊步槍靠攏，以彈匣容量與持續火力作為區別。官方倍率尚未公開，傷害頁採用社群資料庫數值（突擊步槍與輕機槍軀幹 ×0.97，精確射手步槍軀幹 ×1.18）。') },
          { cat: 'balance', lab: 'armor', text: T(
            '방어구 감소율 하향: Level 3 갑옷·헬멧 55%→50%, Level 4 65%→60%. Level 3·4 헬멧은 제압 저항이 높아지고, Level 4 헬멧은 소리와 근접 음성 채팅이 먹먹해지며 시야가 좁아지고 질주할 때 김이 서립니다.',
            'Lower armor reduction: Level 3 armor and helmets 55%→50%, Level 4 65%→60%. Level 3 and 4 helmets get more suppression resistance, while the Level 4 helmet muffles audio and proximity chat, narrows your view and fogs up while sprinting.',
            '防具の軽減率引き下げ：Level 3のアーマー・ヘルメット55%→50%、Level 4は65%→60%。Level 3・4ヘルメットは制圧耐性が上がり、Level 4ヘルメットは音と近接ボイスチャットがこもり、視界が狭まり、ダッシュ中に曇ります。',
            '护甲减伤下调：Level 3 护甲与头盔 55%→50%，Level 4 65%→60%。Level 3 与 4 头盔的抗压制能力提高，Level 4 头盔会使声音与近距离语音发闷、视野变窄，冲刺时起雾。',
            '護甲減傷下調：Level 3 護甲與頭盔 55%→50%，Level 4 65%→60%。Level 3 與 4 頭盔的抗壓制能力提高，Level 4 頭盔會使聲音與近距離語音發悶、視野變窄，衝刺時起霧。') },
          { cat: 'balance', text: T(
            '첫 진행도 초기화: 시즌 레벨·진행도·현금이 리셋되고, 남은 현금은 골드바로 바뀝니다. 지금까지 쌓은 XP는 앞으로 나올 시스템을 위해 따로 보관됩니다.',
            'The first progression wipe: seasonal levels, progression and cash reset, and leftover cash converts to Gold Bars. All XP earned so far is banked for future systems.',
            '初の進行度リセット：シーズンのレベル・進行度・お金がリセットされ、残ったお金はゴールドバーに変わります。これまでに得たXPは今後のシステムのために保管されます。',
            '首次进度重置：赛季等级、进度与现金清零，剩余现金转换为金条。至今累积的 XP 会保留给日后的系统使用。',
            '首次進度重置：賽季等級、進度與現金歸零，剩餘現金轉換為金條。至今累積的 XP 會保留給日後的系統使用。') },
          { cat: 'balance', text: T(
            '레벨업이 크게 빨라지고 주요 장비가 더 일찍 열립니다. 대신 강한 장비와 차량은 비싸졌습니다(아래 표).',
            'Leveling is much faster and key gear unlocks earlier, while stronger gear and vehicles cost more (tables below).',
            'レベルアップが大幅に速くなり、主要装備が早く解放されます。その代わり強力な装備や車両は高くなりました（下の表）。',
            '升级大幅加快，主要装备更早解锁；相对地，强力装备与载具变贵了（见下表）。',
            '升級大幅加快，主要裝備更早解鎖；相對地，強力裝備與載具變貴了（見下表）。') },
          { cat: 'balance', text: T(
            'Lonestar 진영 실험: 시즌 2 동안 Lonestar는 승리 현금·XP 보너스와 팀플레이 배율을 받습니다. 한 팀이 10점 넘게 앞서면 합류 후 15분 동안 팀을 바꿀 수 없고, 2위에 40점 이상 뒤진 꼴찌 팀은 판매상 20% 할인을 받습니다.',
            'Faction balance experiment: Lonestar gets cash and XP win bonuses and teamplay multipliers for Season 2. Once a team leads by more than 10 points you can’t switch for 15 minutes after joining, and a last-place team 40+ points behind second gets 20% off at vendors.',
            '陣営バランスの実験：シーズン2の間、Lonestarは勝利時のお金・XPボーナスとチームプレイ倍率を得ます。あるチームが10点を超えてリードすると参加後15分間はチームを変えられず、2位に40点以上離された最下位チームは販売所で20%割引になります。',
            '阵营平衡实验：第 2 赛季期间 Lonestar 获胜可获得现金与 XP 奖励及团队配合倍率。某队领先超过 10 分时，加入后 15 分钟内无法换队；落后第二名 40 分以上的垫底队伍在商人处享 8 折。',
            '陣營平衡實驗：第 2 賽季期間 Lonestar 獲勝可獲得現金與 XP 獎勵及團隊配合倍率。某隊領先超過 10 分時，加入後 15 分鐘內無法換隊；落後第二名 40 分以上的墊底隊伍在商人處享 8 折。') },
          { cat: 'balance', text: T(
            '내기 판매상은 시즌 2 시작 때는 열리지 않고 시즌 중에 추가됩니다.',
            'The Wager Vendor won’t be there at launch; it opens later in Season 2.',
            '賭けの販売所はシーズン2開始時にはなく、シーズン中に追加されます。',
            '下注商人不会在第 2 赛季上线时开放，会在赛季中加入。',
            '下注商人不會在第 2 賽季上線時開放，會在賽季中加入。') },
          { cat: 'balance', text: T(
            'IR 거리 측정기가 배터리 방식으로 돌아옵니다. 배터리 하나로 약 80초 쓸 수 있습니다. Havoc 파괴 보상은 $18,000에서 $14,000으로 줄었습니다.',
            'The IR Rangefinder returns on batteries, about 80 s of use per battery. The reward for destroying a Havoc drops from $18,000 to $14,000.',
            'IRレンジファインダーがバッテリー式で復活し、1個で約80秒使えます。Havoc撃破の報酬は$18,000から$14,000に下がりました。',
            'IR 测距仪改为电池供电回归，每块电池约可使用 80 秒。击毁 Havoc 的奖励从 $18,000 降至 $14,000。',
            'IR 測距儀改為電池供電回歸，每顆電池約可使用 80 秒。擊毀 Havoc 的獎勵從 $18,000 降至 $14,000。') },
          { cat: 'gameplay', lab: 'weapons', text: T(
            '새 무기 4종: TCX-SPR 돌격소총(7.62×39, $3,200, Assault Lv20), PP-19 Bizon 기관단총(9×19, $1,000, Medic 기본), Evo-3 Ultra 경기관총(.308, $7,250, Support Lv30), M14 지정사수소총(.308, $7,400, Recon Lv25). 데미지 탭에는 같은 탄 기준 추정 피해로 넣었습니다.',
            'Four new weapons: the TCX-SPR assault rifle (7.62×39, $3,200, Assault 20), PP-19 Bizon SMG (9×19, $1,000, Medic default), Evo-3 Ultra LMG (.308, $7,250, Support 30) and M14 DMR (.308, $7,400, Recon 25). They’re in the Damage tab with damage estimated from the same round.',
            '新武器4種：TCX-SPRアサルトライフル（7.62×39、$3,200、Assault Lv20）、PP-19 Bizonサブマシンガン（9×19、$1,000、Medic初期）、Evo-3 Ultra軽機関銃（.308、$7,250、Support Lv30）、M14マークスマンライフル（.308、$7,400、Recon Lv25）。ダメージタブには同じ弾からの推定ダメージで追加しました。',
            '4 把新武器：TCX-SPR 突击步枪（7.62×39，$3,200，突击 20 级）、PP-19 Bizon 冲锋枪（9×19，$1,000，医疗兵默认）、Evo-3 Ultra 轻机枪（.308，$7,250，支援 30 级）、M14 精确射手步枪（.308，$7,400，侦察 25 级）。伤害页已按相同弹药推算伤害加入。',
            '4 把新武器：TCX-SPR 突擊步槍（7.62×39，$3,200，突擊 20 級）、PP-19 Bizon 衝鋒槍（9×19，$1,000，醫療兵預設）、Evo-3 Ultra 輕機槍（.308，$7,250，支援 30 級）、M14 精確射手步槍（.308，$7,400，偵察 25 級）。傷害頁已依相同彈藥推算傷害加入。') },
          { cat: 'gameplay', lab: 'explosives', text: T(
            '화염병 추가: 불로 지역을 막아 적 보병의 진입을 막습니다.',
            'Molotov cocktails, for denying areas to enemy infantry.',
            '火炎瓶が追加。炎でエリアを封じ、敵歩兵の侵入を防ぎます。',
            '新增燃烧瓶，用火封锁区域，阻止敌方步兵进入。',
            '新增燃燒瓶，用火封鎖區域，阻止敵方步兵進入。') },
          { cat: 'balance', lab: 'explosives', text: T(
            'MGL-40 하향: 유탄 속도가 25% 느려지고 폭발 가장자리의 피해 감소가 커졌습니다. 리틀버드 좌석에서 쏘면 탄 퍼짐·흔들림이 커지고 조준과 재장전이 느려지며, 해금 비용은 $200,000에서 $250,000으로 올랐습니다.',
            'MGL-40 nerf: 25% lower muzzle velocity and steeper damage falloff at the edge of the blast. Firing from a Little Bird bench adds inaccuracy and sway and slows ADS and reloads, and the unlock now costs $250,000 instead of $200,000.',
            'MGL-40の下方修正：弾速が25%低下し、爆発の外縁でのダメージ減衰が大きくなりました。リトルバードの座席から撃つと拡散と揺れが増え、ADSとリロードが遅くなります。解放費用は$200,000から$250,000に上がりました。',
            'MGL-40 削弱：榴弹初速降低 25%，爆炸外缘的伤害衰减更明显。从小鸟直升机座位射击时散布与晃动增加、开镜与换弹变慢；解锁费用由 $200,000 提高到 $250,000。',
            'MGL-40 削弱：榴彈初速降低 25%，爆炸外緣的傷害衰減更明顯。從小鳥直升機座位射擊時散布與晃動增加、開鏡與換彈變慢；解鎖費用由 $200,000 提高到 $250,000。') },
          { cat: 'gameplay', lab: 'vehicles', text: T(
            '새 차량 4종: Wolf-110($2,200), M2 브라우닝을 단 Wolf-110($7,800), T-72B3 전차($16,000), Flakpanzer Gepard 대공 차량($14,000).',
            'Four new vehicles: the Wolf-110 ($2,200), the Wolf-110 with an M2 Browning ($7,800), the T-72B3 tank ($16,000) and the Flakpanzer Gepard anti-air vehicle ($14,000).',
            '新車両4種：Wolf-110（$2,200）、M2ブローニング搭載のWolf-110（$7,800）、T-72B3戦車（$16,000）、Flakpanzer Gepard対空車両（$14,000）。',
            '4 款新载具：Wolf-110（$2,200）、装 M2 勃朗宁的 Wolf-110（$7,800）、T-72B3 坦克（$16,000）、Flakpanzer Gepard 防空车（$14,000）。',
            '4 款新載具：Wolf-110（$2,200）、裝 M2 白朗寧的 Wolf-110（$7,800）、T-72B3 坦克（$16,000）、Flakpanzer Gepard 防空車（$14,000）。') },
          { cat: 'gameplay', lab: 'structures', text: T(
            '새 건축물 3종: MG 진지(M2), 대형 대피소, 나무 발판. L81 박격포 건설 비용이 보급 150에서 600으로 오르고, 박격포와 Talon도 조정됐습니다.',
            'Three new buildables: an MG nest (M2), a large shelter and a wooden step. The L81 mortar now costs 600 supplies instead of 150, and mortars and Talons are adjusted.',
            '新建築物3種：MG陣地（M2）、大型シェルター、木製の足場。L81迫撃砲の建設コストは補給150から600に上がり、迫撃砲とTalonも調整されました。',
            '3 种新建筑：机枪阵地（M2）、大型掩体、木制踏板。L81 迫击炮建造成本从补给 150 提高到 600，迫击炮与 Talon 也有调整。',
            '3 種新建築：機槍陣地（M2）、大型掩體、木製踏板。L81 迫擊砲建造成本從補給 150 提高到 600，迫擊砲與 Talon 也有調整。') },
          { cat: 'gameplay', text: T(
            '비 날씨 추가: 천둥이 발소리를 가리고 시야와 교전 거리에 영향을 줍니다.',
            'A rain weather preset whose thunder masks footsteps and affects visibility and engagement range.',
            '雨の天候が追加。雷鳴が足音をかき消し、視界と交戦距離に影響します。',
            '新增雨天天气，雷声会掩盖脚步声，并影响视野与交战距离。',
            '新增雨天天氣，雷聲會掩蓋腳步聲，並影響視野與交戰距離。') },
          { cat: 'gameplay', lab: 'weight', text: T(
            '낙하산이 펴지는 데 더 오래 걸리고, 약 10 m 아래에서는 펴지지 않습니다.',
            'Parachutes take longer to open and won’t open below about 10 m.',
            'パラシュートは開くまでに時間がかかり、約10 m以下では開きません。',
            '降落伞开伞时间变长，约 10 米以下无法打开。',
            '降落傘開傘時間變長，約 10 公尺以下無法打開。') },
          { cat: 'fair', text: T(
            '팀킬 신고: 아군에게 죽으면 용서 또는 처벌을 고릅니다. 처벌이 쌓이면 강퇴되고, 반복하면 점점 긴 정지를 받습니다. 고르지 않고 부활해 안전 구역을 벗어나면 용서한 것으로 처리됩니다.',
            'Teamkill reports: when a teammate kills you, you choose Forgive or Punish. Punishments add up to kicks and then longer and longer bans for repeat offenders. If you respawn and leave the safe zone without choosing, the teamkill is forgiven.',
            'チームキルの報告：味方に倒されると「許す」か「罰する」を選びます。罰が積み重なるとキックされ、繰り返すと次第に長い停止処分を受けます。選ばずにリスポーンして安全地帯を出ると、許したものとして扱われます。',
            '误杀举报：被队友击杀后可选择原谅或惩罚。惩罚累积会被踢出，屡犯者将受到越来越长的封禁。若未选择就重生并离开安全区，则视为原谅。',
            '誤殺檢舉：被隊友擊殺後可選擇原諒或懲罰。懲罰累積會被踢出，屢犯者將受到越來越長的停權。若未選擇就重生並離開安全區，則視為原諒。') },
          { cat: 'ui', text: T(
            '공식 서버에 지역별 최대 핑 제한이 생겼습니다. 높은 핑이 계속될 때만 퇴장됩니다.',
            'Official servers now have region-based ping limits; you’re only kicked after sustained high ping.',
            '公式サーバーに地域別の最大ping制限が入りました。高いpingが続いた場合のみキックされます。',
            '官方服务器新增按地区的最高延迟限制，只有持续高延迟才会被踢出。',
            '官方伺服器新增依地區的最高延遲限制，只有持續高延遲才會被踢出。') },
          { cat: 'stability', text: T(
            '성능 최적화, 버그 수정, 서버 안정성 개선이 함께 들어갑니다.',
            'Further performance optimisation, bug fixes and server stability improvements.',
            'パフォーマンス最適化、不具合修正、サーバー安定性の改善も含まれます。',
            '同时包含性能优化、错误修复与服务器稳定性改进。',
            '同時包含效能最佳化、錯誤修正與伺服器穩定性改善。') }
        ],
        tables: [
          {
            cat: 'balance', title: T('레벨별 누적 XP', 'Cumulative XP by level', 'レベル別累計XP', '各等级累计 XP', '各等級累計 XP'),
            rows: [
              [T('레벨 10', 'Level 10', 'レベル10', '10 级', '10 級'), '35,000', '25,000'],
              [T('레벨 15', 'Level 15', 'レベル15', '15 级', '15 級'), '110,000', '54,750'],
              [T('레벨 20', 'Level 20', 'レベル20', '20 级', '20 級'), '250,000', '111,500'],
              [T('레벨 50', 'Level 50', 'レベル50', '50 级', '50 級'), '1,500,000', '1,150,000']
            ]
          },
          {
            cat: 'balance', title: T('해금 레벨', 'Unlock levels', '解放レベル', '解锁等级', '解鎖等級'),
            rows: [
              [T('의료 가방 (메딕)', 'Medical Bag (Medic)', 'メディカルバッグ（メディック）', '医疗包（医疗兵）', '醫療包（醫療兵）'), 'Lv24', 'Lv14'],
              [T('PKM (서포트)', 'PKM (Support)', 'PKM（サポート）', 'PKM（支援）', 'PKM（支援）'), 'Lv30', 'Lv15'],
              [T('CQB 74 브레이크', 'CQB 74 Brake', 'CQB 74ブレーキ', 'CQB 74 制退器', 'CQB 74 制退器'), 'Lv8', 'Lv16']
            ]
          },
          {
            cat: 'balance', title: T('가격', 'Prices', '価格', '价格', '價格'),
            rows: [
              [T('Level 4 헬멧', 'Level 4 helmet', 'Level 4ヘルメット', 'Level 4 头盔', 'Level 4 頭盔'), '$3,000', '$4,500'],
              [T('쌍안경', 'Binoculars', '双眼鏡', '望远镜', '望遠鏡'), '$75', '$180'],
              ['AK74', '$1,600', '$800'],
              [T('기본 낙하산', 'Basic Parachute', 'ベーシックパラシュート', '基础降落伞', '基礎降落傘'), '$100', '$500'],
              [T('스포츠 낙하산', 'Sport Parachute', 'スポーツパラシュート', '运动降落伞', '運動降落傘'), '$1,000', '$700'],
              [T('CQB 74 브레이크', 'CQB 74 Brake', 'CQB 74ブレーキ', 'CQB 74 制退器', 'CQB 74 制退器'), '$12,500', '$15,000'],
              ['L2A6', '$14,000', '$22,000'],
              [T('리틀버드 AH-6M (미니건)', 'Little Bird AH-6M (miniguns)', 'リトルバード AH-6M（ミニガン）', '小鸟 AH-6M（转管机枪）', '小鳥 AH-6M（轉管機槍）'), '$7,000', '$12,000'],
              [T('리틀버드 AH-6R (로켓)', 'Little Bird AH-6R (rockets)', 'リトルバード AH-6R（ロケット）', '小鸟 AH-6R（火箭）', '小鳥 AH-6R（火箭）'), '$12,500', '$18,800'],
              ['Ural Defender', '$6,000', '$7,200'],
              [T('L81 박격포 (보급)', 'L81 mortar (supplies)', 'L81迫撃砲（補給）', 'L81 迫击炮（补给）', 'L81 迫擊砲（補給）'), '150', '600']
            ]
          }
        ],
        sources: [
          { site: 'Steam', url: 'https://steamcommunity.com/games/1867240/announcements/detail/670630562731396446' },
          { site: 'Insider Gaming', url: 'https://insider-gaming.com/wardogs-patch-notes/' },
          { site: 'low.ms', url: 'https://low.ms/blog/wardogs-season-2-patch-notes' },
          { site: 'guided.news', url: 'https://guided.news/en/news/wardogs-season-2-update-grind-new-weapons-vehicles/' },
          { site: 'Screen Rant', url: 'https://screenrant.com/wardogs-season-2-new-weapons-vehicles-patch-notes/' },
          { site: 'theclick.gg', url: 'https://www.theclick.gg/wardogs-season-2-new-weapons/' },
          { site: 'WARDOGS Hub', url: 'https://wardogshub.gg/patch-notes/' },
          { site: 'Gfinity Esports', url: 'https://www.gfinityesports.com/article/wardogs-season-2-patch-notes' }
        ]
      },

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
        id: 'security-2026-09-25', date: '2026-09-25', type: 'hotfix', version: null,
        title: T('보안 업데이트 점검', 'Security update maintenance', 'セキュリティ更新のメンテナンス', '安全更新维护', '安全更新維護'),
        summary: T(
          '소수의 보안 업데이트를 배포하려고 11:00 UTC부터 서비스를 내린 점검. 11:42 UTC에 다시 열렸습니다.',
          'Services went offline from 11:00 UTC to deploy a small number of security updates and came back at 11:42 UTC.',
          '少数のセキュリティ更新を配信するため11:00 UTCからサービスを停止したメンテナンス。11:42 UTCに再開しました。',
          '为部署少量安全更新，服务自 11:00 UTC 起下线维护，11:42 UTC 恢复。',
          '為部署少量安全更新，服務自 11:00 UTC 起下線維護，11:42 UTC 恢復。'),
        downtime: T('11:00–11:42 UTC (약 40분)', '11:00–11:42 UTC (about 40 min)', '11:00〜11:42 UTC（約40分）', '11:00–11:42 UTC（约 40 分钟）', '11:00–11:42 UTC（約 40 分鐘）'),
        impact: { some: false, text: T('알려진 수치 변경 없음.', 'No known changes to numbers.', '数値の変更は確認されていません。', '未发现数值改动。', '未發現數值改動。') },
        items: [
          { cat: 'stability', text: T(
            '소수의 보안 업데이트를 배포했습니다. 패치 번호와 세부 내용은 공개되지 않았습니다.',
            'A small number of security updates were deployed. No patch number or details were published.',
            '少数のセキュリティ更新を配信しました。パッチ番号や詳しい内容は公開されていません。',
            '部署了少量安全更新，未公布补丁编号与详细内容。',
            '部署了少量安全更新，未公布更新檔編號與詳細內容。') }
        ],
        sources: [
          { site: 'X @WARDOGSUpdates', url: 'https://x.com/WARDOGSUpdates/status/2103432101781545416' },
          { site: 'X @WARDOGSUpdates · 11:42', url: 'https://x.com/WARDOGSUpdates/status/2103450008431313221' },
          { site: 'X @WARDOGS', url: 'https://x.com/WARDOGS/status/2103432678322156002' }
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
