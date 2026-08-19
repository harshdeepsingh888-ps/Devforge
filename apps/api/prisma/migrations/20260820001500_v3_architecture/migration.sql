-- CreateEnum
CREATE TYPE "AdrStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "SpecStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ArchitectureDecision" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "status" "AdrStatus" NOT NULL DEFAULT 'PROPOSED',
    "context" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "consequences" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchitectureDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalSpecification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "SpecStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdrSpecLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "adrId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdrSpecLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecWorkItemLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecWorkItemLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdrWorkItemLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "adrId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdrWorkItemLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchitectureDecision_workspaceId_idx" ON "ArchitectureDecision"("workspaceId");

-- CreateIndex
CREATE INDEX "ArchitectureDecision_workspaceId_projectId_idx" ON "ArchitectureDecision"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_workspaceId_idx" ON "TechnicalSpecification"("workspaceId");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_workspaceId_projectId_idx" ON "TechnicalSpecification"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AdrSpecLink_workspaceId_idx" ON "AdrSpecLink"("workspaceId");

-- CreateIndex
CREATE INDEX "AdrSpecLink_adrId_idx" ON "AdrSpecLink"("adrId");

-- CreateIndex
CREATE INDEX "AdrSpecLink_specId_idx" ON "AdrSpecLink"("specId");

-- CreateIndex
CREATE UNIQUE INDEX "AdrSpecLink_adrId_specId_key" ON "AdrSpecLink"("adrId", "specId");

-- CreateIndex
CREATE INDEX "SpecWorkItemLink_workspaceId_idx" ON "SpecWorkItemLink"("workspaceId");

-- CreateIndex
CREATE INDEX "SpecWorkItemLink_specId_idx" ON "SpecWorkItemLink"("specId");

-- CreateIndex
CREATE INDEX "SpecWorkItemLink_workItemId_idx" ON "SpecWorkItemLink"("workItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecWorkItemLink_specId_workItemId_key" ON "SpecWorkItemLink"("specId", "workItemId");

-- CreateIndex
CREATE INDEX "AdrWorkItemLink_workspaceId_idx" ON "AdrWorkItemLink"("workspaceId");

-- CreateIndex
CREATE INDEX "AdrWorkItemLink_adrId_idx" ON "AdrWorkItemLink"("adrId");

-- CreateIndex
CREATE INDEX "AdrWorkItemLink_workItemId_idx" ON "AdrWorkItemLink"("workItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AdrWorkItemLink_adrId_workItemId_key" ON "AdrWorkItemLink"("adrId", "workItemId");

-- AddForeignKey
ALTER TABLE "ArchitectureDecision" ADD CONSTRAINT "ArchitectureDecision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchitectureDecision" ADD CONSTRAINT "ArchitectureDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdrSpecLink" ADD CONSTRAINT "AdrSpecLink_adrId_fkey" FOREIGN KEY ("adrId") REFERENCES "ArchitectureDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdrSpecLink" ADD CONSTRAINT "AdrSpecLink_specId_fkey" FOREIGN KEY ("specId") REFERENCES "TechnicalSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecWorkItemLink" ADD CONSTRAINT "SpecWorkItemLink_specId_fkey" FOREIGN KEY ("specId") REFERENCES "TechnicalSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecWorkItemLink" ADD CONSTRAINT "SpecWorkItemLink_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdrWorkItemLink" ADD CONSTRAINT "AdrWorkItemLink_adrId_fkey" FOREIGN KEY ("adrId") REFERENCES "ArchitectureDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdrWorkItemLink" ADD CONSTRAINT "AdrWorkItemLink_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitAdrLink" ADD CONSTRAINT "CommitAdrLink_adrId_fkey" FOREIGN KEY ("adrId") REFERENCES "ArchitectureDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
