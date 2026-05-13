import type { LlmProviderName } from "@sentinel/llm";
import { defaultProviderPreferences, TASK_TYPES, type ProviderPreferences, type SentinelTaskType } from "./provider-state.js";

export interface MementoLike {
  get<T>(key: string, defaultValue?: T): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

const STORAGE_KEY = "sentinel.provider.preferences";

export interface ProviderPreferencesInput {
  defaultProvider?: LlmProviderName;
  syncTarget?: string;
  modelAssignments?: Partial<Record<SentinelTaskType, string>>;
}

export class ProviderPreferencesStore {
  constructor(private readonly memento: MementoLike) {}

  async load(): Promise<ProviderPreferences> {
    const stored = this.memento.get<Partial<ProviderPreferences>>(STORAGE_KEY);
    if (!stored) {
      return defaultProviderPreferences();
    }
    const fallback = defaultProviderPreferences();
    const mergedAssignments = { ...fallback.modelAssignments };
    for (const task of TASK_TYPES) {
      const value = stored.modelAssignments?.[task];
      mergedAssignments[task] = typeof value === "string" ? value : fallback.modelAssignments[task];
    }
    return {
      defaultProvider: stored.defaultProvider ?? fallback.defaultProvider,
      modelAssignments: mergedAssignments,
      syncTarget: stored.syncTarget ?? fallback.syncTarget
    };
  }

  async save(input: ProviderPreferencesInput): Promise<ProviderPreferences> {
    const current = await this.load();
    const next: ProviderPreferences = {
      defaultProvider: input.defaultProvider ?? current.defaultProvider,
      modelAssignments: {
        ...current.modelAssignments,
        ...(input.modelAssignments ?? {})
      },
      syncTarget: input.syncTarget ?? current.syncTarget
    };
    await this.memento.update(STORAGE_KEY, next);
    return next;
  }
}
