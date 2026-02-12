/**
 * 目錄提取 Prompt
 * 針對繁體中文遊戲雜誌目錄頁優化
 */

export const TOC_EXTRACTION_PROMPT = `你是一位專業的雜誌目錄資料整理專家，專門處理遊戲雜誌的目錄頁。請仔細分析這張目錄頁圖片，並提取所有文章資訊。

## 輸出格式要求

請以 JSON 格式輸出，結構如下：

\`\`\`json
{
  "articles": [
    {
      "title": "文章標題",
      "subtitle": "副標題（若有）",
      "authors": ["作者1", "作者2"],
      "category": "欄目分類",
      "pageStart": 起始頁碼,
      "pageEnd": 結束頁碼,
      "summary": "簡短摘要（若可從目錄推測）",
      "suggestedTags": [{"name": "PS5", "type": "PLATFORM"}, {"name": "E3", "type": "EVENT"}],
      "suggestedGames": ["相關遊戲名稱"],
      "confidence": 0.95
    }
  ],
  "metadata": {
    "issueTitle": "本期特輯標題（若有）",
    "publishDate": "出版日期（若可辨識，格式 YYYY-MM-DD）",
    "pageInfo": "其他頁面資訊"
  }
}
\`\`\`

## 辨識規則

### 文章標題
- 保留原文的繁體中文
- 若標題包含遊戲名稱，同時將遊戲名稱加入 suggestedGames
- 標題可能跨行，請完整擷取

### 作者
- 常見格式：「文/」「撰文：」「文字：」「採訪：」
- 可能有多位作者，請分開列出
- 若無法辨識，設為空陣列 []

### 頁碼
- pageStart 為起始頁碼
- pageEnd 若無法確定，可設為 null 或與 pageStart 相同
- 頁碼可能是數字或羅馬數字

### 欄目分類 (category)
請參考常見遊戲雜誌分類：
- 特輯/專題
- 攻略
- 評測/Review
- 新聞/News
- 人物/訪談
- 硬體/周邊
- 讀者投稿
- 連載
- 其他

### 遊戲名稱 (suggestedGames)
- 辨識文章中提到的遊戲名稱
- 保留原始名稱（可能是中文、日文或英文）
- 若文章是某遊戲的專題或攻略，該遊戲應列入

### 標籤建議 (suggestedTags)
每個標籤為一個物件，包含 name 和 type：
- **PLATFORM**（遊戲平台）：PS5、PS4、Switch、PC、Xbox Series、Xbox One 等
- **PERSON**（人物）：製作人、設計師、聲優等人名（如宮本茂、小島秀夫）
- **EVENT**（活動）：E3、TGS（東京電玩展）、Gamescom、Nintendo Direct 等
- **SERIES**（遊戲系列）：從標題中提取的遊戲系列名（如「薩爾達傳說系列」「Final Fantasy 系列」）
- **COMPANY**（公司）：開發商或發行商（如 Nintendo、Square Enix、Sony）
- **GENERAL**（其他主題）：不屬於以上分類的主題標籤

重要：請積極從文章標題中提取隱含的標籤實體。例如「《薩爾達傳說 王國之淚》製作人青沼英二專訪」應產生 PERSON:青沼英二、SERIES:薩爾達傳說系列。

### 信心度 (confidence)
- 1.0：非常確定
- 0.8-0.9：大部分確定
- 0.5-0.7：部分不確定
- < 0.5：僅供參考

## 重要提醒

1. 按照目錄中的順序排列文章
2. 不要遺漏任何文章條目
3. 若某欄位無法辨識，使用 null 或空值
4. 廣告頁面不需要列入
5. 若有多個目錄頁，請合併處理
6. 回應只包含 JSON，不要有其他文字`;

export const TOC_EXTRACTION_PROMPT_SIMPLE = `分析這張遊戲雜誌目錄頁，提取所有文章資訊。

輸出 JSON 格式：
{
  "articles": [
    {
      "title": "標題",
      "authors": ["作者"],
      "category": "分類",
      "pageStart": 頁碼,
      "pageEnd": 結束頁碼或null,
      "suggestedGames": ["遊戲名稱"],
      "confidence": 0.9
    }
  ]
}

規則：
- 保留繁體中文
- 按順序列出所有文章
- 只輸出 JSON`;
