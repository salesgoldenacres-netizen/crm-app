# Definition Lifecycle

This directive defines the lifecycle states and transitions for registered reporting assets.

## Lifecycle States
- **Experimental**: Newly created definition, prone to changes.
- **Active**: Fully supported, currently recommended for use.
- **Deprecated**: Active but deprecated. Generates compatibility warnings.
- **Sunset**: Policy restrictions apply. Mandatory migration suggested.
- **Removed**: No longer registerable or executable.

## State Transition Machine
```text
Experimental ──► Active ──► Deprecated ──► Sunset ──► Removed
```
Transitions can only progress forward. Backwards lifecycle rollbacks (e.g. Sunset -> Active) are blocked by the validator.
