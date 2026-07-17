// src/shared/services/reporting/delivery/DeliveryProviderFactory.ts
import { DeliveryProvider } from "./contracts/DeliveryProvider";
import { DeliveryProviderType } from "./contracts/DeliveryProviderType";

export type ProviderBuilder = () => DeliveryProvider;

export class DeliveryProviderFactory {
  private builders = new Map<DeliveryProviderType, ProviderBuilder>();

  public register(type: DeliveryProviderType, builder: ProviderBuilder): void {
    if (this.builders.has(type)) {
      throw new Error(`[DeliveryProviderFactory] Provider builder for type ${type} is already registered.`);
    }
    this.builders.set(type, builder);
  }

  public create(type: DeliveryProviderType): DeliveryProvider {
    const builder = this.builders.get(type);
    if (!builder) {
      throw new Error(`[DeliveryProviderFactory] No provider builder registered for type ${type}.`);
    }
    return builder();
  }

  public clear(): void {
    this.builders.clear();
  }
}

const defaultFactory = new DeliveryProviderFactory();
export default defaultFactory;
export { defaultFactory as deliveryProviderFactory };
