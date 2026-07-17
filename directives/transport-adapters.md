# Transport Adapters

This directive details the transport adapters boundary rules.

## Core Rules
- **Decoupled from Domain**: Transport adapters must never import `ExportResult` or reporting types.
- **Generic Protocol**: Implement the `DeliveryTransport<TRequest, TResponse>` pattern.
- **SDK Isolation**: Raw SDK modules (e.g. AWS, SendGrid) reside exclusively inside adapter implementations.
