const fs = require("fs");
const path = require("path");
const { sendSuccess, sendError } = require("../utils/response");

function createExamController({ examService }) {
  function ensureDraftFns(svc) {
    if (!svc) {
      const e = new Error("examService is not wired");
      e.status = 500;
      throw e;
    }
    if (typeof svc.generateDraft !== "function") {
      const e = new Error("examService.generateDraft is not wired");
      e.status = 500;
      throw e;
    }
    if (typeof svc.regenerateDraftTopic !== "function") {
      const e = new Error("examService.regenerateDraftTopic is not wired");
      e.status = 500;
      throw e;
    }
  }

  return {
    create: async (req, res, next) => {
      try {
        const exam = await examService.createExam(req.body);
        return sendSuccess(res, { data: exam, status: 201 });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await examService.listExams(req.query);
        const { items, ...meta } = result;
        return sendSuccess(res, {
          data: items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const exam = await examService.getExam(req.params.id);
        return sendSuccess(res, { data: exam });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const exam = await examService.updateExam(req.params.id, req.body);
        return sendSuccess(res, { data: exam });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await examService.deleteExam(req.params.id);
        // successful deletion with no content
        return res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    generateDraft: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.generateDraft(req.body);
        return sendSuccess(res, { data: result });
      } catch (err) {
        next(err);
      }
    },

    regenerateDraftTopic: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.regenerateDraftTopic(req.body);
        return sendSuccess(res, { data: result });
      } catch (err) {
        next(err);
      }
    },

    compileDraft: async (req, res, next) => {
      try {
        const { pdfBuffer, filename, errors } = await examService.compileDraft(
          req.body,
          req.id,
        );

        return sendSuccess(res, {
          data: {
            filename,
            contentType: "application/pdf",
            pdfBase64: pdfBuffer.toString("base64"),
            errors: errors || null,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    getDraftAsset: async (req, res, next) => {
      try {
        const token = String(req.params.token || "");
        const filename = String(req.params.filename || "");

        const root =
          process.env.DRAFT_ASSETS_DIR || "/tmp/autogenex-draft-assets";
        const filePath = path.join(root, token, filename);

        if (!fs.existsSync(filePath)) {
          return sendError(res, { status: 404, message: "Asset not found" });
        }

        return res.sendFile(filePath);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createExamController };
