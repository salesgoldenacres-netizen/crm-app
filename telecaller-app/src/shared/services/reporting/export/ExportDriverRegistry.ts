// src/shared/services/reporting/export/ExportDriverRegistry.ts
import { ExportDriver } from "./contracts/ExportDriver";
import { ExportFormat } from "./contracts/ExportFormat";
import { CsvExportDriver } from "./drivers/CsvExportDriver";
import { ExcelExportDriver } from "./drivers/ExcelExportDriver";

export class ExportDriverRegistry {
  private drivers = new Map<ExportFormat, ExportDriver>();

  public getDriver(format: ExportFormat): ExportDriver | undefined {
    return this.drivers.get(format);
  }

  public register(format: ExportFormat, driver: ExportDriver): void {
    this.drivers.set(format, driver);
  }
}

// Instantiate and register default drivers once at startup to establish a singleton registry
const registry = new ExportDriverRegistry();
registry.register("csv", new CsvExportDriver());
registry.register("excel", new ExcelExportDriver());

export default registry;
export { registry as exportDriverRegistry };
