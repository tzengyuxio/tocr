import type { JsonLdObject } from "@/lib/structured-data";

/**
 * 把結構化資料放進頁面。
 *
 * `<` 要轉成 `<`：資料裡只要出現 `</script>`（雜誌標題什麼字都可能有），
 * 沒轉的話那一段就會提早關掉這個 script 標籤，後面的內容直接落進 HTML。
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
