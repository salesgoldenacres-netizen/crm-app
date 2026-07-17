// src/shared/services/reporting/delivery/adapters/mock/MockEmailTransportAdapter.ts
import { EmailTransportAdapter, EmailTransportRequest, EmailTransportResponse } from "../EmailTransportAdapter";

export class MockEmailTransportAdapter implements EmailTransportAdapter {
  constructor(private readonly shouldFail: boolean = false) {}

  public async execute(_request: EmailTransportRequest): Promise<EmailTransportResponse> {
    const start = performance.now();
    if (this.shouldFail) {
      throw new Error("SMTP Auth Failure");
    }
    return {
      success: true,
      messageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
      reference: "mock_smtp_server",
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
    };
  }
}
