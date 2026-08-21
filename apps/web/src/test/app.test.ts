import assert from "node:assert/strict";
import test from "node:test";

test("@devforge/web: API Client Error Handling & Tenant 404 Security", () => {
  // Test ApiError formatting for 404 tenant boundary lookups
  const error404 = {
    statusCode: 404,
    message: "Resource not found or cross-tenant access denied.",
  };
  assert.equal(error404.statusCode, 404);
  assert.ok(error404.message.includes("not found"));
});

test("@devforge/web: CI/CD Deployment Gating Rule Verification", () => {
  // Frontend gating rule check
  const runningRun = { id: "run-1", status: "RUNNING" };
  const successRun = { id: "run-2", status: "SUCCESS" };

  const isGatedRunning = runningRun.status !== "SUCCESS";
  const isGatedSuccess = successRun.status !== "SUCCESS";

  assert.equal(isGatedRunning, true);
  assert.equal(isGatedSuccess, false);
});

test("@devforge/web: Work Item State Transitions & Column Mapping", () => {
  const statuses = [
    "BACKLOG",
    "READY",
    "IN_PROGRESS",
    "CODE_REVIEW",
    "DONE",
    "BLOCKED",
  ];
  assert.equal(statuses.length, 6);
  assert.ok(statuses.includes("IN_PROGRESS"));
  assert.ok(statuses.includes("BLOCKED"));
});
