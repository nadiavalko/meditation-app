import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve("./public");
const pages = [
  "index.html",
  "journey/index.html",
  "breathing/index.html",
  "body-scan/index.html",
  "finish/index.html",
];

for (const page of pages) {
  const filePath = path.join(root, page);
  const html = fs.readFileSync(filePath, "utf8");
  assert.match(
    html,
    /class="[^"]*screen-content[^"]*"/,
    `${page} is missing the shared screen-content wrapper`
  );
}

console.log("layout.test.js: screen-content wrapper present on all pages");
