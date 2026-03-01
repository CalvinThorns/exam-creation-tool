const path = require("path");
const fs = require("fs/promises");

function stripDataUrlPrefix(b64) {
  const s = String(b64 || "");
  const m = s.match(/^data:([^;]+);base64,(.*)$/);
  return m ? m[2] : s;
}

function extFromContentType(ct) {
  const t = String(ct || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("jpeg")) return "jpg";
  if (t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  return "png";
}

function getImageB64(img) {
  return img?.base64 || img?.data || null;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeBase64File(filepath, base64) {
  const cleaned = stripDataUrlPrefix(base64);
  const buf = Buffer.from(cleaned, "base64");
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, buf);
}

// Creates CLSI resources for images using URL
async function buildClsiImageResourcesFromDraftTopics({
  topics,
  token,
  assetsDir,
  apiBaseUrl,
}) {
  const resources = [];
  const nextTopics = (Array.isArray(topics) ? topics : []).map((t) => ({
    ...t,
    tasks: Array.isArray(t.tasks) ? t.tasks.map((x) => ({ ...x })) : [],
  }));

  for (let i = 0; i < nextTopics.length; i++) {
    const t = nextTopics[i];

    // description_img
    const descB64 = getImageB64(t.description_img);
    if (descB64) {
      const ext = extFromContentType(t.description_img?.contentType);
      const filename = `topic_${i}_desc.${ext}`;
      const diskPath = path.join(assetsDir, filename);

      await writeBase64File(diskPath, descB64);

      resources.push({
        path: filename,
        url: `${apiBaseUrl}/api/v1/exams/draft/assets/${token}/${filename}`,
        modified: Date.now(),
      });

      t.__descImgPath = filename;
    }

    // task images
    const tasks = Array.isArray(t.tasks) ? t.tasks : [];
    for (let j = 0; j < tasks.length; j++) {
      const task = tasks[j];
      const qB64 = getImageB64(task.question_img);
      if (qB64) {
        const ext = extFromContentType(task.question_img?.contentType);
        const filename = `topic_${i}_task_${j}_q.${ext}`;
        const diskPath = path.join(assetsDir, filename);

        await writeBase64File(diskPath, qB64);

        resources.push({
          path: filename,
          url: `${apiBaseUrl}/api/v1/exams/draft/assets/${token}/${filename}`,
          modified: Date.now(),
        });

        task.__qImgPath = filename;
      }
    }
  }

  return { resources, nextTopics };
}

module.exports = {
  buildClsiImageResourcesFromDraftTopics,
};
