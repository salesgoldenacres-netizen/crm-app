# Provider Implementations

This directive details the implementation rules for concrete delivery providers.

## Key Responsibilities
- Validate capabilities and request size constraints.
- Translate domain-specific `ExportResult` payloads into transport-specific request contracts.
- Forward requests to respective transport adapters decorated with timeout handlers.
- Map transport responses back to generic `DeliveryResult` objects.
