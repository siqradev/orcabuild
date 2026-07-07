-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "company_address" VARCHAR(300),
ADD COLUMN     "company_cnpj" VARCHAR(20),
ADD COLUMN     "company_email" VARCHAR(150),
ADD COLUMN     "company_logo_url" TEXT,
ADD COLUMN     "company_name" VARCHAR(200),
ADD COLUMN     "company_phone" VARCHAR(30),
ADD COLUMN     "engineer_crea" VARCHAR(30),
ADD COLUMN     "engineer_name" VARCHAR(150);
