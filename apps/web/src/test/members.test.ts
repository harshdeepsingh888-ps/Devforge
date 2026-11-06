import assert from "node:assert/strict";
import test from "node:test";

import {
  canLeaveWorkspace,
  canRemoveMember,
  countOwners,
  isLastOwner,
  roleOptionsFor,
} from "../services/members.ts";

const owner = { userId: "owner", role: "OWNER" as const };
const secondOwner = { userId: "owner-2", role: "OWNER" as const };
const admin = { userId: "admin", role: "ADMIN" as const };
const developer = { userId: "dev", role: "DEVELOPER" as const };
const viewer = { userId: "viewer", role: "VIEWER" as const };

const singleOwnerTeam = [owner, admin, developer, viewer];
const twoOwnerTeam = [owner, secondOwner, admin, developer, viewer];

test("@devforge/web: Members — owner counting and the last-owner rule", () => {
  assert.equal(countOwners(singleOwnerTeam), 1);
  assert.equal(countOwners(twoOwnerTeam), 2);
  assert.equal(countOwners([]), 0);

  assert.equal(isLastOwner(owner, singleOwnerTeam), true);
  assert.equal(isLastOwner(owner, twoOwnerTeam), false);
  assert.equal(isLastOwner(admin, singleOwnerTeam), false);
});

test("@devforge/web: Members — role options mirror the server (OWNER any, ADMIN limited, others none)", () => {
  assert.deepEqual(roleOptionsFor("OWNER", developer, singleOwnerTeam), [
    "OWNER",
    "ADMIN",
    "DEVELOPER",
    "VIEWER",
  ]);
  assert.deepEqual(roleOptionsFor("OWNER", admin, singleOwnerTeam), [
    "OWNER",
    "ADMIN",
    "DEVELOPER",
    "VIEWER",
  ]);

  // The last OWNER cannot be demoted by anyone, including themselves
  assert.deepEqual(roleOptionsFor("OWNER", owner, singleOwnerTeam), []);
  // With a second OWNER present an OWNER can be changed
  assert.deepEqual(roleOptionsFor("OWNER", owner, twoOwnerTeam), [
    "OWNER",
    "ADMIN",
    "DEVELOPER",
    "VIEWER",
  ]);

  assert.deepEqual(roleOptionsFor("ADMIN", developer, singleOwnerTeam), [
    "ADMIN",
    "DEVELOPER",
    "VIEWER",
  ]);
  assert.deepEqual(roleOptionsFor("ADMIN", viewer, singleOwnerTeam), [
    "ADMIN",
    "DEVELOPER",
    "VIEWER",
  ]);
  // An ADMIN may not change an OWNER, even when there are several
  assert.deepEqual(roleOptionsFor("ADMIN", owner, twoOwnerTeam), []);

  assert.deepEqual(roleOptionsFor("DEVELOPER", viewer, singleOwnerTeam), []);
  assert.deepEqual(roleOptionsFor("VIEWER", developer, singleOwnerTeam), []);
  assert.deepEqual(roleOptionsFor(undefined, developer, singleOwnerTeam), []);
});

test("@devforge/web: Members — removal rules (OWNER anyone, ADMIN only DEVELOPER/VIEWER, never self, never the last OWNER)", () => {
  assert.equal(canRemoveMember("OWNER", "owner", admin, singleOwnerTeam), true);
  assert.equal(canRemoveMember("OWNER", "owner", developer, singleOwnerTeam), true);
  assert.equal(canRemoveMember("OWNER", "owner", secondOwner, twoOwnerTeam), true);

  // Self is "leave", not "remove"
  assert.equal(canRemoveMember("OWNER", "owner", owner, twoOwnerTeam), false);
  assert.equal(canRemoveMember("ADMIN", "admin", admin, singleOwnerTeam), false);

  // The last OWNER is protected from everyone
  assert.equal(canRemoveMember("OWNER", "owner-2", owner, [owner, { userId: "owner-2", role: "ADMIN" }]), false);

  assert.equal(canRemoveMember("ADMIN", "admin", developer, singleOwnerTeam), true);
  assert.equal(canRemoveMember("ADMIN", "admin", viewer, singleOwnerTeam), true);
  assert.equal(canRemoveMember("ADMIN", "admin", owner, twoOwnerTeam), false);
  assert.equal(
    canRemoveMember("ADMIN", "admin", { userId: "admin-2", role: "ADMIN" }, singleOwnerTeam),
    false,
  );

  assert.equal(canRemoveMember("DEVELOPER", "dev", viewer, singleOwnerTeam), false);
  assert.equal(canRemoveMember("VIEWER", "viewer", developer, singleOwnerTeam), false);
  assert.equal(canRemoveMember(undefined, undefined, developer, singleOwnerTeam), false);
});

test("@devforge/web: Members — anyone may leave except the last OWNER", () => {
  assert.equal(canLeaveWorkspace("viewer", singleOwnerTeam), true);
  assert.equal(canLeaveWorkspace("dev", singleOwnerTeam), true);
  assert.equal(canLeaveWorkspace("admin", singleOwnerTeam), true);
  assert.equal(canLeaveWorkspace("owner", singleOwnerTeam), false);
  assert.equal(canLeaveWorkspace("owner", twoOwnerTeam), true);
  assert.equal(canLeaveWorkspace("stranger", singleOwnerTeam), false);
  assert.equal(canLeaveWorkspace(undefined, singleOwnerTeam), false);
});
