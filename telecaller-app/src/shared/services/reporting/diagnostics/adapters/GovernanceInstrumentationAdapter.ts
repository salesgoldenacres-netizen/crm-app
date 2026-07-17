// src/shared/services/reporting/diagnostics/adapters/GovernanceInstrumentationAdapter.ts

import { InstrumentationMiddleware } from "./InstrumentationMiddleware";
import { TraceSession } from "../TraceOrchestrator";
import { SpanKind } from "../contracts/SpanKind";

/**
 * Passive instrumentation adapter for the governance subsystem.
 *
 * Wraps lifecycle governance checks, migration planning, version compatibility
 * analysis, and constraint validation with Governance/Validation-kind spans,
 * providing per-operation timing and failure attribution for policy enforcement.
 */
export class GovernanceInstrumentationAdapter {
  private readonly _middleware: InstrumentationMiddleware;

  constructor(middleware: InstrumentationMiddleware) {
    this._middleware = middleware;
  }

  /**
   * Wraps a definition lifecycle validation check with a Governance-kind span.
   */
  public async instrumentLifecycleValidation<T>(
    session: TraceSession,
    definitionId: string,
    fromState: string,
    toState: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `governance.lifecycle.validate[${definitionId}]`,
      kind: SpanKind.Governance,
      metadata: { definitionId, fromState, toState },
    }, fn);
  }

  /**
   * Wraps a version constraint compatibility analysis with a Validation-kind span.
   */
  public async instrumentCompatibilityAnalysis<T>(
    session: TraceSession,
    sourceVersion: string,
    targetVersion: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `governance.compatibility[${sourceVersion}->${targetVersion}]`,
      kind: SpanKind.Validation,
      metadata: { sourceVersion, targetVersion },
    }, fn);
  }

  /**
   * Wraps a migration path planning operation with a Governance-kind span.
   */
  public async instrumentMigrationPlanning<T>(
    session: TraceSession,
    definitionId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `governance.migration.plan[${definitionId}]`,
      kind: SpanKind.Governance,
      metadata: { definitionId },
    }, fn);
  }

  /**
   * Wraps a version constraint evaluation with a Validation-kind span.
   */
  public async instrumentConstraintEvaluation<T>(
    session: TraceSession,
    constraint: string,
    version: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this._middleware.instrument(session, {
      spanName: `governance.constraint.eval[${constraint}]`,
      kind: SpanKind.Validation,
      metadata: { constraint, version },
    }, fn);
  }
}
