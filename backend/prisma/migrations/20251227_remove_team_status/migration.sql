-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 创建新的teams表（不包含status列）
CREATE TABLE "new_teams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER,
    "stationId" INTEGER,
    "shiftType" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "staffs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "teams_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 复制数据（排除status列）
INSERT INTO "new_teams" ("id", "code", "name", "leaderId", "stationId", "shiftType", "createdAt", "updatedAt")
SELECT "id", "code", "name", "leaderId", "stationId", "shiftType", "createdAt", "updatedAt" FROM "teams";

-- 删除旧表
DROP TABLE "teams";

-- 重命名新表
ALTER TABLE "new_teams" RENAME TO "teams";

-- 创建唯一索引
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");
CREATE UNIQUE INDEX "teams_leaderId_key" ON "teams"("leaderId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
