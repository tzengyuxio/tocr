---
status: open
created: 2026-08-30
---

# 這批掃描留下的待查證

都是「只能查不能推」的，手邊有實體時順手看一眼就能結案（2026-08-30）。

- **《電視遊樂快訊》封面有沒有拉丁刊名**：目前 title slug `tvgame-kuaixun` 走 3.PINYIN
  （首段用固定題材詞），若封面其實印了 TV GAME 之類就該改走 1.PARA
- **《任天堂程式解法大公開》封面有沒有 NINTENDO 字樣**：有的話 title slug 可以是
  `huatai-nintendo` 之類，比現在的 `rentiantang-jiefa` 好認；沒有就維持
- **GAME fans 的期數對不上**：`2026-08-22-magazine-title-design.md` 記 293–300 共 8 期，
  正式站只有「新刊1～5號」5 期
- **《電玩向前走》的試刊名《電玩GOGO》還在 `aliases`**：按 2026-08-30 定的判準（改名一律
  建刊名時期、不看期數多寡）應該改建成 `MagazineTitle`，並從 aliases 移除
- **三張刊頭來源檔查不到期別**：`public/magazines/mastheads/` 的 `sg-game_logo.jpg`、
  `famitsu-ps2-tw_logo.jpg`、`dengeki-oh-tw_logo.jpg`，檔名照 `gamexpress_logo.png` 的
  無期號形式，知道是哪期再補
