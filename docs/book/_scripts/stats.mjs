import fs from "node:fs";
const dir = process.cwd(); // run from a work dir holding mags.json + issues/
const mags = JSON.parse(fs.readFileSync(dir + '/mags.json')).data;
const out = [];
for (const m of mags) {
  const issues = JSON.parse(fs.readFileSync(dir + '/issues/' + m.slug + '.json')).data;
  const prices = issues.map(i => i.price).filter(Boolean).map(Number);
  const pages = issues.map(i => i.pageCount).filter(Boolean);
  const dated = issues.filter(i => i.publishDate).map(i => i.publishDate).sort();
  const kinds = {};
  for (const i of issues) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
  const notes = issues.filter(i => i.notes).map(i => `${i.issueNumber}｜${i.notes.replace(/\s+/g, ' ')}`);
  const alt = issues.filter(i => i.altNumbers && i.altNumbers.length).slice(0, 3)
    .map(i => `${i.issueNumber} → ${i.altNumbers.join(' / ')}`);
  const titled = issues.filter(i => i.title).map(i => `${i.issueNumber}：${i.title}`);
  const credits = [...new Set(issues.map(i => i.coverCredit).filter(Boolean))];
  const coverGames = {};
  for (const i of issues) for (const g of i.coverGames || []) coverGames[g] = (coverGames[g] || 0) + 1;
  out.push({
    slug: m.slug, name: m.name, nameParallel: m.nameParallel, sourceTitle: m.sourceTitle,
    aliases: m.aliases, publisher: m.publisher, frequency: m.frequency, issn: m.issn,
    categories: m.categories, foundedDate: m.foundedDate, endedDate: m.endedDate,
    knownIssueCount: m.knownIssueCount, knownIssueCountSource: m.knownIssueCountSource,
    hasLogo: !!m.logoImage, description: m.description,
    counts: {
      issues: issues.length, kinds,
      covers: issues.filter(i => i.coverImage).length,
      tocScans: issues.filter(i => (i.tocImages || []).length).length,
      articles: issues.reduce((a, i) => a + (i._count?.articles || 0), 0),
      dated: dated.length, priced: prices.length, paged: pages.length,
    },
    firstIssueNumber: issues[0]?.issueNumber, lastIssueNumber: issues[issues.length - 1]?.issueNumber,
    dateRange: dated.length ? [dated[0], dated[dated.length - 1]] : null,
    priceRange: prices.length ? [Math.min(...prices), Math.max(...prices)] : null,
    pageRange: pages.length ? [Math.min(...pages), Math.max(...pages)] : null,
    altNumberSamples: alt,
    coverCredits: credits,
    coverGamesTop: Object.entries(coverGames).sort((a, b) => b[1] - a[1]).slice(0, 8),
    issueTitles: titled,
    issueNotes: notes,
  });
}
fs.writeFileSync(dir + '/summary.json', JSON.stringify(out, null, 1));
console.log('ok', out.length);
