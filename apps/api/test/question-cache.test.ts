import assert from "node:assert/strict";
import test from "node:test";

import { AsyncResourceCache, publicQuestionSql } from "../src/services/question-cache.js";

test("public question SQL excludes training-only fields", () => {
  assert.doesNotMatch(publicQuestionSql, /correct_answer/i);
  assert.doesNotMatch(publicQuestionSql, /explanation/i);
});

test("caches a loaded value", async () => {
  const cache = new AsyncResourceCache<string, string>({ maxEntries: 2, ttlMs: 10_000 });
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return "questions";
  };

  assert.deepEqual(await cache.get("exam-1", loader), { status: "miss", value: "questions" });
  assert.deepEqual(await cache.get("exam-1", loader), { status: "hit", value: "questions" });
  assert.equal(loads, 1);
});

test("coalesces concurrent cache misses", async () => {
  const cache = new AsyncResourceCache<string, string>({ maxEntries: 2, ttlMs: 10_000 });
  let resolveLoad: ((value: string) => void) | undefined;
  let loads = 0;
  const loader = () => {
    loads += 1;
    return new Promise<string>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = cache.get("exam-1", loader);
  const second = cache.get("exam-1", loader);
  resolveLoad?.("questions");

  assert.deepEqual(await first, { status: "miss", value: "questions" });
  assert.deepEqual(await second, { status: "coalesced", value: "questions" });
  assert.equal(loads, 1);
});

test("does not restore an invalidated in-flight value", async () => {
  const cache = new AsyncResourceCache<string, string>({ maxEntries: 2, ttlMs: 10_000 });
  let resolveLoad: ((value: string) => void) | undefined;
  const first = cache.get("exam-1", () => new Promise<string>((resolve) => {
    resolveLoad = resolve;
  }));

  cache.invalidate("exam-1");
  resolveLoad?.("old questions");
  await first;

  assert.deepEqual(
    await cache.get("exam-1", async () => "new questions"),
    { status: "miss", value: "new questions" },
  );
});

test("evicts the least recently used entry", async () => {
  const cache = new AsyncResourceCache<string, string>({ maxEntries: 2, ttlMs: 10_000 });
  await cache.get("exam-1", async () => "one");
  await cache.get("exam-2", async () => "two");
  await cache.get("exam-1", async () => "unused");
  await cache.get("exam-3", async () => "three");

  assert.deepEqual(await cache.get("exam-1", async () => "unused"), { status: "hit", value: "one" });
  assert.deepEqual(await cache.get("exam-2", async () => "two reloaded"), { status: "miss", value: "two reloaded" });
});
