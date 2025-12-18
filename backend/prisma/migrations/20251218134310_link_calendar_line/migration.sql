-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_calendar_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "productionLineId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_events_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "production_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_calendar_events" ("date", "id", "note", "type") SELECT "date", "id", "note", "type" FROM "calendar_events";
DROP TABLE "calendar_events";
ALTER TABLE "new_calendar_events" RENAME TO "calendar_events";
CREATE UNIQUE INDEX "calendar_events_date_productionLineId_key" ON "calendar_events"("date", "productionLineId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
