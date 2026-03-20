const fs = require("fs");
const path = require("path");

function ensureDraftFns(examService) {
  if (!examService) {
    const e = new Error("examService is not wired");
    e.status = 500;
    throw e;
  }
  if (typeof examService.generateDraft !== "function") {
    const e = new Error("examService.generateDraft is not wired");
    e.status = 500;
    throw e;
  }
  if (typeof examService.regenerateDraftTopic !== "function") {
    const e = new Error("examService.regenerateDraftTopic is not wired");
    e.status = 500;
    throw e;
  }
}

function resolveDraftAssetFilePath(token, filename) {
  const root = process.env.DRAFT_ASSETS_DIR || "/tmp/autogenex-draft-assets";
  const filePath = path.join(root, token, filename);

  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

module.exports = {
  ensureDraftFns,
  resolveDraftAssetFilePath,
};
