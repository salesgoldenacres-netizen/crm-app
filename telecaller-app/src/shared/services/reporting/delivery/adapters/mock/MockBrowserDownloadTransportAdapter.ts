// src/shared/services/reporting/delivery/adapters/mock/MockBrowserDownloadTransportAdapter.ts
import { BrowserDownloadTransportAdapter, BrowserDownloadRequest, BrowserDownloadResponse } from "../BrowserDownloadTransportAdapter";

export class MockBrowserDownloadTransportAdapter implements BrowserDownloadTransportAdapter {
  public async execute(request: BrowserDownloadRequest): Promise<BrowserDownloadResponse> {
    const start = performance.now();
    return {
      success: true,
      filename: request.exportResult.filename,
      downloaded: true,
      reference: "browser_link_click",
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
    };
  }
}
