-- CreateTable
CREATE TABLE "calendar_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_date_key" ON "calendar_events"("date");
