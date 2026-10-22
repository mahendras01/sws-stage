import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("Home Address block field is a text input and not a village/city dropdown", () => {
  const source = readFileSync(join(process.cwd(), "components/SignupForm.tsx"), "utf8");

  assert.match(source, /name:\s*"permanent_village_city",\s*label:\s*"घर का ब्लॉक",\s*type:\s*"text"/);
  assert.doesNotMatch(source, /field\.name === "permanent_village_city"[\s\S]*?Select village\/city/);
  assert.doesNotMatch(source, /isPermanentVillageSelect/);
});
