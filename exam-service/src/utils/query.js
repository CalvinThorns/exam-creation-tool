// helpers for parsing filter/sort query parameters into mongoose-friendly objects

function tryParse(val) {
  if (val === "true" || val === "false") return val === "true";
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
}

function parseFilters(raw) {
  if (raw === undefined) return {};
  const arr = Array.isArray(raw) ? raw : [raw];
  const built = {};
  for (const f of arr) {
    const m = /^([^:]+):(eq|ne|lt|lte|gt|gte|in|nin|regex):(.+)$/.exec(f);
    if (!m) {
      const err = new Error(
        `invalid filter format '${String(f)}', expected field:op:value`,
      );
      err.status = 400;
      throw err;
    }
    const [, field, op, rawVal] = m;
    const val = tryParse(rawVal);
    switch (op) {
      case "eq":
        built[field] = val;
        break;
      case "ne":
        built[field] = { $ne: val };
        break;
      case "lt":
        built[field] = { $lt: val };
        break;
      case "lte":
        built[field] = { $lte: val };
        break;
      case "gt":
        built[field] = { $gt: val };
        break;
      case "gte":
        built[field] = { $gte: val };
        break;
      case "in":
        built[field] = { $in: String(val).split(",") };
        break;
      case "nin":
        built[field] = { $nin: String(val).split(",") };
        break;
      case "regex":
        built[field] = { $regex: String(val), $options: "i" };
        break;
    }
  }
  return built;
}

function parseSort(raw) {
  if (!raw) return undefined;
  const obj = {};
  for (const part of String(raw)
    .split(",")
    .map((s) => s.trim())) {
    if (!part) continue;
    const [field, dir] = part.split(":").map((s) => s.trim());
    if (!field) continue;
    obj[field] = dir && dir.toLowerCase().startsWith("desc") ? -1 : 1;
  }
  return Object.keys(obj).length ? obj : undefined;
}

module.exports = { parseFilters, parseSort };
