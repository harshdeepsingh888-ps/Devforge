import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvitationLink,
  canManageInvitations,
  extractInvitationToken,
  formatExpiry,
  invitableRoles,
  readInvitationTokenFromSearch,
} from "../services/invitations.ts";

const TOKEN = "a".repeat(32) + "0123456789abcdef".repeat(2);

test("@devforge/web: Invitations — token extraction accepts a bare token or an invite link only", () => {
  assert.equal(extractInvitationToken(TOKEN), TOKEN);
  assert.equal(extractInvitationToken(`  ${TOKEN}\n`), TOKEN);

  assert.equal(
    extractInvitationToken(`https://devforge.example.com/?invite=${TOKEN}`),
    TOKEN,
  );
  assert.equal(
    extractInvitationToken(`http://localhost:5173/?invite=${TOKEN}&utm=x`),
    TOKEN,
  );

  // Wrong length, uppercase, other query names, or free text are rejected
  assert.equal(extractInvitationToken(TOKEN.slice(0, 63)), null);
  assert.equal(extractInvitationToken(TOKEN.toUpperCase()), null);
  assert.equal(extractInvitationToken(`https://x.test/?token=${TOKEN}`), null);
  assert.equal(extractInvitationToken("please let me in"), null);
  assert.equal(extractInvitationToken(""), null);
});

test("@devforge/web: Invitations — link building and reading round-trip through the query string", () => {
  const link = buildInvitationLink("http://localhost:5173/", TOKEN);
  assert.equal(link, `http://localhost:5173/?invite=${TOKEN}`);

  const url = new URL(link);
  assert.equal(readInvitationTokenFromSearch(url.search), TOKEN);

  assert.equal(readInvitationTokenFromSearch(""), null);
  assert.equal(readInvitationTokenFromSearch("?invite=nope"), null);
  assert.equal(readInvitationTokenFromSearch("?other=1"), null);
});

test("@devforge/web: Invitations — role rules mirror the server (ADMIN cannot grant OWNER)", () => {
  assert.equal(canManageInvitations("OWNER"), true);
  assert.equal(canManageInvitations("ADMIN"), true);
  assert.equal(canManageInvitations("DEVELOPER"), false);
  assert.equal(canManageInvitations("VIEWER"), false);
  assert.equal(canManageInvitations(undefined), false);

  assert.deepEqual(invitableRoles("OWNER"), ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]);
  assert.deepEqual(invitableRoles("ADMIN"), ["ADMIN", "DEVELOPER", "VIEWER"]);
  assert.deepEqual(invitableRoles("DEVELOPER"), []);
  assert.deepEqual(invitableRoles(undefined), []);
});

test("@devforge/web: Invitations — expiry formatting", () => {
  const now = new Date("2026-11-06T12:00:00.000Z");

  assert.equal(formatExpiry("2026-11-13T12:00:00.000Z", now), "expires in 7 days");
  // A just-created 7-day invitation is a few seconds short of 7 days and must still read 7
  assert.equal(formatExpiry("2026-11-13T11:59:30.000Z", now), "expires in 7 days");
  assert.equal(formatExpiry("2026-11-07T13:00:00.000Z", now), "expires in 1 day");
  assert.equal(formatExpiry("2026-11-06T15:30:00.000Z", now), "expires in 4 hours");
  assert.equal(formatExpiry("2026-11-06T12:10:00.000Z", now), "expires in 1 hour");
  assert.equal(formatExpiry("2026-11-06T11:59:59.000Z", now), "expired");
  assert.equal(formatExpiry("not a date", now), "unknown expiry");
});
