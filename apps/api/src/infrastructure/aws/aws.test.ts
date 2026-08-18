import assert from "node:assert/strict";
import test from "node:test";

import { getRdsSslConfiguration } from "./ssl-config.js";
import { generateRdsIamAuthToken } from "./rds-iam-auth.js";

test("AWS Cloud Security: SSL Configuration Loader", () => {
  const localSsl = getRdsSslConfiguration();
  assert.equal(typeof localSsl.rejectUnauthorized, "boolean");
});

test("AWS Cloud Security: IAM DB Auth Token Generator API Structure", async () => {
  assert.equal(typeof generateRdsIamAuthToken, "function");
});
