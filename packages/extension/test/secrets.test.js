import assert from "node:assert/strict";
import test from "node:test";
import { SentinelSecretStore } from "../dist/secrets.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    async get(key) {
      return map.get(key);
    },
    async store(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    dump() {
      return map;
    }
  };
}

test("provider secrets are stored and removed from the secret store", async () => {
  const storage = createMemoryStorage();
  const store = new SentinelSecretStore(storage);

  await store.save("gemini", "  gemini-secret  ");
  let secrets = await store.loadSecrets();
  assert.equal(secrets.gemini, "gemini-secret");
  assert.equal((await store.loadSecretStatus()).gemini.masked, "******** (13 chars)");

  await store.clear("gemini");
  secrets = await store.loadSecrets();
  assert.equal(secrets.gemini, undefined);
  assert.equal((await store.loadSecretStatus()).gemini.configured, false);
});
