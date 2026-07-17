// src/shared/services/reporting/templates/contracts/CompositionPlugin.ts
export interface CompositionPlugin {
  readonly id: string;
  readonly apiVersion: string;
  readonly pluginVersion: string;
  readonly minimumEngineVersion: string;
  readonly initialize?: () => Promise<void>;
  readonly dispose?: () => Promise<void>;
}
