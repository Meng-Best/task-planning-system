/*
  Warnings:

  - You are about to alter the column `status` on the `production_lines` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "maintenance_records_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "staffs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "major" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_factories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_factories" ("code", "createdAt", "description", "id", "location", "name", "updatedAt") SELECT "code", "createdAt", "description", "id", "location", "name", "updatedAt" FROM "factories";
DROP TABLE "factories";
ALTER TABLE "new_factories" RENAME TO "factories";
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");
CREATE TABLE "new_production_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "status" INTEGER NOT NULL DEFAULT 0,
    "factoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "production_lines_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "factories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_production_lines" ("capacity", "code", "createdAt", "factoryId", "id", "name", "status", "type", "updatedAt") SELECT "capacity", "code", "createdAt", "factoryId", "id", "name", "status", "type", "updatedAt" FROM "production_lines";
DROP TABLE "production_lines";
ALTER TABLE "new_production_lines" RENAME TO "production_lines";
CREATE UNIQUE INDEX "production_lines_code_key" ON "production_lines"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "devices_code_key" ON "devices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "staffs_staffId_key" ON "staffs"("staffId");
