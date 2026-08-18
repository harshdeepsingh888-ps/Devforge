import type {
  CreateSpecInput,
  SpecStatus,
  TechnicalSpecification,
  UpdateSpecInput,
} from "../architecture.types.js";

export interface TechnicalSpecificationRepository {
  create(input: CreateSpecInput): Promise<TechnicalSpecification>;

  findById(
    workspaceId: string,
    specId: string,
  ): Promise<TechnicalSpecification | null>;

  findByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<TechnicalSpecification[]>;

  update(
    workspaceId: string,
    specId: string,
    updates: UpdateSpecInput,
  ): Promise<TechnicalSpecification | null>;

  updateStatus(
    workspaceId: string,
    specId: string,
    status: SpecStatus,
  ): Promise<TechnicalSpecification | null>;

  delete(workspaceId: string, specId: string): Promise<boolean>;
}
