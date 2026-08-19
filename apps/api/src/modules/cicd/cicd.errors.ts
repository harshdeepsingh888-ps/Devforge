export class CicdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CicdError";
  }
}

export class PipelineNotFoundError extends CicdError {
  constructor(message = "Pipeline not found.") {
    super(message);
    this.name = "PipelineNotFoundError";
  }
}

export class PipelineRunNotFoundError extends CicdError {
  constructor(message = "Pipeline run not found.") {
    super(message);
    this.name = "PipelineRunNotFoundError";
  }
}

export class CicdTenantMismatchError extends CicdError {
  constructor(
    message = "Resource does not belong to the specified workspace tenant.",
  ) {
    super(message);
    this.name = "CicdTenantMismatchError";
  }
}

export class DuplicatePipelineError extends CicdError {
  constructor(
    message = "A pipeline with this external identifier already exists in the workspace.",
  ) {
    super(message);
    this.name = "DuplicatePipelineError";
  }
}

export class DuplicatePipelineRunError extends CicdError {
  constructor(
    message = "A pipeline run with this external run identifier already exists for this pipeline.",
  ) {
    super(message);
    this.name = "DuplicatePipelineRunError";
  }
}

export class PipelineRunNotSuccessfulError extends CicdError {
  constructor(
    message = "Deployment requires a successful pipeline run status.",
  ) {
    super(message);
    this.name = "PipelineRunNotSuccessfulError";
  }
}
