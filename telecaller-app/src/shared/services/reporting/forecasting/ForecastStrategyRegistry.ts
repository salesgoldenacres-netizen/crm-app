// src/shared/services/reporting/forecasting/ForecastStrategyRegistry.ts
import { ForecastStrategy } from "./contracts/ForecastStrategy";
import { ForecastStrategyNotFoundError } from "./ForecastErrors";
import { MovingAverageForecastStrategy } from "./strategies/MovingAverageForecastStrategy";
import { LinearTrendForecastStrategy } from "./strategies/LinearTrendForecastStrategy";

export class ForecastStrategyRegistry {
  private strategies = new Map<string, ForecastStrategy>();

  public register(strategy: ForecastStrategy): void {
    const name = strategy.metadata.name;
    if (this.strategies.has(name)) {
      throw new Error(`[ForecastStrategyRegistry] Strategy ${name} is already registered.`);
    }
    this.strategies.set(name, strategy);
  }

  public getStrategy(name: string): ForecastStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new ForecastStrategyNotFoundError(`[ForecastStrategyRegistry] Strategy ${name} not found.`);
    }
    return strategy;
  }

  public clear(): void {
    this.strategies.clear();
  }
}

const defaultRegistry = new ForecastStrategyRegistry();
defaultRegistry.register(new MovingAverageForecastStrategy());
defaultRegistry.register(new LinearTrendForecastStrategy());

export default defaultRegistry;
export { defaultRegistry as forecastStrategyRegistry };
