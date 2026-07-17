// src/shared/services/reporting/templates/HookRegistry.ts
export interface CompositionHookContext {
  readonly templateId: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly stage: "beforeComposition" | "beforeSection" | "afterSection" | "afterComposition";
  readonly sectionId?: string;
  readonly generatedAt: string;
}

export interface CompositionHook {
  readonly id: string;
  execute(context: CompositionHookContext): Promise<void>;
}

export class HookRegistry {
  private hooks = new Map<string, CompositionHook[]>();

  constructor() {
    this.hooks.set("beforeComposition", []);
    this.hooks.set("beforeSection", []);
    this.hooks.set("afterSection", []);
    this.hooks.set("afterComposition", []);
  }

  public register(stage: "beforeComposition" | "beforeSection" | "afterSection" | "afterComposition", hook: CompositionHook): void {
    const list = this.hooks.get(stage);
    if (list) {
      list.push(hook);
    }
  }

  public getHooks(stage: "beforeComposition" | "beforeSection" | "afterSection" | "afterComposition"): readonly CompositionHook[] {
    return this.hooks.get(stage) || [];
  }

  public clear(): void {
    for (const key of this.hooks.keys()) {
      this.hooks.set(key as any, []);
    }
  }
}

const defaultHookRegistry = new HookRegistry();
export default defaultHookRegistry;
export { defaultHookRegistry as hookRegistry };
