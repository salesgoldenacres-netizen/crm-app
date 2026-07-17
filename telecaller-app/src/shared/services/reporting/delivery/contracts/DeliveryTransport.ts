// src/shared/services/reporting/delivery/contracts/DeliveryTransport.ts
export interface TransportResponse {
  readonly success: boolean;
  readonly reference?: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly error?: string;
}

export interface DeliveryTransport<TRequest, TResponse extends TransportResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
