-- CreateTable
CREATE TABLE "teams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER,
    "productionLineId" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "staffs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "teams_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "production_lines" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_staffs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "major" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "teamId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "staffs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_staffs" ("createdAt", "id", "level", "major", "name", "staffId", "status", "updatedAt") SELECT "createdAt", "id", "level", "major", "name", "staffId", "status", "updatedAt" FROM "staffs";
DROP TABLE "staffs";
ALTER TABLE "new_staffs" RENAME TO "staffs";
CREATE UNIQUE INDEX "staffs_staffId_key" ON "staffs"("staffId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_leaderId_key" ON "teams"("leaderId");
