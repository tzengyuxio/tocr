import fs from "node:fs";
const dir = process.cwd(); // run from a work dir holding mags.json + issues/
const OUT = (process.env.BOOK_DIR || '/Users/user/repos/tocr/docs/book') + '/appendix';
const idx = JSON.parse(fs.readFileSync(dir + '/index.json'));
const FREQ = { WEEKLY: '週刊', BIWEEKLY: '雙週刊', SEMIMONTHLY: '半月刊', MONTHLY: '月刊', BIMONTHLY: '雙月刊', QUARTERLY: '季刊', IRREGULAR: '不定期' };
const CAT = { PC_GAME: 'PC', TV_GAME: 'TV', ONLINE_GAME: '線上' };
const P = (s) => (s == null || s === '' ? '—' : s);
const year = (e) => (e ? Number(String(e).slice(0, 4)) : null);

// ---------- 全刊總表 ----------
{
  const L = ['# 全刊總表', '',
    '2026-09-08 正式站快照。**書上的「全刊總表」直接排這張**（一頁 12 本、四頁排完）。',
    '欄位缺值一律寫「未詳」，不留空白。', '',
    '| # | 刊名 | 並列刊名 | 出版社 | 刊期 | 創刊 | 停刊 | 已知期數 | 站上收錄 | 封面 | 類別 |',
    '| --: | --- | --- | --- | --- | --- | --- | --: | --: | --: | --- |'];
  for (const m of idx) {
    L.push(`| ${m.nn} | ${m.name} | ${P(m.parallel)} | ${P(m.publisher)} | ${P(FREQ[m.freq])} | ${P(m.founded)} | ${m.active ? '仍在發行' : P(m.ended)} | ${m.known ?? '—'} | ${m.issues} | ${m.covers} | ${m.cats.map((c) => CAT[c]).join('+')} |`);
  }
  const tot = idx.reduce((a, m) => ({ i: a.i + m.issues, c: a.c + m.covers, t: a.t + m.tocs, ar: a.ar + m.arts }), { i: 0, c: 0, t: 0, ar: 0 });
  L.push('', `**合計**：44 本、${tot.i} 期、封面 ${tot.c} 張、目錄掃描 ${tot.t} 期、目錄文章 ${tot.ar} 篇。`);
  fs.writeFileSync(OUT + '/master-table.md', L.join('\n') + '\n');
}

// ---------- 年表與甘特 ----------
{
  const L = ['# 年表與甘特拉頁的資料', '',
    '卷首 30 年一覽拉頁的底稿。**橫軸 1986–2026**，一本刊一條線段；停刊日未詳的畫成開放線段（右端箭頭），',
    '創刊或停刊為推定值的用虛線。下面第一張表就是每條線段的兩端。', '',
    '## 線段表', '',
    '| # | 刊名 | 起 | 迄 | 線段畫法 |', '| --: | --- | --- | --- | --- |'];
  for (const m of idx) {
    let how;
    if (!m.founded) how = '**擺不進年代軸**（創刊年未詳），置書末';
    else if (m.active) how = '開放線段（仍在發行）';
    else if (!m.ended) how = '開放線段（停刊日未詳）';
    else if (m.founded.includes('~') || m.ended.includes('~')) how = '虛線（有一端是推定值）';
    else how = '實線';
    L.push(`| ${m.nn} | ${m.name} | ${P(m.founded)} | ${m.active ? '至今' : P(m.ended)} | ${how} |`);
  }

  // 在架刊數：只用有創刊年的，停刊年未詳者以站上最晚一期所在年當下界。
  L.push('', '## 每年在架刊數（下界）', '',
    '**這是下界不是實數**：停刊日未詳的 33 本，這裡一律算到「站上已知最晚一期」那一年為止，',
    '所以實際曲線只會比這條高。書上要照這個算法標註，否則讀者會把它當定論。', '',
    '| 年 | 在架刊數（下界） | 當年創刊 | 當年停刊（已知） |', '| --: | --: | --- | --- |');
  const rows = idx.filter((m) => m.founded).map((m) => ({
    name: m.name, s: year(m.founded), e: m.active ? 2026 : (year(m.ended) || year(m.lastIssueYear) || null), ended: !m.active && m.ended,
  }));
  // 停刊年未詳者，補上站上最晚一期的年份
  const issuesDir = dir + '/issues';
  for (const r of rows) {
    if (r.e) continue;
    const m = idx.find((x) => x.name === r.name);
    const issues = JSON.parse(fs.readFileSync(`${issuesDir}/${m.slug}.json`)).data;
    const ds = issues.map((i) => i.publishDate).filter(Boolean).sort();
    r.e = ds.length ? year(ds[ds.length - 1]) : r.s;
    r.est = true;
  }
  for (let y = 1986; y <= 2026; y++) {
    const live = rows.filter((r) => r.s <= y && r.e >= y);
    const born = rows.filter((r) => r.s === y).map((r) => r.name);
    const died = rows.filter((r) => r.e === y && !r.est && r.ended).map((r) => r.name);
    if (!live.length && !born.length) continue;
    L.push(`| ${y} | ${live.length} | ${born.join('、') || '—'} | ${died.join('、') || '—'} |`);
  }
  L.push('', '## 要對照進去的產業事件（待補齊，這裡先列該查的）', '',
    '- 主機在台上市時點：FC／SFC、PC-Engine、MD、SS、PS、N64、DC、PS2、Xbox、PSP、PS3',
    '- 遊戲軟體法制化與水貨市場的轉折（本書要查出確切年月才寫）',
    '- 網咖與線上遊戲興起（天堂、仙境傳說在台營運起點）',
    '- 智冠《軟體世界》與《電腦遊戲世界》合併（2004-09）',
    '- 《電腦玩家》停刊（2009-07）、《電玩通》停刊（2014）');
  fs.writeFileSync(OUT + '/chronology.md', L.join('\n') + '\n');
}

// ---------- 出版社譜系 ----------
{
  const byPub = {};
  for (const m of idx) (byPub[m.publisher || '未詳'] ||= []).push(m);
  const L = ['# 出版社譜系圖的資料', '',
    '按站上的 `publisher`（創刊值）分組。**出版社中途轉手的不在這張表上顯示**——',
    '《電遊人》（華彩軟體 → 富利恒）就是這種，畫圖時要另外加箭頭。', ''];
  const entries = Object.entries(byPub).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [pub, ms] of entries) {
    L.push(`## ${pub}（${ms.length} 本）`, '');
    ms.sort((a, b) => a.nn.localeCompare(b.nn));
    for (const m of ms) L.push(`- ${m.nn} **${m.name}**　${P(m.founded)} – ${m.active ? '至今' : P(m.ended)}　${P(FREQ[m.freq])}`);
    L.push('');
  }
  L.push('## 畫圖時要處理的關係', '',
    '- **同集團多刊**：尖端（電視遊樂雜誌／電視遊樂報導／勝利小子／攻略快報／Game天堂!／Game天堂EX）、青文（電擊四本＋電玩通系）、智冠（軟體世界／電腦遊戲世界／遊戲設計大師／電玩双週刊）',
    '- **分家**：疾風快報 → 飛訊電玩周刊（人員出走，兩條刊系）',
    '- **副刊**：星際遊樂雜誌 → 星際遊樂快報、城市少年；電腦玩家 → 攻略月刊（另有《光碟世界》未收）',
    '- **合併**：電腦遊戲世界（遊戲世界）2004-09 併入軟體世界',
    '- **承接不是刊系**：電擊Dreamcast 停刊後由電擊王接手業務與讀者',
    '- **出版社轉手**：電遊人（華彩軟體 → 富利恒，2001-11 前後）');
  fs.writeFileSync(OUT + '/publisher-lineage.md', L.join('\n') + '\n');
}

// ---------- 統計頁 ----------
{
  const L = ['# 統計頁的資料', '', '2026-09-08 正式站快照。所有數字都是**站上收錄**，不是市場實數——書上每張圖都要標這一句。', ''];
  const freq = {};
  for (const m of idx) freq[FREQ[m.freq] || '未詳'] = (freq[FREQ[m.freq] || '未詳'] || 0) + 1;
  L.push('## 刊期分布（創刊值，44 本）', '', '| 刊期 | 本數 |', '| --- | --: |');
  for (const [k, v] of Object.entries(freq).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);

  const cat = {};
  for (const m of idx) for (const c of m.cats) cat[CAT[c]] = (cat[CAT[c]] || 0) + 1;
  L.push('', '## 報導範圍（可複選）', '', '| 類別 | 本數 |', '| --- | --: |');
  for (const [k, v] of Object.entries(cat).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);

  L.push('', '## 收錄規模排名（站上已建期數）', '', '| # | 刊名 | 已建 | 已知總期數 | 封面 | 目錄掃描 | 目錄文章 |', '| --: | --- | --: | --: | --: | --: | --: |');
  [...idx].sort((a, b) => b.issues - a.issues).forEach((m) => {
    L.push(`| ${m.nn} | ${m.name} | ${m.issues} | ${m.known ?? '—'} | ${m.covers} | ${m.tocs} | ${m.arts} |`);
  });

  // 定價曲線
  L.push('', '## 定價曲線的資料點', '',
    '取所有**同時有出版日與定價**的期，按年彙整。樣本偏向有實物的刊，不能當市場均價。', '',
    '| 年 | 樣本數 | 最低 | 中位 | 最高 |', '| --: | --: | --: | --: | --: |');
  const pts = [];
  for (const m of idx) {
    const issues = JSON.parse(fs.readFileSync(`${dir}/issues/${m.slug}.json`)).data;
    for (const i of issues) if (i.price && i.publishDate) pts.push([year(i.publishDate), Number(i.price)]);
  }
  const byYear = {};
  for (const [y, p] of pts) (byYear[y] ||= []).push(p);
  for (const y of Object.keys(byYear).sort()) {
    const a = byYear[y].sort((x, z) => x - z);
    L.push(`| ${y} | ${a.length} | ${a[0]} | ${a[Math.floor(a.length / 2)]} | ${a[a.length - 1]} |`);
  }
  L.push('', `合計 ${pts.length} 個定價資料點。`);
  fs.writeFileSync(OUT + '/statistics.md', L.join('\n') + '\n');
}

// ---------- 缺期徵集清單 ----------
{
  const L = ['# 缺期徵集清單', '',
    '書末那一頁的底稿，同時是續版的伏筆。排序＝**最該先補的排前面**：',
    '先看「連年代都定不下來」，再看「圖版全缺」，最後才是零星缺期。', ''];
  L.push('## 一、連年代都定不下來的', '',
    '| # | 刊名 | 缺什麼 |', '| --: | --- | --- |');
  for (const m of idx) {
    const miss = [];
    if (!m.founded) miss.push('**創刊日**');
    else if (m.founded.includes('~')) miss.push('創刊日只是推定');
    if (!m.ended && !m.active) miss.push('**停刊日**');
    else if (m.ended && m.ended.includes('~')) miss.push('停刊日只是推定');
    if (miss.length) L.push(`| ${m.nn} | ${m.name} | ${miss.join('、')} |`);
  }
  L.push('', '## 二、圖版最缺的（封面覆蓋率低於五成、且已建 10 期以上）', '',
    '| # | 刊名 | 已建 | 有封面 | 覆蓋率 |', '| --: | --- | --: | --: | --: |');
  idx.filter((m) => m.issues >= 10 && m.covers / m.issues < 0.5)
    .sort((a, b) => (a.covers / a.issues) - (b.covers / b.issues))
    .forEach((m) => L.push(`| ${m.nn} | ${m.name} | ${m.issues} | ${m.covers} | ${Math.round((m.covers / m.issues) * 100)}% |`));

  L.push('', '## 三、收錄率最低的（已建／已知總期數）', '',
    '| # | 刊名 | 已建 | 已知總期數 | 收錄率 |', '| --: | --- | --: | --: | --: |');
  idx.filter((m) => m.known).sort((a, b) => (a.issues / a.known) - (b.issues / b.known))
    .forEach((m) => L.push(`| ${m.nn} | ${m.name} | ${m.issues} | ${m.known} | ${Math.round((m.issues / m.known) * 100)}% |`));

  L.push('', '## 四、點名要找的單期', '',
    '- **《電視遊樂雜誌》新刊 6 號**（通卷 298、2000-01-05）——新刊 5 號版權頁預告有，實物未見',
    '- **《電玩e世代》No.62**——No.61 與 No.63 之間差 28 天，少一週，這一期能定案是停刊還是合刊',
    '- **《Game天堂!》No.36 之後任一期**——能分辨藏家清單的「64 期／1997-01-17 休刊」哪一項不對',
    '- **《華泰任天堂秘笈》任一期的版權頁**——可驗證或推翻整組出版日推定',
    '- **《金手指補給站》第 1–10 期**——連帶可查與《金手指行家補給站》（1997-07-10 NO.1）的關係',
    '- **《疾風快報》第 1–210 期**——站上只有 9 期，是缺得最兇的一條刊系',
    '- **《電玩双週刊》第 1–139 期、238–244 期；《電玩宅速配》vol.43–74**',
    '- **《電玩向前走》全刊**——站上零期');
  fs.writeFileSync(OUT + '/wanted-list.md', L.join('\n') + '\n');
}

console.log('appendix ok');
