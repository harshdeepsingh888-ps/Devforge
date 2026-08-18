import type { ProjectRepository } from "../../projects/project.repository.js";
import type { WorkItemRepository } from "../../work-management/repositories/work-item.repository.js";
import type { WorkspaceRepository } from "../../workspaces/workspace.repository.js";
import {
  hasMinimumRole,
  type WorkspaceRole,
} from "../../workspaces/workspace.types.js";
import {
  AdrNotFoundError,
  ArchitectureDecisionImmutableError,
  ArchitectureError,
  ArchitecturePermissionDeniedError,
  ArchitectureProjectMismatchError,
  ArchitectureTenantMismatchError,
  DuplicateArchitectureLinkError,
  SpecNotFoundError,
  TechnicalSpecificationImmutableError,
} from "../architecture.errors.js";
import type {
  AdrSpecLink,
  AdrStatus,
  AdrWorkItemLink,
  ArchitectureDecision,
  CreateAdrInput,
  CreateSpecInput,
  SpecStatus,
  SpecWorkItemLink,
  TechnicalSpecification,
  UpdateAdrInput,
  UpdateSpecInput,
} from "../architecture.types.js";
import type { ArchitectureDecisionRepository } from "../repositories/architecture.repository.js";
import type { ArchitectureLinkRepository } from "../repositories/architecture-link.repository.js";
import type { TechnicalSpecificationRepository } from "../repositories/spec.repository.js";

export class ArchitectureService {
  constructor(
    private readonly adrRepository: ArchitectureDecisionRepository,
    private readonly specRepository: TechnicalSpecificationRepository,
    private readonly linkRepository: ArchitectureLinkRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly workItemRepository?: WorkItemRepository,
  ) {}

  private async verifyUserRole(
    workspaceId: string,
    userId: string,
    requiredRole: WorkspaceRole,
  ): Promise<void> {
    const membership = await this.workspaceRepository.findMembership(
      workspaceId,
      userId,
    );
    if (!membership || !hasMinimumRole(membership.role, requiredRole)) {
      throw new ArchitecturePermissionDeniedError(
        `Action requires minimum '${requiredRole}' workspace role.`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // ADR LIFECYCLE
  // --------------------------------------------------------------------------

  async createAdr(input: CreateAdrInput): Promise<ArchitectureDecision> {
    await this.verifyUserRole(input.workspaceId, input.actorUserId, "DEVELOPER");

    if (input.projectId) {
      const project = await this.projectRepository.findById(
        input.workspaceId,
        input.projectId,
      );
      if (!project) {
        throw new ArchitectureProjectMismatchError(
          "Project does not exist within the specified workspace tenant.",
        );
      }
    }

    return this.adrRepository.create(input);
  }

  async updateAdr(
    workspaceId: string,
    adrId: string,
    actorUserId: string,
    updates: UpdateAdrInput,
  ): Promise<ArchitectureDecision> {
    await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");

    const adr = await this.adrRepository.findById(workspaceId, adrId);
    if (!adr) {
      throw new AdrNotFoundError();
    }

    if (adr.status === "ACCEPTED" || adr.status === "REJECTED") {
      throw new ArchitectureDecisionImmutableError();
    }

    const updated = await this.adrRepository.update(workspaceId, adrId, updates);
    if (!updated) throw new AdrNotFoundError();
    return updated;
  }

  async updateAdrStatus(
    workspaceId: string,
    adrId: string,
    actorUserId: string,
    targetStatus: AdrStatus,
  ): Promise<ArchitectureDecision> {
    const adr = await this.adrRepository.findById(workspaceId, adrId);
    if (!adr) {
      throw new AdrNotFoundError();
    }

    if (targetStatus === "ACCEPTED" || targetStatus === "REJECTED") {
      await this.verifyUserRole(workspaceId, actorUserId, "ADMIN");
    } else {
      await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");
    }

    const updated = await this.adrRepository.updateStatus(
      workspaceId,
      adrId,
      targetStatus,
    );
    if (!updated) throw new AdrNotFoundError();
    return updated;
  }

  // --------------------------------------------------------------------------
  // TECHNICAL SPECIFICATION LIFECYCLE
  // --------------------------------------------------------------------------

  async createSpec(input: CreateSpecInput): Promise<TechnicalSpecification> {
    await this.verifyUserRole(input.workspaceId, input.actorUserId, "DEVELOPER");

    const project = await this.projectRepository.findById(
      input.workspaceId,
      input.projectId,
    );
    if (!project) {
      throw new ArchitectureProjectMismatchError(
        "Project does not exist within the specified workspace tenant.",
      );
    }

    return this.specRepository.create(input);
  }

  async updateSpec(
    workspaceId: string,
    specId: string,
    actorUserId: string,
    updates: UpdateSpecInput,
  ): Promise<TechnicalSpecification> {
    await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");

    const spec = await this.specRepository.findById(workspaceId, specId);
    if (!spec) {
      throw new SpecNotFoundError();
    }

    if (spec.status === "APPROVED") {
      throw new TechnicalSpecificationImmutableError();
    }

    const updated = await this.specRepository.update(
      workspaceId,
      specId,
      updates,
    );
    if (!updated) throw new SpecNotFoundError();
    return updated;
  }

  async updateSpecStatus(
    workspaceId: string,
    specId: string,
    actorUserId: string,
    targetStatus: SpecStatus,
  ): Promise<TechnicalSpecification> {
    const spec = await this.specRepository.findById(workspaceId, specId);
    if (!spec) {
      throw new SpecNotFoundError();
    }

    if (targetStatus === "APPROVED") {
      await this.verifyUserRole(workspaceId, actorUserId, "ADMIN");
    } else {
      await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");
    }

    const updated = await this.specRepository.updateStatus(
      workspaceId,
      specId,
      targetStatus,
    );
    if (!updated) throw new SpecNotFoundError();
    return updated;
  }

  // --------------------------------------------------------------------------
  // LINKING ENGINE
  // --------------------------------------------------------------------------

  async linkAdrToSpec(
    workspaceId: string,
    adrId: string,
    specId: string,
    actorUserId: string,
  ): Promise<AdrSpecLink> {
    await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");

    const adr = await this.adrRepository.findById(workspaceId, adrId);
    if (!adr) throw new AdrNotFoundError();

    const spec = await this.specRepository.findById(workspaceId, specId);
    if (!spec) throw new SpecNotFoundError();

    if (adr.workspaceId !== workspaceId || spec.workspaceId !== workspaceId) {
      throw new ArchitectureTenantMismatchError();
    }

    if (adr.projectId !== null && adr.projectId !== spec.projectId) {
      throw new ArchitectureProjectMismatchError(
        "Cannot link project-scoped ADR to a Spec belonging to a different project.",
      );
    }

    const existing = await this.linkRepository.findAdrSpecLink(
      workspaceId,
      adrId,
      specId,
    );
    if (existing) {
      throw new DuplicateArchitectureLinkError();
    }

    return this.linkRepository.createAdrSpecLink({ workspaceId, adrId, specId });
  }

  async linkSpecToWorkItem(
    workspaceId: string,
    specId: string,
    workItemId: string,
    actorUserId: string,
  ): Promise<SpecWorkItemLink> {
    await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");

    const spec = await this.specRepository.findById(workspaceId, specId);
    if (!spec) throw new SpecNotFoundError();

    if (!this.workItemRepository) {
      throw new ArchitectureError("WorkItemRepository is required for WorkItem linking.");
    }

    const workItem = await this.workItemRepository.findById(workspaceId, workItemId);
    if (!workItem) {
      throw new ArchitectureTenantMismatchError("WorkItem not found within the specified workspace tenant.");
    }

    if (spec.workspaceId !== workspaceId || workItem.workspaceId !== workspaceId) {
      throw new ArchitectureTenantMismatchError();
    }

    if (spec.projectId !== workItem.projectId) {
      throw new ArchitectureProjectMismatchError(
        "Cannot link Spec to a WorkItem belonging to a different project.",
      );
    }

    const existing = await this.linkRepository.findSpecWorkItemLink(
      workspaceId,
      specId,
      workItemId,
    );
    if (existing) {
      throw new DuplicateArchitectureLinkError();
    }

    return this.linkRepository.createSpecWorkItemLink({
      workspaceId,
      specId,
      workItemId,
    });
  }

  async linkAdrToWorkItem(
    workspaceId: string,
    adrId: string,
    workItemId: string,
    actorUserId: string,
  ): Promise<AdrWorkItemLink> {
    await this.verifyUserRole(workspaceId, actorUserId, "DEVELOPER");

    const adr = await this.adrRepository.findById(workspaceId, adrId);
    if (!adr) throw new AdrNotFoundError();

    if (!this.workItemRepository) {
      throw new ArchitectureError("WorkItemRepository is required for WorkItem linking.");
    }

    const workItem = await this.workItemRepository.findById(workspaceId, workItemId);
    if (!workItem) {
      throw new ArchitectureTenantMismatchError("WorkItem not found within the specified workspace tenant.");
    }

    if (adr.workspaceId !== workspaceId || workItem.workspaceId !== workspaceId) {
      throw new ArchitectureTenantMismatchError();
    }

    if (adr.projectId !== null && adr.projectId !== workItem.projectId) {
      throw new ArchitectureProjectMismatchError(
        "Cannot link project-scoped ADR to a WorkItem belonging to a different project.",
      );
    }

    const existing = await this.linkRepository.findAdrWorkItemLink(
      workspaceId,
      adrId,
      workItemId,
    );
    if (existing) {
      throw new DuplicateArchitectureLinkError();
    }

    return this.linkRepository.createAdrWorkItemLink({
      workspaceId,
      adrId,
      workItemId,
    });
  }
}
