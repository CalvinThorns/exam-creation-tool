// src/api/exams.query.js

const ALLOWED_OPS = new Set([
  "eq",
  "ne",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "nin",
  "regex",
]);

function isDefined(v) {
  return v !== undefined && v !== null && v !== "";
}

// Converts UI params -> backend params
export function toExamsListQuery(ui = {}) {
  const q = {};

  // pagination
  if (isDefined(ui.page)) q.page = ui.page;

  // backend supports: pageSize OR limit (your normalizePagination uses page and limit)
  if (isDefined(ui.pageSize)) q.pageSize = ui.pageSize;
  else if (isDefined(ui.limit)) q.limit = ui.limit;

  // courseId passthrough (backend validates and merges into filters)
  if (isDefined(ui.courseId)) q.courseId = ui.courseId;

  // sort
  // allow: ui.sort = "createdAt:desc,points:asc"
  // or: ui.sort = [{ field:"createdAt", dir:"desc" }, { field:"points", dir:"asc" }]
  if (typeof ui.sort === "string" && ui.sort.trim()) {
    q.sort = ui.sort.trim();
  } else if (Array.isArray(ui.sort) && ui.sort.length) {
    q.sort = ui.sort
      .filter((s) => s && s.field)
      .map((s) => `${String(s.field).trim()}:${String(s.dir || "asc").trim()}`)
      .join(",");
  }

  // filters
  // backend expects filter=field:op:value (repeated for multiple)
  // allow: ui.filters = [{ field:"name", op:"eq", value:"Data Structures" }, ...]
  if (Array.isArray(ui.filters) && ui.filters.length) {
    const filterStrings = ui.filters
      .filter((f) => f && f.field && f.op && isDefined(f.value))
      .map((f) => {
        const field = String(f.field).trim();
        const op = String(f.op).trim();
        const value = Array.isArray(f.value)
          ? f.value.join(",")
          : String(f.value);
        if (!ALLOWED_OPS.has(op)) {
          throw new Error(`Invalid filter op '${op}' for field '${field}'`);
        }
        return `${field}:${op}:${value}`;
      });
    if (filterStrings.length) q.filter = filterStrings;
  }

  return q;
}

/**
 * Map AG Grid filter model to API filter array.
 * Only supports common filter types (text → regex, number → eq/gte/lte/gt/lt).
 * colId is used as field name for the API.
 */
export function agGridFilterToApiFilters(filterModel) {
  if (!filterModel || typeof filterModel !== "object") return [];
  const filters = [];
  for (const [colId, colFilter] of Object.entries(filterModel)) {
    if (!colFilter) continue;
    const { filterType, type, filter } = colFilter;
    if (filter === undefined || filter === null || filter === "") continue;
    if (filterType === "text") {
      const op = type === "equals" ? "eq" : "regex";
      const value = type === "equals" ? filter : filter;
      filters.push({ field: colId, op, value: op === "regex" ? filter : value });
    } else if (filterType === "number") {
      const opMap = {
        equals: "eq",
        notEqual: "ne",
        lessThan: "lt",
        lessThanOrEqual: "lte",
        greaterThan: "gt",
        greaterThanOrEqual: "gte",
      };
      const op = opMap[type] || "eq";
      const num = Number(filter);
      if (!Number.isFinite(num)) continue;
      filters.push({ field: colId, op, value: num });
    }
  }
  return filters;
}
