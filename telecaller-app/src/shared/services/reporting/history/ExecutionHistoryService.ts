// src/shared/services/reporting/history/ExecutionHistoryService.ts
import { ExecutionRecord } from "./contracts/ExecutionRecord";
import { DeliveryRecord, DeliveryStatus } from "./contracts/DeliveryRecord";
import { ExecutionSummary } from "./contracts/ExecutionSummary";
import defaultRegistry, { ExecutionHistoryRegistry } from "./ExecutionHistoryRegistry";
import { CorrelationIdGenerator } from "./CorrelationIdGenerator";
import { ScheduleTriggerType } from "../scheduling/contracts/ScheduleDefinition";
import { DeliveryProviderType } from "../delivery/contracts/DeliveryProviderType";
import { InvalidExecutionStateError, ExecutionNotFoundError } from "./HistoryErrors";

export interface ExportDetail {
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
}

export class ExecutionHistoryService {
  private exportDetails = new Map<string, ExportDetail>();
  private deliveryRecords = new Map<string, DeliveryRecord>();

  constructor(private readonly registry: ExecutionHistoryRegistry = defaultRegistry) {}

  public async startExecution(
    jobId: string,
    triggerType: ScheduleTriggerType,
    correlationId?: string,
    executionId?: string
  ): Promise<ExecutionRecord> {
    const id = executionId || `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const corrId = correlationId || CorrelationIdGenerator.generate();
    const record: ExecutionRecord = {
      executionId: id,
      correlationId: corrId,
      jobId,
      startedAt: new Date().toISOString(),
      status: "running",
      triggerType,
    };
    this.registry.addRecord(record);
    return record;
  }

  public async completeExecution(executionId: string, durationMs: number): Promise<ExecutionRecord> {
    const record = this.registry.getRecord(executionId);
    if (!record) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryService] Execution record ${executionId} not found.`);
    }
    if (record.status !== "running") {
      throw new InvalidExecutionStateError(`[ExecutionHistoryService] Execution ${executionId} is not running.`);
    }
    const updated: ExecutionRecord = {
      ...record,
      status: "completed",
      completedAt: new Date().toISOString(),
      durationMs,
    };
    this.registry.updateRecord(updated);
    return updated;
  }

  public async failExecution(executionId: string, durationMs: number, error: string): Promise<ExecutionRecord> {
    const record = this.registry.getRecord(executionId);
    if (!record) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryService] Execution record ${executionId} not found.`);
    }
    if (record.status !== "running") {
      throw new InvalidExecutionStateError(`[ExecutionHistoryService] Execution ${executionId} is not running.`);
    }
    const updated: ExecutionRecord = {
      ...record,
      status: "failed",
      completedAt: new Date().toISOString(),
      durationMs,
      error,
    };
    this.registry.updateRecord(updated);
    return updated;
  }

  public async recordExport(
    executionId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    durationMs: number
  ): Promise<ExportDetail> {
    const record = this.registry.getRecord(executionId);
    if (!record) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryService] Execution record ${executionId} not found.`);
    }
    const exportDetail = Object.freeze({ filename, mimeType, sizeBytes, durationMs });
    this.exportDetails.set(executionId, exportDetail);
    return exportDetail;
  }

  public async recordDelivery(
    executionId: string,
    provider: DeliveryProviderType,
    status: DeliveryStatus,
    durationMs: number,
    reference?: string,
    error?: string
  ): Promise<DeliveryRecord> {
    const record = this.registry.getRecord(executionId);
    if (!record) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryService] Execution record ${executionId} not found.`);
    }
    const deliveryRecord: DeliveryRecord = Object.freeze({
      provider,
      status,
      deliveredAt: new Date().toISOString(),
      durationMs,
      reference,
      error,
    });
    this.deliveryRecords.set(executionId, deliveryRecord);
    return deliveryRecord;
  }

  public async getSummary(executionId: string): Promise<ExecutionSummary> {
    const record = this.registry.getRecord(executionId);
    if (!record) {
      throw new ExecutionNotFoundError(`[ExecutionHistoryService] Execution record ${executionId} not found.`);
    }
    if (record.status !== "completed" && record.status !== "failed") {
      throw new InvalidExecutionStateError(`[ExecutionHistoryService] Execution ${executionId} has not completed/failed.`);
    }

    const exp = this.exportDetails.get(executionId);
    const del = this.deliveryRecords.get(executionId);

    const metrics = {
      totalDurationMs: record.durationMs || 0,
      executionDurationMs: (record.durationMs || 0) - (exp?.durationMs || 0) - (del?.durationMs || 0),
      exportDurationMs: exp?.durationMs,
      deliveryDurationMs: del?.durationMs,
    };

    return Object.freeze({
      execution: record,
      export: exp,
      delivery: del,
      metrics,
    });
  }

  public async queryByExecutionId(executionId: string): Promise<ExecutionRecord | undefined> {
    return this.registry.getRecord(executionId);
  }

  public async queryByCorrelationId(correlationId: string): Promise<readonly ExecutionRecord[]> {
    return this.registry.getRecordsByCorrelationId(correlationId);
  }

  public async queryByJobId(jobId: string): Promise<readonly ExecutionRecord[]> {
    return this.registry.getRecordsByJobId(jobId);
  }

  public clear(): void {
    this.exportDetails.clear();
    this.deliveryRecords.clear();
    this.registry.clear();
  }
}

export const executionHistoryService = new ExecutionHistoryService();
