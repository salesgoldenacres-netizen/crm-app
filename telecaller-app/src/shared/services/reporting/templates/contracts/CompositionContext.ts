// src/shared/services/reporting/templates/contracts/CompositionContext.ts
import { BrandingConfiguration } from "./BrandingConfiguration";
import { LocalizationConfiguration } from "./LocalizationConfiguration";

export interface CompositionContext {
  readonly branding: BrandingConfiguration;
  readonly localization: LocalizationConfiguration;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly correlationId: string;
  readonly executionId: string;
  readonly cancellationToken?: { readonly isCancelled: boolean };
}
