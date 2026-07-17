// src/shared/services/reporting/dataset/DatasetValidator.ts
import { DatasetKey } from "./contracts/DatasetKey";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { DatasetProviderResolver } from "./DatasetProviderResolver";

export interface DatasetValidationMessage {
  readonly severity: "INFO" | "WARNING" | "ERROR";
  readonly message: string;
}

export interface DatasetValidationResult {
  readonly valid: boolean;
  readonly messages: readonly DatasetValidationMessage[];
}

export class DatasetValidator {
  constructor(private readonly resolver: DatasetProviderResolver) {}

  public validateConfiguration(keys: readonly DatasetKey<DatasetFragment>[]): DatasetValidationResult {
    const messages: DatasetValidationMessage[] = [];
    let valid = true;

    const seenIds = new Set<string>();
    for (const key of keys) {
      if (seenIds.has(key.id)) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[DatasetValidator] Duplicate dataset key ID registered: ${key.id}`,
        });
      }
      seenIds.add(key.id);

      try {
        const provider = this.resolver.resolve(key);
        if (!provider) {
          valid = false;
          messages.push({
            severity: "ERROR",
            message: `[DatasetValidator] Resolved provider is undefined for key: ${key.id}`,
          });
        }
      } catch (err: any) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[DatasetValidator] Missing provider for dataset key: ${key.id}. Error: ${err.message}`,
        });
      }
    }

    return Object.freeze({
      valid,
      messages: Object.freeze(messages),
    });
  }

  public validateRuntimeOutputs(
    results: Map<string, DatasetFragment>,
    warnings: string[]
  ): DatasetValidationResult {
    const messages: DatasetValidationMessage[] = [];
    let valid = true;

    for (const warn of warnings) {
      messages.push({ severity: "WARNING", message: warn });
    }

    for (const [keyId, fragment] of results.entries()) {
      if (!fragment) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[DatasetValidator] Provider output is null or undefined for key: ${keyId}`,
        });
        continue;
      }

      if (!Object.isFrozen(fragment)) {
        valid = false;
        messages.push({
          severity: "ERROR",
          message: `[DatasetValidator] Fragment output is mutable for key: ${keyId}`,
        });
      }
    }

    return Object.freeze({
      valid,
      messages: Object.freeze(messages),
    });
  }
}
