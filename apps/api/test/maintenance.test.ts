import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";

import { getRequestIps } from "../src/app.js";

function requestWithIps(headers: Record<string, string>, socketIp = "::1") {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    ip: socketIp,
    socket: { remoteAddress: socketIp },
  } as unknown as Request;
}

test("uses forwarded visitor addresses instead of the proxy loopback address", () => {
  const request = requestWithIps({ "x-forwarded-for": "203.0.113.77" });
  assert.deepEqual(getRequestIps(request), ["203.0.113.77"]);
});

test("falls back to the socket address when no forwarding header exists", () => {
  const request = requestWithIps({}, "127.0.0.1");
  assert.deepEqual(getRequestIps(request), ["127.0.0.1"]);
});
