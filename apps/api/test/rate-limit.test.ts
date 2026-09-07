import assert from "node:assert/strict";
import test from "node:test";

import { isRateLimited } from "../src/middleware/rate-limit.js";

test("allows requests through the configured local limit", async () => {
  const ip = `test-allowed-${Date.now()}`;
  assert.equal(await isRateLimited(ip, "test", 2, 10_000), false);
  assert.equal(await isRateLimited(ip, "test", 2, 10_000), false);
});

test("blocks requests after the configured local limit", async () => {
  const ip = `test-blocked-${Date.now()}`;
  assert.equal(await isRateLimited(ip, "test", 1, 10_000), false);
  assert.equal(await isRateLimited(ip, "test", 1, 10_000), true);
});
