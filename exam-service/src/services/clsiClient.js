const axios = require("axios");

function createClsiClient({ clsiUrl, logger }) {
  const httpTimeoutMs = Number(process.env.CLSI_HTTP_TIMEOUT_MS || 900000);

  const api = axios.create({
    baseURL: clsiUrl,
    timeout: httpTimeoutMs,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });

  function normalizeOutputUrl(url) {
    const u = String(url || "");
    if (!u) return u;

    try {
      const base = new URL(clsiUrl);
      const parsed = new URL(u, base);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        parsed.hostname = base.hostname;
        parsed.port = base.port;
        parsed.protocol = base.protocol;
        return parsed.toString();
      }
      return parsed.toString();
    } catch (_) {
      return u;
    }
  }

  return {
    async compile({ projectId, compileBody, reqId }) {
      const res = await api.post(`/project/${projectId}/compile`, compileBody);

      if (res.status >= 400) {
        logger?.error(
          { reqId, status: res.status, data: res.data },
          "CLSI request failed",
        );
        const e = new Error("CLSI request failed");
        e.status = 502;
        e.details = JSON.stringify(res.data || {}).slice(0, 20000);
        throw e;
      }

      if (res?.data?.compile?.outputFiles) {
        res.data.compile.outputFiles = res.data.compile.outputFiles.map(
          (f) => ({
            ...f,
            url: normalizeOutputUrl(f.url),
          }),
        );
      }

      return res.data;
    },

    async downloadAsBuffer(url) {
      const u = normalizeOutputUrl(url);
      const res = await api.get(u, { responseType: "arraybuffer" });
      return Buffer.from(res.data);
    },
  };
}

module.exports = { createClsiClient };
