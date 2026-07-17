// src/shared/services/reporting/history/CorrelationIdGenerator.ts
export class CorrelationIdGenerator {
  public static generate(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }
}
