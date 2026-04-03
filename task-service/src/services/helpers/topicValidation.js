const mongoose = require("mongoose");
const {
  DEFAULT_SOLUTION_SPACE,
  SOLUTION_SPACE_OPTIONS,
} = require("../../models/topic.model");
const { badRequest } = require("./serviceErrors");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

function toBufferIfPossible(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value && Buffer.isBuffer(value.buffer)) return value.buffer;
  if (value && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  return null;
}

function parseImageInput(img, fieldName) {
  if (img === undefined || img === null || img === "") {
    return { data: null, contentType: "", filename: "" };
  }

  if (typeof img === "object") {
    const existingBuffer = toBufferIfPossible(img.data);
    if (existingBuffer) {
      return {
        data: existingBuffer,
        contentType: String(img.contentType || "").trim(),
        filename: String(img.filename || "").trim(),
      };
    }

    const base64 = String(img.base64 || "").trim();
    const contentType = String(img.contentType || "").trim();
    const filename = String(img.filename || "").trim();

    if (!base64) {
      return { data: null, contentType: "", filename: "" };
    }

    if (!contentType) {
      throw badRequest(
        `${fieldName}.contentType is required when base64 is provided`,
      );
    }

    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      throw badRequest(`${fieldName}.base64 is not valid base64`);
    }

    if (!buffer || buffer.length === 0) {
      throw badRequest(`${fieldName}.base64 decoded empty`);
    }

    return { data: buffer, contentType, filename };
  }

  throw badRequest(
    `${fieldName} must be an object { base64, contentType, filename } or empty`,
  );
}

function parseAssetsInput(assets) {
  if (assets === undefined) return [];
  if (!Array.isArray(assets)) throw badRequest("task assets must be an array");

  return assets.map((asset, index) => {
    if (!asset || typeof asset !== "object") {
      throw badRequest(`task assets[${index}] must be an object`);
    }

    const existingBuffer = toBufferIfPossible(asset.data);
    const base64 = String(asset.base64 || "").trim();
    const contentType = String(asset.contentType || "").trim();
    const filename = String(asset.filename || "").trim();

    if (!filename) {
      throw badRequest(`task assets[${index}].filename is required`);
    }

    if (existingBuffer) {
      return { data: existingBuffer, contentType, filename };
    }

    if (!base64) {
      return { data: null, contentType, filename };
    }

    if (!contentType) {
      throw badRequest(`task assets[${index}].contentType is required`);
    }

    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      throw badRequest(`task assets[${index}].base64 is not valid base64`);
    }

    if (!buffer || buffer.length === 0) {
      throw badRequest(`task assets[${index}].base64 decoded empty`);
    }

    return { data: buffer, contentType, filename };
  });
}

function normalizeSolutionSpace(space) {
  const normalized = String(space || "").trim();
  if (SOLUTION_SPACE_OPTIONS.includes(normalized)) return normalized;
  return DEFAULT_SOLUTION_SPACE;
}

function normalizeTask(raw) {
  const question = String(raw.question || "").trim();
  const points = Number(raw.points);

  if (!question) throw badRequest("Task question is required");
  if (!Number.isFinite(points) || points < 0) {
    throw badRequest("Task points must be a number >= 0");
  }

  return {
    description: String(raw.description || "").trim(),
    full_tex_code: String(raw.full_tex_code || raw.fullTexCode || "").trim(),
    question,
    points,
    question_img: parseImageInput(raw.question_img, "question_img"),
    solution: String(raw.solution || "").trim(),
    assets: parseAssetsInput(raw.assets),
    solutionSpace: normalizeSolutionSpace(raw.solutionSpace),
    isRelatedToTopic:
      raw.isRelatedToTopic !== undefined ? Boolean(raw.isRelatedToTopic) : true,
  };
}

function extractRawLatexInput(data) {
  const candidates = [
    data?.full_tex_code,
    data?.fullTexCode,
    data?.rawLatex,
    data?.latexContent,
    data?.latex,
    data?.tex,
  ];

  const value = candidates.find((entry) => entry !== undefined && entry !== null);
  return value === undefined || value === null ? "" : String(value);
}

function normalizeLatexSource(latexContent) {
  const src = String(latexContent || "").trim();
  if (!src) return "";

  const documentBodyMatch = src.match(
    /\\begin\{document\}([\s\S]*?)\\end\{document\}/i,
  );

  return String(documentBodyMatch ? documentBodyMatch[1] : src).trim();
}

function stripOuterSolutionBlocks(latex) {
  return String(latex || "").replace(
    /\\begin\{solution\}[\s\S]*?\\end\{solution\}/g,
    "",
  );
}

function extractSolutionBodies(latex) {
  return Array.from(
    String(latex || "").matchAll(
      /\\begin\{solution\}([\s\S]*?)\\end\{solution\}/g,
    ),
  )
    .map((match) => String(match[1] || "").trim())
    .filter(Boolean);
}

function extractPointsFromHeading(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const direct = raw.match(/^(\d+(?:[.,]\d+)?)\s*P$/i);
  if (direct) return Number(String(direct[1]).replace(",", "."));

  const wrapped = raw.match(/\((\d+(?:[.,]\d+)?)\s*P\)\s*$/i);
  if (wrapped) return Number(String(wrapped[1]).replace(",", "."));

  return null;
}

function cleanTopicTitle(title) {
  return String(title || "")
    .replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*P\s*\)\s*$/i, "")
    .trim();
}

function parseSubsectionBlocks(sectionBody) {
  const src = String(sectionBody || "");
  const matches = Array.from(src.matchAll(/\\subsection\*?\{([^}]*)\}/g));
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index;
    const nextStart =
      index + 1 < matches.length ? matches[index + 1].index : src.length;
    const block = src.slice(start, nextStart).trim();
    const heading = String(match[1] || "").trim();
    const blockBody = src
      .slice(start + match[0].length, nextStart)
      .trim();

    return {
      heading,
      block,
      body: blockBody,
    };
  });
}

function parseTaskBlock({ heading, block, body, fallbackPoints }) {
  const solutionBodies = extractSolutionBodies(body);
  const question = stripOuterSolutionBlocks(body).trim();
  const pointsFromHeading = extractPointsFromHeading(heading);
  const points = Number.isFinite(pointsFromHeading)
    ? pointsFromHeading
    : Number(fallbackPoints);

  if (!question) {
    throw badRequest("Each parsed task must have a non-empty question");
  }

  if (!solutionBodies.length) {
    throw badRequest("Each parsed task must include a solution block");
  }

  if (!Number.isFinite(points) || points < 0) {
    throw badRequest("Each parsed task must have valid points");
  }

  return {
    description: "",
    full_tex_code: String(block || "").trim(),
    question,
    points,
    question_img: { data: null, contentType: "", filename: "" },
    solution: solutionBodies.join("\n\n").trim(),
    assets: [],
    solutionSpace: DEFAULT_SOLUTION_SPACE,
    isRelatedToTopic: true,
  };
}

function parseSectionBlock(sectionBlock, { fallbackTopic, fallbackPoints } = {}) {
  const src = String(sectionBlock || "").trim();
  const match = src.match(
    /^\\section\{([^}]*)\}(?:\s*\(\s*(\d+(?:[.,]\d+)?)\s*P\s*\))?/i,
  );

  if (!match) {
    throw badRequest("Raw LaTeX must contain a \\section{...} block");
  }

  const parsedTopicTitle = cleanTopicTitle(match[1]);
  const topic = String(fallbackTopic || parsedTopicTitle || "").trim();
  const remainder = src.slice(match[0].length).trim();
  const subsectionBlocks = parseSubsectionBlocks(remainder);
  const sectionPoints = match[2]
    ? Number(String(match[2]).replace(",", "."))
    : null;

  if (!topic) {
    throw badRequest("Parsed topic title cannot be empty");
  }

  if (subsectionBlocks.length > 0) {
    const firstSubsectionIndex = remainder.search(/\\subsection\*?\{/);
    const description =
      firstSubsectionIndex >= 0
        ? remainder.slice(0, firstSubsectionIndex).trim()
        : "";
    const tasks = subsectionBlocks.map((subsection) =>
      parseTaskBlock({ ...subsection, fallbackPoints }),
    );
    const points = tasks.reduce((sum, task) => sum + Number(task.points || 0), 0);

    return {
      full_tex_code: src,
      topic,
      description,
      points,
      tasks,
      parsedSectionPoints: sectionPoints,
    };
  }

  const solutionBodies = extractSolutionBodies(remainder);
  const question = stripOuterSolutionBlocks(remainder).trim();
  const resolvedPoints = Number.isFinite(Number(fallbackPoints))
    ? Number(fallbackPoints)
    : sectionPoints;

  if (!question) {
    throw badRequest(
      "Raw LaTeX must contain either subsection task blocks or a top-level question",
    );
  }

  if (!solutionBodies.length) {
    throw badRequest("Raw LaTeX must include a solution block");
  }

  if (!Number.isFinite(resolvedPoints) || resolvedPoints < 0) {
    throw badRequest(
      "Task points are required when raw LaTeX does not contain subsection points",
    );
  }

  return {
    full_tex_code: src,
    topic,
    description: "",
    points: resolvedPoints,
    tasks: [
      {
        description: "",
        full_tex_code: remainder,
        question,
        points: resolvedPoints,
        question_img: { data: null, contentType: "", filename: "" },
        solution: solutionBodies.join("\n\n").trim(),
        assets: [],
        solutionSpace: DEFAULT_SOLUTION_SPACE,
        isRelatedToTopic: true,
      },
    ],
    parsedSectionPoints: sectionPoints,
  };
}

function parseTopicLatex(latexContent, options = {}) {
  const body = normalizeLatexSource(latexContent);
  if (!body) throw badRequest("latexContent is required");
  if (!/\\section\{[^}]*\}/.test(body)) {
    throw badRequest("Raw LaTeX must contain at least one \\section{...} block");
  }

  const matches = Array.from(body.matchAll(/\\section\{[^}]*\}(?:\s*\(\s*\d+(?:[.,]\d+)?\s*P\s*\))?/g));
  if (!matches.length) {
    throw badRequest("Raw LaTeX must contain at least one \\section{...} block");
  }

  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    const sectionBlock = body.slice(start, end).trim();
    return parseSectionBlock(sectionBlock, options);
  });
}

module.exports = {
  DEFAULT_SOLUTION_SPACE,
  SOLUTION_SPACE_OPTIONS,
  extractRawLatexInput,
  isValidObjectId,
  normalizeTask,
  parseAssetsInput,
  parseImageInput,
  parseTopicLatex,
};
