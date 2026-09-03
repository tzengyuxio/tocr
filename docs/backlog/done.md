# 已完成

從 `BACKLOG.md` 封存出來的項目，依完成時間由新到舊。這裡只作紀錄，不再更新。

- [x] **`/games/<game>` 與 `/tags/<tag>` 的表格對齊**（2026-09-04） — 兩頁列的是同一種東西，
  表格卻各長各的：一邊把刊期併成一欄、一邊拆「雜誌」「單期」，頁碼只有 games 有。
  **整個表格抽成 `src/components/ArticleListTable.tsx` 兩頁共用**，而不是各修一次——各修
  一次只會再漂開一次。形狀取 games 那版（刊期併一欄，理由是它要回答「哪一本的哪一期」，
  拆開後左欄那個連到期刊首頁的連結幫不上忙），tags 補上頁碼欄，頁碼留在最後。

  排序改成點欄位標題（刊期序／出版日期序），走既有的 `searchParams` 模式、定義集中在
  `src/lib/article-listing.ts`：出版日期為預設且由新到舊，刊期序跨刊時先按刊名聚起來，
  沒有日期的期一律墊底。滑鼠移過刊期浮出封面——用 Popover 而不是純 CSS group-hover，
  因為表格容器是 `overflow-x-auto`，CSS 規範下 `overflow-y: visible` 會被算成 `auto`，
  浮出去的東西會被裁掉。細節見 [games-tags-table.md](games-tags-table.md)

- [x] **掃好的封面對不到站上的期次，補建 25 期**（2026-09-02 建完） — 電玩e世代 24 期
  （No.33–No.112，發行日取自封底右側資訊帶，逐本判讀）＋ 電腦玩家「即時戰爭遊戲特刊」1 期。
  用 `~/lab/nostalib-toolkit/scripts/tocr_create_issues.py` 打正式站，
  電玩e世代 14 → 38 期依發行日重排，電腦玩家的特刊插在第 86 期之後、其餘 216 期順序不動。
  回驗（`covers_vs_tocr.py`）：「站上沒有這一期」49 → 0、「可以上傳」95 → 144。
  同日也把這 25 期的封面（c1）傳上去了（`tocr_upload_covers.py`），封底 c4 的 24 張還沒傳。
  判讀依據與交叉驗證見 [covers-missing-issues.md](covers-missing-issues.md)（2026-09-02）

- [x] **`/api/issues` 的分頁會重複與漏列**（2026-09-02 補 tie-breaker） — `orderBy: { order: "asc" }`
  的 `Issue.order` 是每本刊各自從 0 起算的，全站掃描時大量並列；排序不是全序，offset 分頁就會讓
  同一列出現在兩頁、中間那列被跳過（實測 2306 筆裡 24 筆重複、同時漏掉 24 期）。四個端點一起掃過：
  `/api/issues`、`/api/articles` 各補 `{ id: "asc" }`，`/api/games` 改在共用的 `gameOrderBy()`
  收尾補（後台清單與公開的 `/games` 一起修好），`/api/photos` 沒有 GET 不受影響。
  重現腳本、其餘同形狀但這次沒動的查詢見
  [issues-pagination-order-ties.md](issues-pagination-order-ties.md)（2026-09-02）

- [x] **顯示名稱的重名檢查擋不住同時送出**（2026-08-30 補上唯一索引） — `PATCH /api/users/me` 是先查再寫，
  而 `users.name` 沒有唯一索引。兩個人同時挑同一個名字，兩邊都查到「沒人用」，於是都寫進去——正好變成
  這個檢查想避免的「排行榜上兩列分不出誰是誰」（2026-08-16，code review 指出）。

  **做法**：migration `20260830000000_users_name_unique_ci` 對 `lower(name)` 建 partial unique index
  （`WHERE name IS NOT NULL`），route 改成把 P2002 轉回原本那句 409。查詢留著，但它現在只負責措辭。
  Prisma schema 表達不了函式索引與 partial index，所以 `prisma migrate dev` 每次都會提議 drop 掉它
  ——`schema.prisma` 的 `User.name` 上有註解寫明要拒絕。

  **趁資料還少做的**：原本判斷是「不急，正式站 3 個使用者」，但那正是最便宜的時機——等使用者多了要
  先清重複名字才建得起索引。建之前查過 dev 與 production，兩邊都沒有大小寫相撞的名字。

- [x] **電視遊樂雜誌與電視遊樂報導的期數核對基準**（2026-08-25 匯入時對完） — 這兩本當時都是 0 期，
  留這組數字備查（2026-08-24）。

  **已知事實**（來源：zh.wikipedia〈臺灣電玩雜誌列表〉；總期數該頁引國家圖書館臺灣期刊論文
  索引系統期刊指南）：
  《電視遊樂雜誌》全部 301 期（歷年新春增刊號未計入），舊版 1987.07.20 – 1999.07.06 共 292 期
  （雙週刊）、新版 1999.08.05 – 2000.03.04 共 8 期（月刊），試刊號（1987.07.05）與創刊號第 1 期
  刊名為《電視遊樂快訊》。《電視遊樂報導》1988.08.25 – 2001.01.12 共 342 期（雙週刊），自
  1999.08.09 易名《Super Gamer流行電玩週刊》、新期數與總期數並行，實質最終期是 2001.01.19 的
  《2001年特輯 SG增刊號》；另記從 110 期起成為日本 ASCII《Famicom通訊》授權中文版（該條引
  《電視遊樂報導》Vol.110，1993-05-21，頁 8）。

  **292 + 8 = 300，與「全部 301 期」差 1**——大概是試刊號算不算的問題，匯入時第一件要對的就是
  這個 1。新舊期數並行照既有做法走 `Issue.altNumbers`，不需要時期層欄位。

  **對照結果**（2026-08-25 匯入 300 + 269 期之後）：

  - 《電視遊樂雜誌》**「差 1」就是試刊號**。Sheet 的舊版是創刊號（No.1）加 No.2–292，
    連號無缺，正好對上文獻的 292 期；再加試刊號就是 293。文獻的「全部 301」＝ 292 舊版
    ＋ 8 新版 ＋ 1 試刊。站上實際 300 期，缺的是**新版的最後 3 期**——Sheet 的 GAMEfans
    只到 `新刊5號`（總號 297），文獻的新版有 8 期（總號 293–300）。另外站上多了兩期文獻
    未計入的《超級新春增刊號》與《創刊十週年紀念特輯》，與那 301 不衝突
  - 《電視遊樂報導》站上 269 期，文獻 342 期，**缺 74 期**。No.001–266 連號無缺，
    267 以後 Sheet 只有 SuperGamer 的兩期（總號 306、321）。改名後的期數照《電擊王》的
    做法：期號存封面印的 `SuperGamer No.40`、slug 給 `sg-40`、總號進 `altNumbers`

  兩本都還缺的期數要回頭補 Sheet，補完重跑匯入即可（腳本以 slug 比對，冪等）。

- [x] **期刊改名之後，整段歷史都顯示新名** — 以 `MagazineTitle`（刊名時期，只存起始期）解決：單期頁用當期刊名、`/magazines` 一時期一卡、刊系頁分區段，後台有「刊名沿革」編輯區。判準入 data-conventions，設計見 docs/plans/2026-08-22-magazine-title-design.md。電玩通 PlayStation 系已於同日收整完畢（三本空殼 Magazine 併為 `fmtps-tw`、匯入 132 期、建三筆沿革，成為第一條用上這功能的刊系）；其餘刊的沿革見上方待辦。電腦遊戲世界與電擊王的沿革與時期刊頭同日建畢——刊頭裁切來源：「遊戲世界」取第 169 期封面（cgw_no-169.jpg），「DengekiGAMES」取 DengekiGAMES Vol.4 封面（doh-tw_no-029.jpg，Vol.11 左上被 FF12 促銷框疊住所以不用）（2026-08-22）
- [x] **`/magazines` 提供列表式檢視切換**（2026-08-22 完成） — 卡片牆之外多一種列表呈現，右上角切換，狀態走網址 `?view=list`（`parseMagazineView`），與篩選、排序同一套機制，所以切完的畫面分享得出去。

  列表欄位是**讀者要的那組**（出版社、發行期間、分類、期數），不是照抄後台那份——後台有編輯、快速新增單期、建立日期，都是編輯才需要的。也因此沒有共用 `MagazineListClient`，否則會變成一個到處都是 `isAdmin` 判斷的元件。

  沒有用 `<Table>`：那是 `"use client"`，而這頁整條是伺服器算好的，為了畫幾條線把 30 列送去 hydrate 不划算；窄螢幕表格也擠不下五欄。改成 flex 排的列，欄位隨寬度逐段出現，手機上只留刊名與期數。

  截圖驗證時發現「停刊年不詳」會出現在 30 本裡的 19 本上，把一整欄讀成雜訊，改成沒有停刊日就只講創刊（2026-08-22）

- [x] **AEO：讓答題引擎答得出這個站的內容**（2026-08-22 完成四項，第五項待部署後驗證） — SEO 求的是「有人搜尋時排得上」，AEO 求的是「有人問模型時答得出來、而且答得對」。對這個站來說後者更值得投資：沒有人會用關鍵字搜「電腦玩家 1999 年 5 月號有哪些文章」，但會這樣問模型，而全世界只有這裡有那份目錄（2026-08-20）。

  - ~~**JSON-LD 結構化資料**~~ — **2026-08-20 完成**
  - ~~**`llms.txt`**~~ — **2026-08-22 完成**：`src/app/llms.txt/route.ts`，動態產生而不是靜態檔，因為刊物與期數每次匯入都在變，寫死的數字撐不過一個月。內容講四件事——這裡有什麼（含即時的刊物／期數／文章統計與整份刊物清單）、怎麼定址（含 `/i/<code>`）、讀什麼（內容在 HTML 裡、三層 JSON-LD、sitemap）、什麼算可信（EDTF 的精度語意、改名另立書目、遊戲條目可能重複）。一小時重算一次，與 sitemap 同一個節奏
  - ~~**AI 爬蟲的放行政策要明講**~~ — **2026-08-22 決定：全部放行**（yuxio）。不區分訓練用與即時檢索用的爬蟲，理由與作法寫進 `robots.ts` 的註解：這個站的目的是被引用，要讓模型答得對就得先讓它讀得到；擋掉訓練爬蟲換到的是「不進訓練集」，代價是答題引擎只能靠別處的二手資料。規則本身沒動（仍是 `userAgent: "*"`），**但它現在是一個決定而不是預設值**
  - ~~**內容要在 HTML 裡**~~ — **2026-08-22 確認成立**：單期頁是 server component，目錄在初始 HTML 裡，不需要執行 JavaScript
  - ~~**可引用的穩定網址**~~ — **2026-08-22 完成**：`/i/<code>` 寫進 `llms.txt`，並說明它為什麼是引用時該用的那條（正規網址的每一段都可能因改名／重排／重填而變動）

  **還沒做的是驗收**：要等這批上正式站、爬蟲重抓之後，拿幾個模型問「電腦玩家 1999 年 5 月號有哪些文章」「哪本雜誌報導過《仙劍奇俠傳》」，看答不答得出、有沒有引到這個站。答錯比答不出更該記下來——那是資料或標記出了問題

- [x] **接 Google Analytics**（2026-08-22 完成，GA4 `G-5K32DKKL1G`） — 走 `@next/third-parties/google` 的 `<GoogleAnalytics>`，**掛在 `src/app/(public)/layout.tsx` 而不是 root layout**：`/admin` 與 `/auth` 是另一個 layout 底下的事，這樣自然排除，不必寫路徑判斷。自己編目一整晚的點擊會蓋過真實訪客。

  measurement ID 走 `NEXT_PUBLIC_GA_ID`，**沒設就整個不掛**，所以本機與 preview 預設不送資料。它不是密鑰（會出現在每個訪客的頁面原始碼裡），走環境變數是為了讓「哪個環境要送」由部署決定。

  已驗證：設了變數時 `/magazines` 的 HTML 有 `gtag/js?id=G-5K32DKKL1G`，`/admin/magazines` 沒有。**Cookie 同意先不做**——訪客量還小，等有需要再說。

  待辦：`NEXT_PUBLIC_GA_ID` 要加進 Vercel 的 Production scope 並 redeploy 才會生效（見 [[tocr-deployment-topology]]）

- [x] **`Issue.publishDate` 改成可空，排序改以 `order` 為主** — 原本必填，而 `publishSort`（由它推導）是八處查詢的排序鍵。代價是沒有日期的期數整本進不了站，或被迫寫一個近似值。

  這批雜誌多半出在 2000 年前後，當年的數位化與網路資訊都不發達，**相當多期本來就查不到發行日**，所以不等下一個案例，直接放寬（yuxio 2026-08-22）。做法：兩欄一起可空、**一本刊之內的順序看 `Issue.order`**（`/magazines/[id]`、匯出、後台選單都改吃它），日期只在跨刊清單當時間軸用且 nulls last。表單、CSV 匯入與顯示一併放寬，沒有日期的顯示「日期不詳」而不是空白（2026-08-22）

- [x] **辨識出來的遊戲與標籤對不回既有條目**（2026-08-21 完成：`src/lib/name-match.ts` 的 `nameKey()`，寫入與搜尋共用） — 目錄照片上寫什麼就存什麼，而寫法每一期都可能不同。原本 `resolveGameIds()` 比對的是 `name`／`nameEn`／`nameOriginal` 三欄的**完全相等**（不分大小寫），對不上就直接建一筆新的；標籤更少，只比 `name` 一欄。

  三個洞都補了：

  - **不看 `aliases`** → 改比 `Game.nameKeys`，那一欄含主名、英文名、原文名與**所有別名**的正規化 key。搜尋端（`/api/games`、`game-browse.ts`）也一起改成比它，兩邊終於同一把尺
  - **不做正規化** → `nameKey()` 建立在 `slugify` 之上再折掉分隔符，所以 `P.47`／`P-47`、`蝙蝠俠。電影版`／`蝙蝠俠·電影版`、`幻想空間Ⅱ`／`幻想空間II`、`銀河飛將 II`／`銀河飛將II` 都收斂到同一個 key。**key 不是 slug**：slug 是位址要唯一（撞了接 `-2`），key 是身分不唯一（撞了正是重複的訊號）
  - **合併掉的名字沒有留下轉址** → `merge-game.ts` 本來就把落選的名稱併進 `aliases`，現在 key 跟著一起搬，所以下一期再印一次舊寫法會對回保留的那筆，而不是把它建回來

  標籤依規範改成**連 `type` 一起比**（`SERIES:三國志` 與 `GENERAL:三國志` 是兩個標籤）。回填寫在 migration 裡而不是腳本，正式站部署當下就正確；SQL 與 JS 的算法在本機 182 筆上逐筆比對過，零差異。

  **留下的兩件事**（都不是程式）：

  1. 正式站有兩對因為舊規則而分家的遊戲要用後台的合併按鈕併掉：`蝙蝠俠。電影版`／`蝙蝠俠·電影版`、`幻想空間Ⅱ`／`幻想空間II`。標籤另有兩筆同名同 type 的 `法律`（標籤沒有合併工具，得手動處理關聯）
  2. **簡繁比對還沒做**（`docs/data-conventions.md` 提到的 opencc `t2s`）。目前來源都是台灣雜誌，沒有簡體名，等真的收到再說（2026-08-20，2026-08-21 完成）

做完的項目移到這裡，全文保留——不少條記著「當初的顧慮後來為什麼不成立」，那段判斷 commit message 裝不下。

- [x] **sitemap、robots.txt 與 SEO／AEO 基本盤**（2026-08-20 三項全完成） — 目前兩個檔案都沒有（`src/` 與 `public/` 都找不到 `sitemap` 或 `robots`），搜尋引擎與 AI 檢索只能靠爬連結摸索，而這個站大部分內容藏在 `/magazines/[id]/issues/[issueId]` 這種要點兩層才到的頁面（2026-08-16）。

  能做的事，由淺到深：

  1. ~~**`app/sitemap.ts` 與 `app/robots.ts`**~~ — **2026-08-19 完成**。動態產生，1157 條網址（靜態頁 + 期刊 + 單期 + 遊戲 + 標籤），`/admin`、`/api`、`/auth` 已 disallow。中文 slug 逐段百分比編碼——沒編碼的話 XML 裡是不合法的網址，搜尋引擎會整筆丟掉，而那正是這個站大部分內容所在的層。`/i/<code>` 短碼刻意不收：同一份內容不報兩個網址
  2. ~~**結構化資料（JSON-LD）**~~ — **2026-08-20 完成**。`src/lib/structured-data.ts` 產出 `Periodical`（期刊頁）與 `PublicationIssue`（單期頁），文章沒有自己的網址，所以掛在單期的 `hasPart` 底下——那也是目錄本來的形狀。實測電腦玩家 105 期吐出 61 篇。

     兩件被資料逼出來的判斷：`datePublished` 只在 EDTF 剛好也是合法 ISO 8601 時才給（`1994-22` 是 1994 夏、`1999-05?` 是存疑，ISO 8601 都讀不懂；拿 `publishSort` 去補會publish 一個編出來的日子）；空欄位整個不出現，而不是給 `null`——這個站大部分欄位還沒填，那是常態。網址走 sitemap 那支 `sitemapUrl`，中文 slug 的編碼兩邊一致
  3. ~~**標題與描述**~~ — **2026-08-20 完成**，隨 OG meta 一起。四個公開動態頁都有自己的 description：期刊用 `description` 欄、單期給「出版年月｜本期特輯」、遊戲與標籤給「在 N 篇文章裡出現過」。沒有值的欄位在庫裡常常是 `""` 而不是 `null`，所以判斷要用 `||` 不是 `??`——`??` 會讓空字串原樣通過，產出一個空的 meta

  **原本寫著「sitemap 要等網址定案」，那個條件早就滿足了**——readable URLs 在 2026-08-16 就上線（`docs/plans/2026-08-16-readable-urls-design.md`），「網址裡的 ID 太長」也已經不在這份清單上。那是一條指向不存在項目的過時交叉引用，2026-08-19 覆核時才發現，sitemap 因此白等了三天。

  **「2 與 3 與 OG 共用 `generateMetadata`」那句是錯的**（2026-08-20 做完才知道）：JSON-LD 是頁面裡的一個 `<script>`，`generateMetadata` 只管 `<head>` 的 meta 標籤，兩件事各自獨立。3 確實與 OG 同源，2 不是。

- [x] **加上 404 頁面**（2026-08-20 完成，三份） — 目前沒有 `src/app/not-found.tsx`，所以打錯網址或期刊被刪掉時，看到的是 Next.js 的預設頁：黑白、英文、沒有導覽列，離開這個站的唯一辦法是按上一頁。

  **這不是罕見路徑**：`notFound()` 在 11 個檔案裡被呼叫，公開頁的每一條「找不到這本刊／這一期／這款遊戲／這個標籤」都通到這裡，而站上大部分內容正是靠人工填的 slug 定址（見 [data-conventions.md](docs/data-conventions.md#網址代號與期號是兩回事)），打錯的機會不低。

  要一起想的是**要不要分兩層**：`app/not-found.tsx` 管全站，`(admin)` 底下另給一份帶後台外框的（不然編輯在後台打錯網址會被丟到前台的版面）（2026-08-20）。

  **「要不要分兩層」的答案是三層**，而且不是設計選擇是框架限制：route group 的 layout 不會套到根目錄的 not-found，所以 `app/not-found.tsx` 拿不到公開頁的頁首頁尾，得自己帶一條標題列。三份各司其職——根目錄接「網址完全對不上」、`(public)` 接公開頁丟出的 `notFound()`（多給一個「期刊列表」出口，走到這裡的人多半在找某一本刊）、`(admin)/admin` 接後台（側邊欄還在）。

  **一個接不住的情況**：`/admin/沒這頁` 這種完全對不上路由的網址仍然走根目錄那份，因為那時沒有任何 route 被匹配，Next.js 無從得知該用哪一層。這是框架行為，檔案裡寫明了免得下一個人以為是漏掉（2026-08-20）

- [x] **備份還缺保留策略與第一次還原驗證**（2026-08-20 兩件都完成） — 排程備份已經上線並實跑驗證過（2026-08-17）：資料庫每日、圖片每週，存到 R2 的 `tocr-backup`，設定與還原步驟見 [docs/deployment.md](docs/deployment.md#備份與還原)。

  剩兩件：

  - **`db/` 前綴的 lifecycle rule**（建議 90 天）。刻意不寫在 workflow 裡——CI 裡的刪除迴圈只要有一個 bug 就會清掉它該保護的東西
  - **跑一次還原驗證**。只備份不驗證等於不知道備份能不能用；步驟在文件裡（開臨時 Neon branch 灌入、斷言筆數、刪掉）。這一步刻意不進 CI，因為需要 age 私鑰，放進 secrets 就等於私鑰進了 CI

    **改在本機做**（yuxio 2026-08-18）：私鑰本來就留在自己機器上，本機還原少一層網路與 Neon 額度，理由跟「不進 CI」是同一個。步驟寫在 [deployment.md](docs/deployment.md#在本機驗證不必開-neon-branch)，最容易踩的一點是**不要灌進 `tocr-db-dev`**——那支是 PG15，備份是 PG18 的 dump，而且會洗掉開發資料

    **2026-08-20：包成 `scripts/verify-backup-restore.sh`**，起容器、解密、灌入、報筆數、收容器一支搞定，失敗也收容器。已用一份自製的加密 dump 實跑過正常與壞檔兩條路徑。**卡住的仍是第一步「取回備份檔」**：R2 憑證只在 GitHub secrets 裡，本機沒有 `aws` 也沒有 `~/.aws`，所以要嘛從 Cloudflare 後台下載一次，要嘛把 R2 憑證放到本機。這是整條驗證裡唯一需要人的地方

  上線過程踩到的三件事都已修並記在文件裡：`pg_dump` 要指名 `/usr/lib/postgresql/18/bin/`（pg_wrapper 會挑到舊版）、`aws s3 ls` 對空前綴 exit 1、S3 對「看不到的 bucket」回 `AccessDenied` 而非 `NoSuchBucket`（bucket 名字打錯時很難判讀）（2026-08-17）

  **保留策略**：R2 上建了 `expire-db-snapshots`，`db/` 前綴上傳 30 天後刪除（yuxio 2026-08-20 設定；原本寫 90 天，判斷太長——這份備份要回答的是「昨天弄壞了」，而資料是持續累積的，真出事時不會有人選兩個月前那份）。規則與理由寫進 [deployment.md](docs/deployment.md#需要的設定)。

  **還原驗證**：2026-08-20 實跑，`db/2026-08-19.sql.gz.age`（610 KB）解得開、灌得進去，五張表與當下正式站**完全一致**（37 / 955 / 1843 / 926 / 362）。流程包成 `scripts/verify-backup-restore.sh`，一個指令跑完並自動收容器。

  三件做的時候才知道的事：

  - **不需要 aws CLI**。`rclone` 講同一個協定、本機已經有，而且憑證走環境變數不會出現在 `ps` 裡
  - **只綁單一 bucket 的 token 列不出 bucket 清單**（`ListBuckets` 403）。那不是憑證壞掉，bucket 名字去看 GitHub variable `R2_BUCKET`
  - **備份目前只有三份**（8/17 起才開始跑），所以 30 天那條規則還沒刪過任何東西——第一次生效會是 9/16 左右

- [x] **Open Graph meta 與縮圖**（2026-08-20 完成，走 A 方案：一張站台預設圖，不做動態產生） — 原本整個 repo 沒有一處 `openGraph`，任何一頁貼到 LINE／Threads／Discord 都只是一段光禿禿的網址。

  單期用 `coverImage`、期刊用 `logoImage`，沒有自己的圖就吃 `/og-default.png`。描述也一併補上：單期給「出版年月｜本期特輯」，遊戲與標籤給「在 N 篇文章裡出現過」。`metadataBase` 有設，否則相對路徑的圖不會變成絕對網址。

  **`next/og` 動態產生押後**：CJK 字型要自己載又要子集化，不是零成本；而真正有分享價值的單期頁多半有封面可用。之後想升級，接線是同一套。

  三件做的時候才發現的事：

  - **Next.js 的 metadata 是淺層合併**，子頁一旦宣告 `openGraph`，父層的 `openGraph.images` 就整個不見。所以每一頁都經過 `src/lib/og.ts` 自己給圖，不靠繼承
  - **空字串接不住**。`description` 這類欄位在庫裡常常是 `""` 而不是 `null`，`??` 會讓它原樣通過，於是產出一個空的 meta。標籤頁上抓到，遊戲頁一起修
  - **與 JSON-LD 不共用 `generateMetadata`**（見那條的更正）——所以這兩件事本來就不必綁在一起做

  預設圖沿用「缺封面」那張雜誌骨架，但刊頭改成品牌藍：同一個形狀，刻意不同色，跟灰色那張「這裡沒有封面」區隔開（2026-08-20）

- [x] **blob store 裡累積了沒有任何資料列指向的孤兒圖**（2026-08-20 完成掃描端：`scripts/find-orphan-blobs.ts`，只列清單不刪；2026-08-30 第一次實際刪除 12 個換 logo 換下來的舊圖，比對的是本次上傳紀錄而非該腳本——它要 `DATABASE_URL` 指向正式站，而 `.env.local` 指的是本機 dev 庫） — 換過的圖不會自動消失：`/api/upload` 每次都產新檔名，欄位改指新網址之後，舊檔就永遠留在 store 裡。本機測試上傳的垃圾檔同樣會進去（`.env.local` 的 `BLOB_READ_WRITE_TOKEN` 指向正式站那個 store）。

  已知的九張是 2026-08-18 換掉的《軟體之星》跨頁封面（原掃描是左封底右封面，改用 nostalibrary 已裁好的正面封面），前綴都是 `issues/covers/`：

  ```
  1786937693606-glbb1u.webp  (第0期)
  1786889532647-58683u.webp  (第2期)
  1786937812926-j5t9ng.webp  (第4期)
  1786937895972-a1blpk.webp  (第5期)
  1786938287353-sethpb.webp  (第6期)
  1786938352150-co5gtj.webp  (第7期)
  1786938992949-p2zt09.webp  (第8期)
  1786939106008-7r3h4n.webp  (第9期)
  1786939160975-gndi59.webp  (第10期)
  ```

  但**逐次記錄換掉的檔案不是長久做法**——會漏，而且漏掉的那些沒有第二份記錄。真正該做的是一次掃描：列出 store 全部物件，比對 `magazines.logo_image`、`magazines.photos`、`issues.cover_image`、`issues.toc_images`（以及日後任何存網址的欄位），差集就是孤兒。

  ⚠️ **刪之前先確認備份涵蓋到**：圖片鏡像是每週一跑的增量（見 [docs/deployment.md](docs/deployment.md#備份與還原)），而 Vercel Blob 本身沒有版本歷史，刪掉就是刪掉。掃描腳本應該先只輸出清單，確認過再刪（2026-08-18）

  **實際做出來比原本設想的多兩件事**：比對涵蓋七個欄位而不是這裡列的四個——`games.cover_image` 與 `ocr_records.image_url` 同樣存網址，漏掉會把每一張遊戲封面與辨識過的目錄圖都報成孤兒；另外 `DATABASE_URL` 指著 localhost 時預設拒跑，因為 `.env.local` 的 blob token 指向正式站，本機庫配正式站 store 算出來的「孤兒」正是正式站在用的圖。這支的輸出就是刪除清單，錯的清單比沒有清單危險。

  順帶也報反向的那一半：資料列指著、store 裡卻沒有的路徑（壞掉的圖）。用法寫進 [deployment.md](docs/deployment.md#孤兒圖清查)。

  **還沒做的是「刪」**——要先在正式站跑一次、確認清單、確認備份涵蓋得到（2026-08-20）

- [x] **rate limiter 的通用程度遠超過它的用途**（2026-08-20 完成：81 行的 `lib/rate-limit.ts` 換成 route 內十來行的 `retryAfterMs()`） — `src/lib/rate-limit.ts` 81 行，帶 config 物件、滑動視窗、定期清理計時器與 remaining 計數，只服務一個呼叫端、一組寫死的設定（`/api/ocr`，10 次／分鐘）。

  而它擋不了什麼：計數在記憶體裡，Vercel 每個 function instance 各算各的（route 的註解自己寫明「it is not a defence against abuse」），且該路由在 `requireEditor()` 後面，能打到的本來就只有編輯者與 API token。

  所以這條不是「刪掉」而是「降級」：留一個十來行的同檔計數就夠，或乾脆承認它只防手滑重送。**優先度低**，列著是因為它讀起來像一道防線，而它不是（2026-08-17）

  留下來的十來行沒有清理計時器：鍵是 IP、沒人再碰的鍵也不會自己消失，所以整張表超過 500 個鍵就整個倒掉——判斷錯的代價只是有人重新拿到一輪額度，而這本來就不是防線。429 少了 `X-RateLimit-Remaining`，那個標頭只出現在 429 上而且永遠是 `0`。

  實際打過：前 10 次過、第 11 次 429 帶 `Retry-After: 60`，換個 IP 不受影響。原本的單元測試一併移除——它們測的是一組已經不存在的通用 API（2026-08-20）。

- [x] **`article_games.game_id` 與 `article_tags.tag_id` 沒有索引**（2026-08-20 完成：migration `add_article_relation_reverse_indexes`，兩張表各補一個單欄索引） — 兩張表都只有 `@@unique([articleId, gameId])`／`([articleId, tagId])`，複合索引的前導欄是 `article_id`，所以「這款遊戲被幾篇文章提到」這種以 `game_id` 出發的查詢用不到它。

  正式站 `EXPLAIN ANALYZE` 實測（2026-08-20）：`/admin/games` 那句每一列都跑一次 `Seq Scan on article_games`，20 列就是 20 次全表掃描，每次濾掉 1,534 列。**目前只有 6ms，所以這不是「遊戲管理開得慢」的原因**（那頁的資料庫查詢是有分頁的，見下），但它隨資料量線性惡化，而且擋著「依文章數排序」這個需求。

  **「遊戲管理開得慢」的答案：不是把資料全撈出來再切**。`api/games/route.ts:37-38` 是 `skip`／`take`，一頁 20 筆，`count` 另外一句。慢的地方在別處——那頁是 client component，要等 HTML → JS → `fetch` 才看得到第一列（在那之前是 spinner），而後台 layout 每次導覽還會先付一次 session 的資料庫往返加一次待複查計數（`admin/layout.tsx` 的註解自己寫了）。真要處理得從那條瀑布下手，不是從查詢（2026-08-20）。

  **正式站量到了**（2026-08-20 部署後）：同一句查詢的子計畫從 `Seq Scan on article_games`（每列一次、20 列共 20 次全表掃描）變成 `Index Only Scan using article_games_game_id_idx`，`Index Searches: 20`、`Heap Fetches: 9`，執行時間 **6ms → 0.604ms**。dev 上量不到是因為資料量太小，規劃器本來就會選 Seq Scan（2026-08-20）。

- [x] **後台遊戲管理的篩選與排序**（2026-08-20 完成） — **篩選**：平台與類型兩個下拉接上 `api/games/route.ts` 早就收著的 `platform`／`genre`，選項沿用新增／編輯表單的那兩份清單——能挑的就是能篩的。順帶修掉一個被篩選放大的舊問題：篩到空的時候原本顯示「尚無遊戲資料／點擊新增遊戲按鈕開始建立」，那句話在庫裡有 900 多款時讀起來像資料不見了。

  **排序**：詞彙不另立一套，直接用公開索引那份 `src/lib/game-browse.ts`（`GAME_SORTS`、`gameOrderBy()`），連「並列時拿名稱當第二鍵」都是現成的——沒有它，同一款遊戲可能出現在兩頁上或一頁都不在。四種組合攤平成單一下拉（名稱由前往後／由後往前、文章數多到少／少到多）。

  **只有預設值兩邊不同**：沒帶 `sort` 時後台是名稱、公開索引是文章數。那邊是逛的，開頭就給沒人寫過的遊戲沒有意義；這裡是管理清單，找得到某一筆比較重要。認不得的值一起落到名稱，否則網址打錯會讓後台悄悄套上公開索引的排序。

  **發售日與建立時間刻意沒做**。原本那條記著這兩維，但 `releaseDate` 在 dev 的 99 款裡是 0 筆有值，`game-browse.ts` 的註解也記著同一件事（正式站 624 款裡沒有一款填了平台或發售日）——照那個排序等於照空欄位排。建立時間倒是每筆都有，「最近新增的」也是真需求，但那要新增一種排序詞彙，等真的想看的時候再加比較有依據。

  依文章數排序等的就是下面那條索引（2026-08-20）。

- [x] **標籤管理沒有分頁，而且清單在第 100 筆就停了**（2026-08-20 完成：掛上 `ListPager`，一頁 50 筆） — `/admin/tags` 一次抓 `limit=100`（`admin/tags/page.tsx:113`）就不再往下。API 本身是有分頁的（`api/tags/route.ts:14` 用 `parsePagination(searchParams, 50)`），是頁面沒接。

  **正式站當時有 362 個標籤**（2026-08-20 查），所以**有 262 個在後台看不到也搜不到**——不是「將來會不夠」，是現在就已經看不到。做法與遊戲、文章兩份清單一致。「共 N 個」改讀 API 的 `pagination.total`，不再是「這一頁有幾列」；換類型分頁時一併回到第 1 頁，否則第 2 頁的位置在新清單上多半是空的（2026-08-20）。

- [x] [#34] **純數字期號加上「第 N 期」**（2026-08-20 完成：`src/lib/issue-number.ts` 的 `formatIssueNumber()`，19 個顯示點一起改） — 549 期裡 544 期的 `issueNumber` 是純數字，單獨顯示「216」讀起來不像期號。純數字才加「第 N 期」，`創刊號`、`試刊號`、`70+71` 這類原樣保留。不用 `Vol.`／`No.`：前者會跟另一個獨立欄位 `volumeNumber` 混淆，後者偏西式。慣例寫進 [data-conventions.md](docs/data-conventions.md#存的是封面上的字顯示時才補第-n-期)。

  **原本記著「先不要動手」**（樣本只有 3 本雜誌，27 本還沒匯入），2026-08-20 動手時判斷那個顧慮不成立：規則是**白名單**——只認純數字，其他一律原樣穿過去，所以新期刊帶來沒見過的刊號寫法不會被猜錯，只是不加字，不必先改規則。真要改的是「哪些非數字寫法也該包裝」，那本來就得等樣本。

  匯入預覽與匯入結果兩張表（`ImportPreviewTable`、`ImportResultDialog`）刻意不套：那裡要對照的是來源資料原文（2026-08-13，2026-08-20 完成）

- [x] **`OcrRecord.status` 有四個狀態，只有一個到得了**（2026-08-20 完成：`status` 與 `errorMessage` 連同 `OcrStatus` enum 一起拿掉，migration `drop_ocr_record_status`） — 唯一的寫入端（`src/app/api/ocr/route.ts:212`）永遠寫 `COMPLETED`，兩個讀取端（`src/app/api/issues/[id]/ocr/route.ts:18`、`src/app/(admin)/admin/issues/page.tsx:93`）也都只查 `COMPLETED`。`errorMessage` 在 `src/` 與 `scripts/` **零次引用**——沒人寫也沒人讀。dev 的 10 筆紀錄全是 COMPLETED、全無錯誤訊息。

  失敗之所以不可達，是因為 route 的 catch 只 `console.error` 就回 500，不落庫。所以有兩條路，**選哪條是產品決定**：把失敗也記下來（那是新功能，得想清楚錯誤訊息會不會帶出自架後端的內部網址——route 的註解正是為此才不回傳細節），或者承認這個站不追蹤失敗，把 `errorMessage` 與 `OcrStatus` 一起拿掉。

  傾向後者：欄位存在會讓人以為查得到失敗紀錄。**要做趁現在**——`ocr_records` 目前資料量極小，之後只會更難動（2026-08-17）

- [x] **OCR provider 的 `config` 參數沒有任何呼叫端傳過**（2026-08-20 完成：參數與 `OcrProviderConfig` 型別移除；`clearCache()` 刪掉，`getDefaultProvider()` 換成 `getDefaultProviderType()`，route 兩處 inline 的預設值改呼叫它） — 三個 provider 的 `extractTableOfContents(images, config?: Partial<OcrProviderConfig>)` 都得帶這個參數，但唯一的呼叫端（`route.ts:209`）只傳 images，設定一律從環境變數讀。`OcrProviderConfig` 這個型別除了這三個簽名之外沒有別的用途。

  同一區還有兩個死的 public API：`OcrProviderFactory.clearCache()`（註解寫「主要用於測試」，實際上 0 個測試用到）與 `getDefaultProvider()`（0 個呼叫端）——而 route 第 65 行與第 244 行各自 inline 了一份 `DEFAULT_OCR_PROVIDER || "claude"`，等於同一個預設值有三份寫法。刪掉沒人用的那份、讓 route 呼叫 factory，或反過來把 factory 那份刪掉，兩者都比現在好（2026-08-17）

- [x] **允許上傳的圖片格式散在四個地方**（2026-08-19 完成：收斂進 `image-policy.ts`） — `src/services/ai/ocr.interface.ts:69` 的 `ImageMimeType`、`src/app/api/upload/route.ts:33` 與 `src/app/api/ocr/route.ts:87` 各自的 `allowedTypes` 陣列，外加兩處 `|| "image/jpeg"` 的 fallback。四份要一起改才不會走鐘。

  落點已經有了：[`src/lib/image-policy.ts`](src/lib/image-policy.ts) 的開頭就寫著「一張表，兩邊不會走鐘」，尺寸與編碼格式早就收斂在那裡，只有這份清單漏掉。搬過去即可（2026-08-17）

- [x] **逗號分隔的陣列輸入抄了四次**（2026-08-20 完成：四處都改用 `CommaListInput`） — `MagazineForm.tsx:224`（別名）、`IssueForm.tsx:178`（其他編號）、`admin/games/page.tsx:776`（別名）、`EditableArticleRow.tsx:123`（作者），四段 `split(",").map(trim).filter(Boolean)` 完全相同，連 placeholder 的寫法都同一個模子。

  抽成一個受控元件（值是 `string[]`、顯示成逗號字串）可以少掉三份，也讓「要不要改成 tag 式輸入」之後只有一處要改。**條件已達成**：原本寫「下次再出現第四個陣列欄位時就該做」，2026-08-18 覆核發現第四份（作者）早就在那裡了。`src/lib/tag-input.ts` 不算——它處理的是 `TYPE:name` 的標籤語法，是另一件事（2026-08-17，2026-08-18 覆核）

- [x] [#26] **匯入腳本沒有進版控，每次都要重寫**（2026-08-18 完成：`scripts/import-issues.ts`） — 已匯入 30 本、還有 27 本沒進來，而每次要用都得重寫一次。等資料面的決定收斂、開始在 production 上傳目錄頁時，這支腳本會被反覆使用，屆時「上次是怎麼跑的」會變成實際問題。動手時順帶決定三件事：放 `scripts/`、資料來源怎麼取（Google Sheet 是正本）、以及用 API token 還是直接連 DB（2026-08-13）
