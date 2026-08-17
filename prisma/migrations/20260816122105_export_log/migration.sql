-- CreateTable
CREATE TABLE "export_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "magazine_id" TEXT,
    "magazine_name" TEXT,
    "row_count" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_logs_created_at_idx" ON "export_logs"("created_at");

-- CreateIndex
CREATE INDEX "export_logs_user_id_idx" ON "export_logs"("user_id");

-- AddForeignKey
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
