// src/shared/services/reporting/history/HistoryErrors.ts
export class HistoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HistoryError";
  }
}

export class ExecutionNotFoundError extends HistoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExecutionNotFoundError";
  }
}

export class InvalidExecutionStateError extends HistoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidExecutionStateError";
  }
}

export class DuplicateExecutionError extends HistoryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DuplicateExecutionError";
  }
}
