import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  assert.equal(existsSync(path), true, `${path} should exist`);
  return readFileSync(path, "utf8");
}

test("reimbursement submissions use the authenticated user instead of a hardcoded submitter", () => {
  const submitDialog = read("src/components/reimbursements/submit-reimbursement-dialog.tsx");
  const reimbursementFunctions = read("convex/reimbursements.ts");

  assert.doesNotMatch(submitDialog, /submittedById:\s*['"]ritish['"]/);
  assert.match(submitDialog, /useSession/);
  assert.match(submitDialog, /Self \(/);
  assert.doesNotMatch(reimbursementFunctions, /submittedById:\s*v\.string\(\)/);
  assert.match(reimbursementFunctions, /getCurrentUserId/);
});
