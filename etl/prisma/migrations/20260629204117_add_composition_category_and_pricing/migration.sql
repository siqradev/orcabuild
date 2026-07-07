-- CreateEnum
CREATE TYPE "CompositionCategory" AS ENUM ('MAO_DE_OBRA', 'MATERIAL', 'EQUIPAMENTO');

-- AlterTable
ALTER TABLE "Composition" ADD COLUMN     "category" "CompositionCategory" NOT NULL DEFAULT 'MATERIAL';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "bdi" DECIMAL(6,2),
ADD COLUMN     "encargosSociais" DECIMAL(6,2);
