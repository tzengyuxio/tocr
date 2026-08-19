#!/usr/bin/env bash
#
# 驗證一份加密備份解得開、而且灌得進去。
#
# 只備份不驗證，等於不知道備份能不能用。這一步刻意不進 CI：驗證需要 age 私鑰，
# 放進 GitHub secrets 就等於私鑰進了 CI，加密只剩「防 R2 token 外洩」的效果。
#
# 全程在本機的拋棄式容器裡跑，不碰 Neon、不碰 tocr-db-dev（那支是 PG15，而備份
# 是 PG18 的 dump；灌進去會分不清是備份壞了還是版本不合，而且會洗掉開發資料）。
#
# 用法：
#   scripts/verify-backup-restore.sh <備份檔.sql.gz.age> [age 私鑰檔]
#
# 備份檔要自己先取回來——從 Cloudflare 後台下載，或裝了 aws CLI 的話：
#   aws s3 cp s3://<bucket>/db/<日期>.sql.gz.age . \
#     --endpoint-url https://<account-id>.r2.cloudflarestorage.com
set -euo pipefail

BACKUP=${1:?用法: $0 <備份檔.sql.gz.age> [age 私鑰檔]}
KEY=${2:-$HOME/.config/age/tocr-backup.txt}
CONTAINER=tocr-restore-test
IMAGE=postgres:18-alpine

for cmd in age podman gunzip; do
  command -v "$cmd" >/dev/null || { echo "找不到 $cmd" >&2; exit 1; }
done
[ -f "$BACKUP" ] || { echo "備份檔不存在：$BACKUP" >&2; exit 1; }
[ -f "$KEY" ] || { echo "找不到 age 私鑰：$KEY" >&2; exit 1; }

# 容器一定要收掉，包括中途失敗的時候——留著的話下一次跑會撞名，而那時候的錯誤
# 訊息看起來會像是備份有問題。
cleanup() { podman rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "==> 起一個拋棄式的 $IMAGE"
podman run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
until podman exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

echo "==> 解密並灌入"
podman exec "$CONTAINER" psql -U postgres -tAc 'create database restore_test' >/dev/null
# ON_ERROR_STOP=1 不能省：沒有它，psql 會把錯誤印一印繼續跑完、最後 exit 0，
# 於是一份灌不進去的備份看起來像成功。
age -d -i "$KEY" "$BACKUP" | gunzip \
  | podman exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q restore_test \
  > /dev/null

echo "==> 筆數"
podman exec "$CONTAINER" psql -U postgres -x -c "
  select (select count(*) from magazines) as magazines,
         (select count(*) from issues)    as issues,
         (select count(*) from articles)  as articles,
         (select count(*) from games)     as games,
         (select count(*) from tags)      as tags" restore_test

echo
echo "解得開、灌得進去。上面的數字就是備份當天正式站的筆數——與現在的正式站比對。"
echo "本機驗證不了的是「灌得進 Neon」，那只有真開一條 branch 才測得到。"
