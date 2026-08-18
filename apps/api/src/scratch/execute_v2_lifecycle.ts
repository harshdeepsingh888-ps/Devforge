import { prisma } from "../infrastructure/database/prisma.js";

const BASE_URL = "http://localhost:5000";

async function runLifecycle() {
  console.log("🔥 STARTING FULL V2 API LIFECYCLE EXECUTION 🔥\n");

  const email = `v2-owner-${Date.now()}@devforge.io`;
  const password = "Password@123456";

  // STEP 1: Auth (Register & Login)
  console.log("STEP 1: Register & Login");
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName: "V2 Lifecycle Owner" }),
  });
  const regData = await regRes.json() as any;
  console.log("Register Response Status:", regRes.status, "Registered Email:", regData.user?.email);

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json() as any;
  const token = loginData.accessToken ?? regData.accessToken;
  console.log("Login Response Status:", loginRes.status, "Token Acquired:", !!token);

  if (!token) {
    throw new Error(`Failed to acquire accessToken. Login output: ${JSON.stringify(loginData)}`);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // STEP 2: Create Workspace
  console.log("\nSTEP 2: Create Workspace");
  const wsRes = await fetch(`${BASE_URL}/api/workspaces`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "DevForge Workspace" }),
  });
  const wsData = await wsRes.json() as any;
  const workspaceId = wsData.data?.id;
  console.log("Workspace Created Status:", wsRes.status, "Workspace ID:", workspaceId);

  // STEP 3: Create Project
  console.log("\nSTEP 3: Create Project");
  const projRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Core Platform" }),
  });
  const projData = await projRes.json() as any;
  const projectId = projData.data?.id;
  console.log("Project Created Status:", projRes.status, "Project ID:", projectId);

  // STEP 4: Create Workflow
  console.log("\nSTEP 4: Create Workflow");
  const wfRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/workflows`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Default Workflow", projectId }),
  });
  const wfData = await wfRes.json() as any;
  const workflowId = wfData.data?.id;
  console.log("Workflow Created Status:", wfRes.status, "Workflow ID:", workflowId);

  // STEP 5 & 6: Inspect Workflow States & Transitions
  console.log("\nSTEP 5 & 6: Inspect Workflow States & Transitions");
  const wfDetailRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/workflows/${workflowId}`, {
    method: "GET",
    headers: authHeaders,
  });
  const wfDetailData = await wfDetailRes.json() as any;
  const states = wfDetailData.data?.states || [];
  const transitions = wfDetailData.data?.transitions || [];

  const backlogState = states.find((s: any) => s.category === "BACKLOG");
  const inProgressState = states.find((s: any) => s.category === "STARTED");
  const doneState = states.find((s: any) => s.category === "COMPLETED");

  console.log("States Loaded:", states.map((s: any) => `${s.name} (${s.id})`));
  console.log("Transitions Loaded:", transitions.length, "transitions");

  // STEP 7: Create EPIC
  console.log("\nSTEP 7: Create EPIC");
  const epicRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/work-items`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "EPIC",
      title: "Authentication System",
      workflowId,
    }),
  });
  const epicData = await epicRes.json() as any;
  const epicId = epicData.data?.id;
  console.log("EPIC Created Status:", epicRes.status, "EPIC ID:", epicId);

  // STEP 8: Create FEATURE (under EPIC)
  console.log("\nSTEP 8: Create FEATURE (under EPIC)");
  const featRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/work-items`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "FEATURE",
      title: "JWT Login",
      parentId: epicId,
      workflowId,
    }),
  });
  const featData = await featRes.json() as any;
  const featureId = featData.data?.id;
  console.log("FEATURE Created Status:", featRes.status, "FEATURE ID:", featureId);

  // STEP 9: Create TASK (under FEATURE)
  console.log("\nSTEP 9: Create TASK (under FEATURE)");
  const taskRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/work-items`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "TASK",
      title: "Implement login API",
      parentId: featureId,
      workflowId,
    }),
  });
  const taskData = await taskRes.json() as any;
  const taskId = taskData.data?.id;
  console.log("TASK Created Status:", taskRes.status, "TASK ID:", taskId);

  // STEP 10: Transition TASK to IN_PROGRESS then DONE
  console.log("\nSTEP 10: Transition TASK");
  const trans1Res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/work-items/${taskId}/transition`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ targetStateId: inProgressState.id }),
  });
  const trans1Data = await trans1Res.json() as any;
  console.log("Transition 1 (In Progress) Status:", trans1Res.status, "State:", trans1Data.data?.workflowStateId);

  const trans2Res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/work-items/${taskId}/transition`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ targetStateId: doneState.id }),
  });
  const trans2Data = await trans2Res.json() as any;
  console.log("Transition 2 (Done) Status:", trans2Res.status, "State:", trans2Data.data?.workflowStateId);

  // STEP 11: Add Comment
  console.log("\nSTEP 11: Add Comment");
  const commentRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/work-items/${taskId}/comments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ content: "Task completed successfully" }),
  });
  const commentData = await commentRes.json() as any;
  console.log("Comment Created Status:", commentRes.status, "Content:", commentData.data?.content);

  // DIRECT POSTGRESQL VERIFICATION
  console.log("\n============================================================");
  console.log("🔍 DIRECT POSTGRESQL DATABASE VERIFICATION");
  console.log("============================================================\n");

  const dbWorkItems = await prisma.workItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  console.log("1. HIERARCHY VERIFICATION (SELECT id, type, \"parentId\" FROM \"WorkItem\"):");
  dbWorkItems.forEach((item) => {
    console.log(`   - [${item.type}] ID: ${item.id} -> ParentID: ${item.parentId ?? "null"} (${item.title})`);
  });

  const dbTask = dbWorkItems.find((i) => i.id === taskId);
  console.log("\n2. STATE VERIFICATION (SELECT id, \"workflowStateId\" FROM \"WorkItem\" WHERE id = taskId):");
  console.log(`   - Task ID: ${taskId}`);
  console.log(`   - WorkflowStateID: ${dbTask?.workflowStateId} (Done State ID: ${doneState.id})`);
  console.log(`   - Matches Done State: ${dbTask?.workflowStateId === doneState.id}`);

  const dbComments = await prisma.comment.findMany({
    where: { workItemId: taskId },
  });
  console.log("\n3. COMMENTS VERIFICATION (SELECT * FROM \"Comment\" WHERE workItemId = taskId):");
  dbComments.forEach((c) => {
    console.log(`   - Comment ID: ${c.id} | Content: "${c.content}" | Author: ${c.authorUserId}`);
  });

  const dbHistory = await prisma.workItemHistory.findMany({
    where: { workItemId: taskId },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n4. AUDIT HISTORY VERIFICATION (SELECT action, \"actorUserId\" FROM \"WorkItemHistory\" WHERE workItemId = taskId):");
  dbHistory.forEach((h) => {
    console.log(`   - Action: ${h.action} | Actor: ${h.actorUserId} | From: ${h.fromStateId ?? "null"} -> To: ${h.toStateId ?? "null"}`);
  });

  await prisma.$disconnect();
}

runLifecycle().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
