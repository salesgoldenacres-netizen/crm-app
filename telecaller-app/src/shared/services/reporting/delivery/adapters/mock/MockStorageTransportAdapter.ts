// src/shared/services/reporting/delivery/adapters/mock/MockStorageTransportAdapter.ts
import { StorageTransportAdapter, StorageUploadRequest, StorageUploadResponse } from "../StorageTransportAdapter";

export class MockStorageTransportAdapter implements StorageTransportAdapter {
  public async execute(request: StorageUploadRequest): Promise<StorageUploadResponse> {
    const start = performance.now();
    return {
      success: true,
      objectKey: `${request.path}/${request.exportResult.filename}`,
      reference: "mock_gcs_bucket",
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
    };
  }
}
