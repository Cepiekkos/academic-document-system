const fs = require("fs");
const lines = fs.readFileSync("C:/Users/acatt/Desktop/academic-document-system/src/main.jsx", "utf8").split("\r\n");
const pats = [
  "function reviewerShouldSeeRevisionReason",
  "const history = [{ version: newVersion",
  "Document published and archived",
  "Pending Department Head Review",
  "Pending Dean Review",
  "Approved - Ready to Publish",
  "Faculty Revision Requested",
  'stage: "archived"',
  "Version history"
];
pats.forEach((p, i) => {
  const l = lines.findIndex(x => x.includes(p));
  console.log(i, "-> line", l + 1, "|", lines[l] ? lines[l].slice(0, 100) : "NOT FOUND");
});
