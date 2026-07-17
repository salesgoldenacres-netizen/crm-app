// src/shared/services/reporting/forecasting/MetricSeriesExtractor.ts
import { Report } from "../contracts/Report";
import { MetricSeries } from "./contracts/MetricSeries";
import { MetricObservation } from "./contracts/MetricObservation";
import { ForecastValidationError } from "./ForecastErrors";

export class MetricSeriesExtractor {
  constructor(
    private readonly keys = {
      timestampKey: "timestamp",
      metricKey: "metric",
      valueKey: "value",
    }
  ) {}

  public extract(report: Report<any>): readonly MetricSeries[] {
    if (!report || !report.rows) {
      throw new ForecastValidationError("[MetricSeriesExtractor] Invalid report or missing rows.");
    }

    const groups = new Map<string, { observations: MetricObservation[]; unit: string; source: string }>();

    for (let index = 0; index < report.rows.length; index++) {
      const row = report.rows[index];
      if (!row || typeof row !== "object") {
        throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} is not an object.`);
      }

      const metricName = row[this.keys.metricKey] || row["name"];
      if (!metricName || typeof metricName !== "string" || metricName.trim() === "") {
        throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} contains an empty or invalid metric name.`);
      }

      const rawTimestamp = row[this.keys.timestampKey] || row["date"] || row["timestamp"];
      if (!rawTimestamp) {
        throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} is missing a timestamp.`);
      }
      const parsedTime = Date.parse(rawTimestamp);
      if (isNaN(parsedTime)) {
        throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} contains an invalid timestamp: ${rawTimestamp}.`);
      }
      const timestamp = new Date(parsedTime).toISOString();

      const rawValue = row[this.keys.valueKey];
      let value: number | null = null;
      if (rawValue !== undefined && rawValue !== null) {
        value = Number(rawValue);
        if (isNaN(value)) {
          throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} contains NaN for value.`);
        }
        if (!isFinite(value)) {
          throw new ForecastValidationError(`[MetricSeriesExtractor] Row at index ${index} contains Infinity for value.`);
        }
      }

      const unit = row["unit"] || "count";
      const source = row["source"] || report.title || "ReportService";

      let group = groups.get(metricName);
      if (!group) {
        group = { observations: [], unit, source };
        groups.set(metricName, group);
      }

      if (group.observations.some((o) => o.timestamp === timestamp)) {
        throw new ForecastValidationError(`[MetricSeriesExtractor] Duplicate timestamp ${timestamp} detected for metric ${metricName}.`);
      }

      group.observations.push({ timestamp, value });
    }

    const seriesList: MetricSeries[] = [];
    for (const [metricName, group] of groups.entries()) {
      const sortedObservations = [...group.observations].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

      seriesList.push(
        Object.freeze({
          metricName,
          unit: group.unit,
          source: group.source,
          observations: Object.freeze(sortedObservations),
        })
      );
    }

    return Object.freeze(seriesList);
  }
}
