import { randomUUID } from "node:crypto";

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

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private readonly workflows = new Map<string, Workflow>();
  private readonly states = new Map<string, WorkflowState>();
  private readonly transitions = new Map<string, StateTransition>();

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    const timestamp = new Date().toISOString();
    const workflow: Workflow = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      name: input.name.trim(),
      isDefault: input.isDefault ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (workflow.isDefault) {
      for (const existing of this.workflows.values()) {
        if (existing.workspaceId === input.workspaceId && existing.isDefault) {
          existing.isDefault = false;
        }
      }
    }

    this.workflows.set(workflow.id, workflow);

    // Automatically seed default states & transitions for new workflow
    const backlogState: WorkflowState = {
      id: randomUUID(),
      workflowId: workflow.id,
      name: "Backlog",
      category: "BACKLOG",
      position: 0,
      isInitial: true,
      isTerminal: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.states.set(backlogState.id, backlogState);

    const inProgressState: WorkflowState = {
      id: randomUUID(),
      workflowId: workflow.id,
      name: "In Progress",
      category: "STARTED",
      position: 1,
      isInitial: false,
      isTerminal: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.states.set(inProgressState.id, inProgressState);

    const doneState: WorkflowState = {
      id: randomUUID(),
      workflowId: workflow.id,
      name: "Done",
      category: "COMPLETED",
      position: 2,
      isInitial: false,
      isTerminal: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.states.set(doneState.id, doneState);

    const t1: StateTransition = {
      id: randomUUID(),
      workflowId: workflow.id,
      fromStateId: backlogState.id,
      toStateId: inProgressState.id,
      name: null,
      requiredRole: null,
      createdAt: timestamp,
    };
    this.transitions.set(t1.id, t1);

    const t2: StateTransition = {
      id: randomUUID(),
      workflowId: workflow.id,
      fromStateId: inProgressState.id,
      toStateId: doneState.id,
      name: null,
      requiredRole: null,
      createdAt: timestamp,
    };
    this.transitions.set(t2.id, t2);

    return workflow;
  }

  async findWorkflowById(
    workspaceId: string,
    workflowId: string,
  ): Promise<Workflow | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.workspaceId !== workspaceId) {
      return null;
    }
    return workflow;
  }

  async findDefaultWorkflow(workspaceId: string): Promise<Workflow | null> {
    for (const workflow of this.workflows.values()) {
      if (workflow.workspaceId === workspaceId && workflow.isDefault) {
        return workflow;
      }
    }
    return null;
  }

  async findWorkflowsByWorkspace(workspaceId: string): Promise<Workflow[]> {
    const results: Workflow[] = [];
    for (const workflow of this.workflows.values()) {
      if (workflow.workspaceId === workspaceId) {
        results.push(workflow);
      }
    }
    return results;
  }

  async updateWorkflow(
    workspaceId: string,
    workflowId: string,
    updates: Partial<Workflow>,
  ): Promise<Workflow | null> {
    const existing = await this.findWorkflowById(workspaceId, workflowId);
    if (!existing) {
      return null;
    }

    const updated: Workflow = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(workflowId, updated);
    return updated;
  }

  async createState(input: CreateWorkflowStateInput): Promise<WorkflowState> {
    const isInitial = input.isInitial ?? false;
    const isTerminal = input.isTerminal ?? false;

    if (isInitial) {
      for (const existing of this.states.values()) {
        if (existing.workflowId === input.workflowId && existing.isInitial) {
          throw new WorkflowMultipleInitialStatesError();
        }
      }
    }

    for (const existing of this.states.values()) {
      if (
        existing.workflowId === input.workflowId &&
        existing.position === input.position
      ) {
        throw new WorkflowStateDuplicatePositionError();
      }
    }

    const timestamp = new Date().toISOString();
    const state: WorkflowState = {
      id: randomUUID(),
      workflowId: input.workflowId,
      name: input.name.trim(),
      category: input.category,
      position: input.position,
      isInitial,
      isTerminal,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.states.set(state.id, state);
    return state;
  }

  async findStateById(
    workflowId: string,
    stateId: string,
  ): Promise<WorkflowState | null> {
    const state = this.states.get(stateId);
    if (!state || state.workflowId !== workflowId) {
      return null;
    }
    return state;
  }

  async findStatesByWorkflow(workflowId: string): Promise<WorkflowState[]> {
    const results: WorkflowState[] = [];
    for (const state of this.states.values()) {
      if (state.workflowId === workflowId) {
        results.push(state);
      }
    }
    return results.sort((a, b) => a.position - b.position);
  }

  async findInitialState(workflowId: string): Promise<WorkflowState | null> {
    for (const state of this.states.values()) {
      if (state.workflowId === workflowId && state.isInitial) {
        return state;
      }
    }
    return null;
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

    const transition: StateTransition = {
      id: randomUUID(),
      workflowId: input.workflowId,
      fromStateId: input.fromStateId,
      toStateId: input.toStateId,
      name: input.name ?? null,
      requiredRole: input.requiredRole ?? null,
      createdAt: new Date().toISOString(),
    };

    this.transitions.set(transition.id, transition);
    return transition;
  }

  async findTransition(
    workflowId: string,
    fromStateId: string,
    toStateId: string,
  ): Promise<StateTransition | null> {
    for (const transition of this.transitions.values()) {
      if (
        transition.workflowId === workflowId &&
        transition.fromStateId === fromStateId &&
        transition.toStateId === toStateId
      ) {
        return transition;
      }
    }
    return null;
  }

  async findTransitionsByWorkflow(
    workflowId: string,
  ): Promise<StateTransition[]> {
    const results: StateTransition[] = [];
    for (const transition of this.transitions.values()) {
      if (transition.workflowId === workflowId) {
        results.push(transition);
      }
    }
    return results;
  }
}
