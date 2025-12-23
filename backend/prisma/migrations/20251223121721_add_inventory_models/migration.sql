/*
  Warnings:

  - You are about to drop the column `productionLineId` on the `teams` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "stations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "productionLineId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stations_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "production_lines" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rockets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rocket_sections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "rocketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rocket_sections_rocketId_fkey" FOREIGN KEY ("rocketId") REFERENCES "rockets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "engines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "rocketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "engines_rocketId_fkey" FOREIGN KEY ("rocketId") REFERENCES "rockets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 0,
    "stationId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "devices_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_devices" ("code", "createdAt", "id", "model", "name", "purchaseDate", "serialNumber", "status", "type", "updatedAt") SELECT "code", "createdAt", "id", "model", "name", "purchaseDate", "serialNumber", "status", "type", "updatedAt" FROM "devices";
DROP TABLE "devices";
ALTER TABLE "new_devices" RENAME TO "devices";
CREATE UNIQUE INDEX "devices_code_key" ON "devices"("code");
CREATE TABLE "new_teams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER,
    "stationId" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 0,
    "shiftType" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "staffs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "teams_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_teams" ("code", "createdAt", "id", "leaderId", "name", "status", "updatedAt") SELECT "code", "createdAt", "id", "leaderId", "name", "status", "updatedAt" FROM "teams";
DROP TABLE "teams";
ALTER TABLE "new_teams" RENAME TO "teams";
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");
CREATE UNIQUE INDEX "teams_leaderId_key" ON "teams"("leaderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "stations_code_key" ON "stations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rockets_code_key" ON "rockets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rocket_sections_code_key" ON "rocket_sections"("code");

-- CreateIndex
CREATE UNIQUE INDEX "engines_code_key" ON "engines"("code");
