#!/bin/bash
# Page through /api/issues for each magazine (limit is clamped to 100 server-side).
set -e
# run from a work dir holding magindex.tsv
mkdir -p pages issues
while IFS=$'\t' read -r slug id; do
  page=1
  : > "pages/$slug.ndjson"
  while : ; do
    curl -s "https://tocr.simagame.me/api/issues?magazineId=$id&limit=100&page=$page" -o "pages/tmp.json"
    n=$(jq '.data|length' pages/tmp.json)
    jq -c '.data[]' pages/tmp.json >> "pages/$slug.ndjson"
    total=$(jq '.pagination.total' pages/tmp.json)
    have=$(wc -l < "pages/$slug.ndjson")
    [ "$have" -ge "$total" ] && break
    [ "$n" -eq 0 ] && break
    page=$((page+1))
  done
  jq -s '{data: .}' "pages/$slug.ndjson" > "issues/$slug.json"
  echo "$slug $(wc -l < pages/$slug.ndjson)/$total"
done < magindex.tsv
