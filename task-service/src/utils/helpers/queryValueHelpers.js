function tryParsePrimitive(value) {
  if (value === "true" || value === "false") return value === "true";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function toTrimmedArray(raw, separator = ",") {
  return String(raw)
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  tryParsePrimitive,
  toTrimmedArray,
};
