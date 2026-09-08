import test from "node:test";
import assert from "node:assert/strict";
import { activeVipFamilyMemberUids, documentData, documentsData, uniqueDocuments } from "./data-lifecycle.js";

const document = (path, value) => ({
  id: path.split("/").at(-1),
  ref: { path },
  data: () => value,
});

test("uniqueDocuments deduplicates records returned by multiple UID queries", () => {
  const shared = document("mail/shared", { uid: "user-1", accountUid: "user-1" });
  const records = uniqueDocuments(
    { docs: [shared, document("mail/by-uid", { uid: "user-1" })] },
    { docs: [shared] },
  );
  assert.deepEqual(records.map((record) => record.ref.path), ["mail/shared", "mail/by-uid"]);
});

test("document serializers retain IDs and handle missing direct records", () => {
  assert.deepEqual(documentData({ exists: true, id: "owner", data: () => ({ tier: 5 }) }), { id: "owner", tier: 5 });
  assert.equal(documentData({ exists: false }), null);
  assert.deepEqual(documentsData([document("supportRequests/case-1", { subject: "Help" })]), [{ id: "case-1", subject: "Help" }]);
});

test("activeVipFamilyMemberUids sanitizes and deduplicates household members", () => {
  const snapshot = { exists: true, data: () => ({ memberUids: ["member-1", "member-1", "", null, "member-2"] }) };
  assert.deepEqual(activeVipFamilyMemberUids(snapshot), ["member-1", "member-2"]);
  assert.deepEqual(activeVipFamilyMemberUids({ exists: false }), []);
});
