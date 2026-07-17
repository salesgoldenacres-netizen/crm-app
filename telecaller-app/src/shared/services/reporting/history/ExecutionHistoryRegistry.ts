// src/shared/services/reporting/history/ExecutionHistoryRegistry.ts
import { ExecutionRecord } from "./contracts/ExecutionRecord";
import { DuplicateExecutionError, ExecutionNotFoundError } from "./HistoryErrors";

export class ExecutionHistoryRegistry {
  private records = new Map<string, ExecutionRecord>();

  public getRecord(executionId: string): ExecutionRecord | undefined {
    const record = this.records.get(executionId);
    return record ? Object.freeze(record) : undefined;
  }

  public getRecordsByCorrelationId(correlationId: string): readonly ExecutionRecord[] {
    const matched: ExecutionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.correlationId === correlationId) {
        matched.push(Object.freeze(record));
      }
    }
    return matched;
  }

  public getRecordsByJobId(jobId: string): readonly ExecutionRecord[] {
    const matched: ExecutionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.jobId === jobId) {
        matched.push(Object.freeze(record));
      }
    }
    return matched;
  }

  public addRecord(record: ExecutionRecord): void {
    if (this.records.has(record.executionId)) {
      throw new DuplicateExecutionError(`[ExecutionHistoryRegistry] Record already exists: ${record.executionId}`);
    }
    this.records.set(record.executionId, Object.freeze({ ...record }));
  }

  public updateRecord(record: ExecutionRecord): void {
    if (!this.records.has(record.executionId)) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryRegistry] Record not found: ${record.executionId}`);
    }
    this.records.set(record.executionId, Object.freeze({ ...record }));
  }

  public clear(): void {
    this.records.clear();
  }
}

const defaultRegistry = new ExecutionHistoryRegistry();
export default defaultRegistry;
export { defaultRegistry as executionHistoryRegistry };
