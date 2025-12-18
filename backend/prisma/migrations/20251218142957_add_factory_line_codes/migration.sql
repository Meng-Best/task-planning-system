/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `factories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `production_lines` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "factories" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "production_lines" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "production_lines_code_key" ON "production_lines"("code");
