// Generate the mechanical half of each magazine's manuscript sheet.
import fs from "node:fs";
import path from "node:path";
const dir = process.cwd(); // run from a work dir holding mags.json + issues/
const OUT = process.env.BOOK_DIR || '/Users/user/repos/tocr/docs/book'; // BOOK_DIR overrides (use it to dry-run without clobbering)

const mags = JSON.parse(fs.readFileSync(dir + '/mags.json')).data;
const FREQ = {
  WEEKLY: '週刊', BIWEEKLY: '雙週刊', SEMIMONTHLY: '半月刊', MONTHLY: '月刊',
  BIMONTHLY: '雙月刊', QUARTERLY: '季刊', IRREGULAR: '不定期',
};
const CAT = { PC_GAME: '電腦遊戲', TV_GAME: '電視遊樂器', ONLINE_GAME: '線上遊戲' };
const KIND = { REGULAR: '本刊', PILOT: '試刊', SPECIAL: '特刊／增刊' };

// EDTF-ish sort key: year, then month/season, then day.
function sortKey(edtf) {
  if (!edtf) return '9999';
  const m = edtf.replace('~', '');
  const [y, mo, d] = m.split('-');
  let mm = mo || '00';
  if (mm >= '21' && mm <= '24') mm = String((Number(mm) - 21) * 3 + 1).padStart(2, '0');
  return `${y}-${mm}-${d || '00'}`;
}

const rows = mags.map((m) => {
  const issues = JSON.parse(fs.readFileSync(dir + '/issues/' + m.slug + '.json')).data;
  return { m, issues, key: sortKey(m.foundedDate) };
}).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.m.name.localeCompare(b.m.name)));

function num(s) {
  const t = String(s).replace(/[^\d]/g, '');
  return /^\d+$/.test(String(s).trim()) ? Number(s) : (t && /^(第|NO\.?|No\.?|VOL\.?|Vol\.?|vol\.?)?\s*\d+\s*(期|號)?$/i.test(String(s).trim()) ? Number(t) : null);
}

function gaps(issues) {
  const ns = issues.map((i) => num(i.issueNumber)).filter((n) => n !== null).sort((a, b) => a - b);
  if (ns.length < 2) return { have: ns.length, ranges: [] };
  const set = new Set(ns);
  const out = [];
  let start = null;
  for (let i = ns[0]; i <= ns[ns.length - 1]; i++) {
    if (!set.has(i)) { if (start === null) start = i; }
    else if (start !== null) { out.push(start === i - 1 ? `${start}` : `${start}–${i - 1}`); start = null; }
  }
  return { have: ns.length, min: ns[0], max: ns[ns.length - 1], ranges: out };
}

function priceTrend(issues) {
  const pts = issues.filter((i) => i.price && i.publishDate)
    .map((i) => [i.publishDate, Number(i.price)])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!pts.length) return null;
  const keep = [];
  let last = null;
  for (const [d, p] of pts) { if (p !== last) { keep.push(`${d} ${p} 元`); last = p; } }
  return keep;
}

const tierOf = (m, issues) => {
  const n = m.knownIssueCount ?? issues.length;
  return n >= 100 ? 'A' : n >= 20 ? 'B' : 'C';
};
const PAGES = { A: '4–6 頁', B: '2–3 頁', C: '1 頁（或與鄰刊共頁）' };

const index = [];
rows.forEach((r, idx) => {
  const { m, issues } = r;
  const nn = String(idx + 1).padStart(2, '0');
  const tier = tierOf(m, issues);
  const g = gaps(issues);
  const kinds = {};
  for (const i of issues) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
  const covers = issues.filter((i) => i.coverImage).length;
  const tocs = issues.filter((i) => (i.tocImages || []).length).length;
  const arts = issues.reduce((a, i) => a + (i._count?.articles || 0), 0);
  const dated = issues.filter((i) => i.publishDate).length;
  const pages = issues.map((i) => i.pageCount).filter(Boolean);
  const prices = issues.map((i) => i.price).filter(Boolean).map(Number);
  const trend = priceTrend(issues);
  const notes = issues.filter((i) => i.notes).map((i) => `- \`${i.issueNumber}\`：${i.notes.replace(/\s+/g, ' ')}`);
  const titles = issues.filter((i) => i.title).map((i) => `- \`${i.issueNumber}\`：${i.title}`);
  const alt = issues.filter((i) => (i.altNumbers || []).length).map((i) => `- \`${i.issueNumber}\` ＝ ${i.altNumbers.join(' ／ ')}`);
  const credits = [...new Set(issues.map((i) => i.coverCredit).filter(Boolean))];
  const cg = {};
  for (const i of issues) for (const x of i.coverGames || []) cg[x] = (cg[x] || 0) + 1;
  const cs = {};
  for (const i of issues) for (const x of i.coverSubjects || []) cs[x] = (cs[x] || 0) + 1;

  const est = m.knownIssueCount;
  const cov = est ? `${issues.length}／${est}（${Math.round((issues.length / est) * 100)}%）` : `${issues.length}／未詳`;

  const L = [];
  L.push('---');
  L.push(`slug: ${m.slug}`);
  L.push(`name: ${m.name}`);
  L.push(`order: ${idx + 1}`);
  L.push(`tier: ${tier}`);
  L.push(`pages: ${PAGES[tier]}`);
  L.push(`status: 資料整理完成，未撰稿`);
  L.push(`data_snapshot: 2026-09-08 正式站`);
  L.push('---');
  L.push('');
  L.push(`# ${String(idx + 1).padStart(2, '0')}　《${m.name}》`);
  L.push('');
  L.push(`站上頁面：<https://tocr.simagame.me/magazines/${m.slug}>`);
  L.push('');
  L.push('## 資料卡');
  L.push('');
  L.push('| 欄位 | 值 |');
  L.push('| --- | --- |');
  L.push(`| 刊名 | ${m.name} |`);
  L.push(`| 並列刊名 | ${m.nameParallel || '無'} |`);
  L.push(`| 原刊（授權來源） | ${m.sourceTitle || '無（非外刊中文版）'} |`);
  L.push(`| 別名・俗稱 | ${m.aliases.length ? m.aliases.join('、') : '無'} |`);
  L.push(`| 出版社 | ${m.publisher || '未詳'} |`);
  L.push(`| 發行人 | 未詳（站上無此欄位，要翻版權頁）|`);
  L.push(`| 總編輯 | 未詳（同上）|`);
  L.push(`| 創刊 | ${m.foundedDate || '未詳'} |`);
  L.push(`| 停刊 | ${m.endedDate || (m.isActive ? '仍在發行' : '未詳')} |`);
  L.push(`| 刊期 | ${FREQ[m.frequency] || '未詳'}（創刊值）|`);
  L.push(`| 已知總期數 | ${m.knownIssueCount ?? '未詳'}${m.knownIssueCountSource ? `（出處：${m.knownIssueCountSource}）` : '（無出處）'} |`);
  L.push(`| ISSN | ${m.issn || '未詳'} |`);
  L.push(`| 報導範圍 | ${m.categories.map((c) => CAT[c]).join('、') || '未詳'} |`);
  L.push(`| 開本 | 未詳（站上無此欄位）|`);
  L.push(`| 頁數區間 | ${pages.length ? `${Math.min(...pages)}–${Math.max(...pages)} 頁（${pages.length}／${issues.length} 期有值）` : '未詳'} |`);
  L.push(`| 定價區間 | ${prices.length ? `${Math.min(...prices)}–${Math.max(...prices)} 元（${prices.length}／${issues.length} 期有值）` : '未詳'} |`);
  L.push(`| 刊頭標準字 | ${m.logoImage ? '站上已有' : '**缺**' } |`);
  L.push('');
  if (m.description) {
    L.push('**站上的解說（可作為 200–400 字解說的底稿）**');
    L.push('');
    L.push('> ' + m.description.replace(/\n+/g, '\n> '));
    L.push('');
  }
  L.push('## 收錄狀況');
  L.push('');
  L.push(`- 已建 **${issues.length} 期**（${Object.entries(kinds).map(([k, v]) => `${KIND[k]} ${v}`).join('、')}），對已知總期數 ${cov}`);
  L.push(`- 封面圖 ${covers}／${issues.length}・目錄掃描 ${tocs}／${issues.length}・目錄文章 ${arts} 篇・有出版日 ${dated}／${issues.length}`);
  if (issues.length) L.push(`- 期號範圍：\`${issues[0].issueNumber}\` → \`${issues[issues.length - 1].issueNumber}\``);
  if (g.ranges.length) L.push(`- **數字期號的缺口**（僅就可解析成數字的期號，${g.min}–${g.max} 之間）：${g.ranges.join('、')}`);
  else if (g.have > 1) L.push(`- 數字期號 ${g.min}–${g.max} 之間**沒有缺口**`);
  L.push('');
  if (trend && trend.length > 1) {
    L.push('### 定價變遷（每次變動取第一期）');
    L.push('');
    trend.forEach((t) => L.push(`- ${t}`));
    L.push('');
  }
  if (alt.length) {
    L.push('### 封面上並行的其他編號');
    L.push('');
    alt.slice(0, 12).forEach((x) => L.push(x));
    if (alt.length > 12) L.push(`- （另 ${alt.length - 12} 期同樣有並行編號）`);
    L.push('');
  }
  if (credits.length || Object.keys(cg).length || Object.keys(cs).length) {
    L.push('### 封面資訊（已錄入的部分）');
    L.push('');
    if (credits.length) L.push(`- 封面製作：${credits.join('、')}`);
    if (Object.keys(cs).length) L.push(`- 封面人物：${Object.entries(cs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}${v > 1 ? `×${v}` : ''}`).join('、')}`);
    if (Object.keys(cg).length) L.push(`- 封面遊戲：${Object.entries(cg).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}${v > 1 ? `×${v}` : ''}`).join('、')}`);
    L.push('');
  }
  if (titles.length) {
    L.push('### 有記到特輯標題的期');
    L.push('');
    titles.slice(0, 25).forEach((x) => L.push(x));
    if (titles.length > 25) L.push(`- （另 ${titles.length - 25} 期，見站上）`);
    L.push('');
  }
  if (notes.length) {
    L.push('### 逐期附註（考據線索都在這裡）');
    L.push('');
    notes.slice(0, 40).forEach((x) => L.push(x));
    if (notes.length > 40) L.push(`- （另 ${notes.length - 40} 條，見站上）`);
    L.push('');
  }
  if (issues.length <= 30 && issues.length) {
    L.push('### 全期一覽');
    L.push('');
    L.push('| 期號 | 出版日 | 定價 | 頁數 | 封面 | 目錄 |');
    L.push('| --- | --- | --: | --: | :-: | :-: |');
    issues.forEach((i) => L.push(`| ${i.issueNumber}${i.kind !== 'REGULAR' ? `（${KIND[i.kind]}）` : ''} | ${i.publishDate || '—'} | ${i.price ? Number(i.price) : '—'} | ${i.pageCount || '—'} | ${i.coverImage ? '◉' : '—'} | ${(i.tocImages || []).length ? '◉' : '—'} |`));
    L.push('');
  }
  L.push('## 沿革');
  L.push('');
  L.push('<!-- 待補：這一節由人整理，寫成可直接改寫成解說的年表 -->');
  L.push('');
  L.push('## 可寫的話題');
  L.push('');
  L.push('<!-- 待補 -->');
  L.push('');
  L.push('## 圖版候選');
  L.push('');
  L.push(`- 創刊號封面：${issues[0] && issues[0].coverImage ? '站上已有' : '**缺**'}`);
  L.push(`- 末期封面：${issues.length && issues[issues.length - 1].coverImage ? '站上已有' : '**缺**'}`);
  L.push(`- 刊頭標準字：${m.logoImage ? '站上已有' : '**缺**'}`);
  L.push('');
  L.push('## 資料缺口（寫稿前要處理的）');
  L.push('');
  const holes = [];
  if (!m.foundedDate) holes.push('**創刊日未詳**——年代序的位置定不下來');
  else if (m.foundedDate.includes('~')) holes.push(`創刊日是推定值（\`${m.foundedDate}\`），書上要標推定`);
  if (!m.endedDate && !m.isActive) holes.push('**停刊日未詳**——甘特拉頁只能畫成開放線段');
  else if (m.endedDate && m.endedDate.includes('~')) holes.push(`停刊日是推定值（\`${m.endedDate}\`）`);
  if (!m.frequency) holes.push('刊期未填');
  if (!m.publisher) holes.push('出版社未填');
  if (m.knownIssueCount == null) holes.push('已知總期數未詳——「收錄 N／M」的分母缺');
  else if (!m.knownIssueCountSource) holes.push('已知總期數沒有出處');
  if (!m.logoImage) holes.push('缺刊頭標準字圖');
  if (covers === 0) holes.push('**一張封面都沒有**');
  else if (covers < issues.length) holes.push(`封面缺 ${issues.length - covers} 期`);
  if (dated < issues.length) holes.push(`出版日缺 ${issues.length - dated} 期`);
  holes.push('發行人、總編輯、開本三欄站上沒有欄位，要翻版權頁');
  holes.forEach((h) => L.push(`- ${h}`));
  L.push('');
  L.push('## 出處');
  L.push('');
  L.push('<!-- 待補：逐條列出可引用的來源，並標 ◉ 實物／○ 文獻／△ 待考 -->');
  L.push('');

  const file = `${nn}-${m.slug}.md`;
  fs.writeFileSync(path.join(OUT, 'magazines', file), L.join('\n'));
  index.push({ nn, file, m, issues, tier, covers, tocs, arts, dated, cov, est });
});

fs.writeFileSync(dir + '/index.json', JSON.stringify(index.map((x) => ({
  nn: x.nn, file: x.file, slug: x.m.slug, name: x.m.name, tier: x.tier,
  founded: x.m.foundedDate, ended: x.m.endedDate, publisher: x.m.publisher,
  freq: x.m.frequency, issn: x.m.issn, known: x.est, issues: x.issues.length,
  covers: x.covers, tocs: x.tocs, arts: x.arts, dated: x.dated,
  parallel: x.m.nameParallel, source: x.m.sourceTitle, aliases: x.m.aliases,
  cats: x.m.categories, active: x.m.isActive,
})), null, 1));
console.log('wrote', index.length);
