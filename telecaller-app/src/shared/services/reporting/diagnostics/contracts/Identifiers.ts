// src/shared/services/reporting/diagnostics/contracts/Identifiers.ts

export class TraceId {
  public readonly value: string;

  constructor(value: string) {
    if (!value) throw new Error("[TraceId] Value cannot be empty");
    this.value = value;
    Object.freeze(this);
  }

  public static generate(): TraceId {
    return new TraceId(`trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  }

  public equals(other: TraceId): boolean {
    return this.value === other.value;
  }
}

export class SpanId {
  public readonly value: string;

  constructor(value: string) {
    if (!value) throw new Error("[SpanId] Value cannot be empty");
    this.value = value;
    Object.freeze(this);
  }

  public static generate(): SpanId {
    return new SpanId(`span_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  }

  public equals(other: SpanId): boolean {
    return this.value === other.value;
  }
}

export class ExecutionId {
  public readonly value: string;

  constructor(value: string) {
    if (!value) throw new Error("[ExecutionId] Value cannot be empty");
    this.value = value;
    Object.freeze(this);
  }

  public static generate(): ExecutionId {
    return new ExecutionId(`exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  }

  public equals(other: ExecutionId): boolean {
    return this.value === other.value;
  }
}

export class CorrelationId {
  public readonly value: string;

  constructor(value: string) {
    if (!value) throw new Error("[CorrelationId] Value cannot be empty");
    this.value = value;
    Object.freeze(this);
  }

  public static generate(): CorrelationId {
    return new CorrelationId(`corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  }

  public equals(other: CorrelationId): boolean {
    return this.value === other.value;
  }
}
