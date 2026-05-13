import assert from "node:assert/strict";
import test from "node:test";
import { ProviderPreferencesStore } from "../dist/provider-preferences.js";

function createMemoryMemento() {
  const map = new Map();
  return {
    get(key) {
      return map.get(key);
    },
    async update(key, value) {
      map.set(key, value);
    }
  };
}

test("provider preferences persist default provider, model assignments, and sync target", async () => {
  const store = new ProviderPreferencesStore(createMemoryMemento());

  const saved = await store.save({
    defaultProvider: "openrouter",
    syncTarget: "/tmp/sync",
    modelAssignments: {
      contradictionDetection: "gpt-4o-mini",
      promptCompression: "claude-3-5-sonnet"
    }
  });

  assert.equal(saved.defaultProvider, "openrouter");
  assert.equal(saved.syncTarget, "/tmp/sync");
  assert.equal(saved.modelAssignments.contradictionDetection, "gpt-4o-mini");
  assert.equal(saved.modelAssignments.promptCompression, "claude-3-5-sonnet");

  const loaded = await store.load();
  assert.equal(loaded.defaultProvider, "openrouter");
  assert.equal(loaded.modelAssignments.vaultSummarization, "");
});
