// src/shared/services/reporting/templates/contracts/LocalizationConfiguration.ts
export interface LocalizationConfiguration {
  readonly locale: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly numberFormat: string;
}
