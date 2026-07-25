import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../app.js";
import { InMemoryProjectRepository } from "./project.repository.js";

test("GET /api/projects returns an empty project list", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,

    },
    projectRepository: new InMemoryProjectRepository(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/projects",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    data: [],
  });
});

test("POST /api/projects creates an active project", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,

    },
    projectRepository: new InMemoryProjectRepository(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: " DevForge ",
      description: " Developer operating system ",
    },
  });

  assert.equal(response.statusCode, 201);

  const body = response.json<{
    data: {
      id: string;
      name: string;
      description: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
  }>();

  assert.ok(body.data.id);
  assert.equal(body.data.name, "DevForge");
  assert.equal(
    body.data.description,
    "Developer operating system",
  );
  assert.equal(body.data.status, "ACTIVE");
  assert.equal(
    Number.isNaN(Date.parse(body.data.createdAt)),
    false,
  );
  assert.equal(body.data.createdAt, body.data.updatedAt);
});

test("GET /api/projects returns previously created projects", async (t) => {
  const repository = new InMemoryProjectRepository();

  const app = buildApp({
    serverOptions: {
      logger: false,

    },
    projectRepository: repository,
  });

  t.after(async () => {
    await app.close();
  });

  await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: "DevForge",
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/projects",
  });

  assert.equal(response.statusCode, 200);

  const body = response.json<{
    data: Array<{
      name: string;
      description: string | null;
      status: string;
    }>;
  }>();

  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.name, "DevForge");
  assert.equal(body.data[0]?.description, null);
  assert.equal(body.data[0]?.status, "ACTIVE");
});

test("POST /api/projects rejects a whitespace-only name", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,

    },
    projectRepository: new InMemoryProjectRepository(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: "   ",
    },
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "VALIDATION_ERROR",
    message: "Project name cannot be empty.",
  });
});

test("POST /api/projects rejects an unknown property", async (t) => {
  const app = buildApp({
    serverOptions: {
      logger: false,

    },
    projectRepository: new InMemoryProjectRepository(),
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: {
      name: "DevForge",
      unsupportedField: true,
    },
  });

  assert.equal(response.statusCode, 400);
});
