export class ArchitectureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AdrNotFoundError extends ArchitectureError {
  constructor(message = "Architecture Decision Record not found.") {
    super(message);
  }
}

export class SpecNotFoundError extends ArchitectureError {
  constructor(message = "Technical Specification not found.") {
    super(message);
  }
}

export class ArchitectureDecisionImmutableError extends ArchitectureError {
  constructor(
    message = "ACCEPTED or REJECTED Architecture Decisions cannot be modified.",
  ) {
    super(message);
  }
}

export class TechnicalSpecificationImmutableError extends ArchitectureError {
  constructor(
    message = "APPROVED Technical Specifications cannot be modified.",
  ) {
    super(message);
  }
}

export class ArchitectureTenantMismatchError extends ArchitectureError {
  constructor(
    message = "Cannot link entities across different workspace tenants.",
  ) {
    super(message);
  }
}

export class ArchitectureProjectMismatchError extends ArchitectureError {
  constructor(
    message = "Cannot link entities across different project contexts.",
  ) {
    super(message);
  }
}

export class DuplicateArchitectureLinkError extends ArchitectureError {
  constructor(message = "Link already exists between these entities.") {
    super(message);
  }
}

export class ArchitecturePermissionDeniedError extends ArchitectureError {
  constructor(
    message = "Required role permission to perform this architecture action is missing.",
  ) {
    super(message);
  }
}
