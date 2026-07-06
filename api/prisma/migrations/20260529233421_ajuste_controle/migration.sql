/*
  Warnings:

  - You are about to drop the `budget_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `budgets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "budget_items" DROP CONSTRAINT "budget_items_budget_id_fkey";

-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_project_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_user_id_fkey";

-- DropTable
DROP TABLE "budget_items";

-- DropTable
DROP TABLE "budgets";

-- DropTable
DROP TABLE "projects";

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "BudgetStatus";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "UserRole";
