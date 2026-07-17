// src/shared/services/reporting/delivery/adapters/TimeoutTransportDecorator.ts
import { DeliveryTransport, TransportResponse } from "../contracts/DeliveryTransport";

export class TimeoutTransportDecorator<TRequest, TResponse extends TransportResponse>
  implements DeliveryTransport<TRequest, TResponse>
{
  constructor(
    private readonly decoratee: DeliveryTransport<TRequest, TResponse>,
    private readonly timeoutMs: number
  ) {}

  public async execute(request: TRequest): Promise<TResponse> {
    if (this.timeoutMs <= 0) {
      return this.decoratee.execute(request);
    }

    return new Promise<TResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[TimeoutTransportDecorator] Transport operation timed out after ${this.timeoutMs}ms.`));
      }, this.timeoutMs);

      this.decoratee
        .execute(request)
        .then((response) => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
