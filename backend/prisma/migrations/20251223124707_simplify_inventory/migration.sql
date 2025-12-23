/*
  Warnings:

  - You are about to drop the column `status` on the `engines` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `rocket_sections` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `rockets` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_engines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "rocketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "engines_rocketId_fkey" FOREIGN KEY ("rocketId") REFERENCES "rockets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_engines" ("code", "createdAt", "id", "model", "name", "rocketId", "updatedAt") SELECT "code", "createdAt", "id", "model", "name", "rocketId", "updatedAt" FROM "engines";
DROP TABLE "engines";
ALTER TABLE "new_engines" RENAME TO "engines";
CREATE UNIQUE INDEX "engines_code_key" ON "engines"("code");
CREATE TABLE "new_rocket_sections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "rocketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rocket_sections_rocketId_fkey" FOREIGN KEY ("rocketId") REFERENCES "rockets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_rocket_sections" ("code", "createdAt", "id", "name", "rocketId", "type", "updatedAt") SELECT "code", "createdAt", "id", "name", "rocketId", "type", "updatedAt" FROM "rocket_sections";
DROP TABLE "rocket_sections";
ALTER TABLE "new_rocket_sections" RENAME TO "rocket_sections";
CREATE UNIQUE INDEX "rocket_sections_code_key" ON "rocket_sections"("code");
CREATE TABLE "new_rockets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_rockets" ("code", "createdAt", "id", "model", "name", "updatedAt") SELECT "code", "createdAt", "id", "model", "name", "updatedAt" FROM "rockets";
DROP TABLE "rockets";
ALTER TABLE "new_rockets" RENAME TO "rockets";
CREATE UNIQUE INDEX "rockets_code_key" ON "rockets"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
