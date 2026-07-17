# Delivery Architecture (Wave 9 Phase 4)

This document diagrams the modular layout of the reporting delivery subsystem:

```text
JobExecutor ──> DeliveryService ──> DeliveryProviderRegistry ──> DeliveryProvider (Email / Storage / Webhook)
```

- **DeliveryService**: Coordinates formatting checks and resolves destination drivers.
- **DeliveryProvider**: Common transport-agnostic interface executing outbound streams.
- **DeliveryProviderRegistry**: Startup-registered registry map managing runtime delivery plugins.
- **DeliveryContext**: Encapsulates metadata structures (e.g. correlative tags, user auth details) cleanly.
