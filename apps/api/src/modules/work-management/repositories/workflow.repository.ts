import type {
  CreateWorkflowInput,
  CreateWorkflowStateInput,
  CreateStateTransitionInput,
  StateTransition,
  Workflow,
  WorkflowState,
} from "../work-management.types.js";

export interface WorkflowRepository {
  createWorkflow(input: CreateWorkflowInput): Promise<Workflow>;
  findWorkflowById(workspaceId: string, workflowId: string): Promise<Workflow | null>;
  findDefaultWorkflow(workspaceId: string): Promise<Workflow | null>;
  findWorkflowsByWorkspace(workspaceId: string): Promise<Workflow[]>;
  updateWorkflow(workspaceId: string, workflowId: string, updates: Partial<Workflow>): Promise<Workflow | null>;

  createState(input: CreateWorkflowStateInput): Promise<WorkflowState>;
  findStateById(workflowId: string, stateId: string): Promise<WorkflowState | null>;
  findStatesByWorkflow(workflowId: string): Promise<WorkflowState[]>;
  findInitialState(workflowId: string): Promise<WorkflowState | null>;

  createTransition(input: CreateStateTransitionInput): Promise<StateTransition>;
  findTransition(workflowId: string, fromStateId: string, toStateId: string): Promise<StateTransition | null>;
  findTransitionsByWorkflow(workflowId: string): Promise<StateTransition[]>;
}
