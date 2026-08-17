import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import {
  WorkflowMultipleInitialStatesError,
  WorkflowStateDuplicatePositionError,
  DuplicateStateTransitionError,
} from "../../work-management.errors.js";
import type {
  CreateStateTransitionInput,
  CreateWorkflowInput,
  CreateWorkflowStateInput,
  StateTransition,
  Workflow,
  WorkflowState,
} from "../../work-management.types.js";
import type { WorkflowRepository } from "../workflow.repository.js";

type WorkflowDatabaseClient = Pick<
  PrismaClient,
  "workflow" | "workflowState" | "stateTransition"
>;

function toWorkflowDomain(raw: any): Workflow {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    projectId: raw.projectId ?? null,
    name: raw.name,
    isDefault: raw.isDefault,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

function toStateDomain(raw: any): WorkflowState {
  return {
    id: raw.id,
    workflowId: raw.workflowId,
    name: raw.name,
    category: raw.category,
    position: raw.position,
    isInitial: raw.isInitial,
    isTerminal: raw.isTerminal,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

function toTransitionDomain(raw: any): StateTransition {
  return {
    id: raw.id,
    workflowId: raw.workflowId,
    fromStateId: raw.fromStateId,
    toStateId: raw.toStateId,
    name: raw.name ?? null,
    requiredRole: raw.requiredRole ?? null,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  };
}

export class PrismaWorkflowRepository implements WorkflowRepository {
  constructor(
    private readonly database: WorkflowDatabaseClient = prisma,
  ) {}

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    if (input.isDefault) {
      await this.database.workflow.updateMany({
        where: { workspaceId: input.workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const workflow = await this.database.workflow.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        name: input.name.trim(),
        isDefault: input.isDefault ?? false,
      },
    });

    // Auto-seed default states and transitions
    const backlog = await this.database.workflowState.create({
      data: {
        workflowId: workflow.id,
        name: "Backlog",
        category: "BACKLOG",
        position: 0,
        isInitial: true,
        isTerminal: false,
      },
    });

    const inProgress = await this.database.workflowState.create({
      data: {
        workflowId: workflow.id,
        name: "In Progress",
        category: "STARTED",
        position: 1,
        isInitial: false,
        isTerminal: false,
      },
    });

    const done = await this.database.workflowState.create({
      data: {
        workflowId: workflow.id,
        name: "Done",
        category: "COMPLETED",
        position: 2,
        isInitial: false,
        isTerminal: true,
      },
    });

    await this.database.stateTransition.createMany({
      data: [
        {
          workflowId: workflow.id,
          fromStateId: backlog.id,
          toStateId: inProgress.id,
        },
        {
          workflowId: workflow.id,
          fromStateId: inProgress.id,
          toStateId: done.id,
        },
      ],
    });

    return toWorkflowDomain(workflow);
  }

  async findWorkflowById(
    workspaceId: string,
    workflowId: string,
  ): Promise<Workflow | null> {
    const workflow = await this.database.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });
    return workflow ? toWorkflowDomain(workflow) : null;
  }

  async findDefaultWorkflow(workspaceId: string): Promise<Workflow | null> {
    const workflow = await this.database.workflow.findFirst({
      where: { workspaceId, isDefault: true },
    });
    return workflow ? toWorkflowDomain(workflow) : null;
  }

  async findWorkflowsByWorkspace(workspaceId: string): Promise<Workflow[]> {
    const workflows = await this.database.workflow.findMany({
      where: { workspaceId },
    });
    return workflows.map(toWorkflowDomain);
  }

  async updateWorkflow(
    workspaceId: string,
    workflowId: string,
    updates: Partial<Workflow>,
  ): Promise<Workflow | null> {
    const existing = await this.findWorkflowById(workspaceId, workflowId);
    if (!existing) return null;

    const updated = await this.database.workflow.update({
      where: { id: workflowId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
      },
    });
    return toWorkflowDomain(updated);
  }

  async createState(input: CreateWorkflowStateInput): Promise<WorkflowState> {
    if (input.isInitial) {
      const existingInitial = await this.database.workflowState.findFirst({
        where: { workflowId: input.workflowId, isInitial: true },
      });
      if (existingInitial) {
        throw new WorkflowMultipleInitialStatesError();
      }
    }

    const existingPos = await this.database.workflowState.findFirst({
      where: { workflowId: input.workflowId, position: input.position },
    });
    if (existingPos) {
      throw new WorkflowStateDuplicatePositionError();
    }

    const state = await this.database.workflowState.create({
      data: {
        workflowId: input.workflowId,
        name: input.name.trim(),
        category: input.category,
        position: input.position,
        isInitial: input.isInitial ?? false,
        isTerminal: input.isTerminal ?? false,
      },
    });

    return toStateDomain(state);
  }

  async findStateById(
    workflowId: string,
    stateId: string,
  ): Promise<WorkflowState | null> {
    const state = await this.database.workflowState.findFirst({
      where: { id: stateId, workflowId },
    });
    return state ? toStateDomain(state) : null;
  }

  async findStatesByWorkflow(workflowId: string): Promise<WorkflowState[]> {
    const states = await this.database.workflowState.findMany({
      where: { workflowId },
      orderBy: { position: "asc" },
    });
    return states.map(toStateDomain);
  }

  async findInitialState(workflowId: string): Promise<WorkflowState | null> {
    const state = await this.database.workflowState.findFirst({
      where: { workflowId, isInitial: true },
    });
    return state ? toStateDomain(state) : null;
  }

  async createTransition(
    input: CreateStateTransitionInput,
  ): Promise<StateTransition> {
    const existing = await this.findTransition(
      input.workflowId,
      input.fromStateId,
      input.toStateId,
    );
    if (existing) {
      throw new DuplicateStateTransitionError();
    }

    const transition = await this.database.stateTransition.create({
      data: {
        workflowId: input.workflowId,
        fromStateId: input.fromStateId,
        toStateId: input.toStateId,
        name: input.name ?? null,
        requiredRole: input.requiredRole ?? null,
      },
    });

    return toTransitionDomain(transition);
  }

  async findTransition(
    workflowId: string,
    fromStateId: string,
    toStateId: string,
  ): Promise<StateTransition | null> {
    const transition = await this.database.stateTransition.findFirst({
      where: { workflowId, fromStateId, toStateId },
    });
    return transition ? toTransitionDomain(transition) : null;
  }

  async findTransitionsByWorkflow(
    workflowId: string,
  ): Promise<StateTransition[]> {
    const transitions = await this.database.stateTransition.findMany({
      where: { workflowId },
    });
    return transitions.map(toTransitionDomain);
  }
}
