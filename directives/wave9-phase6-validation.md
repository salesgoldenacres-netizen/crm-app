# Wave 9 Phase 6 Validation

Validation checklist for delivery providers and transport adapters:

- **Factory Creation**: `providers.test.ts` validates builder registration and constructor DI.
- **Capabilities Checks**: Size limits validate correctly, rejecting oversized requests.
- **Decorator Timeouts**: Reusable `TimeoutTransportDecorator` cancels execution when limit is reached.
- **Metadata Inspection**: Every provider exposes correct capability metadata.
