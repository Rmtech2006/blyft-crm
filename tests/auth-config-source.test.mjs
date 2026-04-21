import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  assert.equal(existsSync(path), true, `${path} should exist`);
  return readFileSync(path, "utf8");
}

test("Auth.js trusts the deployed or local host in production start", () => {
  const authConfig = read("src/lib/auth.config.ts");

  assert.match(authConfig, /trustHost:\s*true/);
});
