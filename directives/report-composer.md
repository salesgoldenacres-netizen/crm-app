# Report Composer

This directive outlines composer engine execution behaviors.

## Composition Pipeline Stages
1. **Template Validation**: Evaluates layout config schemas and checks for cyclical dependencies.
2. **Dependency Resolution**: `CompositionExecutionPlanner` computes parallel groups based on `dependsOn` lists.
3. **Lifecycle Hooks**: Invokes hook context runs during execution stages (`beforeComposition`, `beforeSection`, `afterSection`, `afterComposition`).
4. **Section Building**: Runs builders in structured batches. Override output IDs to match template definitions.
5. **Runtime Validation**: Evaluates outputs, content nullness, and warnings.
6. **Deterministic Assembly**: Sorts compiled sections to match the template sequence before freezing.
