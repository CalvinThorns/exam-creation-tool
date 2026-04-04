const { sendSuccess, sendError } = require("../utils/response");
const {
  ensureDraftFns,
  resolveDraftAssetFilePath,
} = require("./helpers/examControllerHelpers");

function createExamController({ examService }) {
  const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

  return {
    create: async (req, res, next) => {
      try {
        const exam = await examService.createExam(req.body, getUserId(req));
        return sendSuccess(res, { data: exam, status: 201 });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await examService.listExams(req.query, getUserId(req));
        const { items, ...meta } = result;
        return sendSuccess(res, {
          req,
          data: items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const exam = await examService.getExam(req.params.id, getUserId(req));
        return sendSuccess(res, { data: exam });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const exam = await examService.updateExam(req.params.id, req.body, getUserId(req));
        return sendSuccess(res, { data: exam });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await examService.deleteExam(req.params.id, getUserId(req));
        return res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    generateDraft: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.generateDraft(req.body, getUserId(req));
        return sendSuccess(res, { data: result });
      } catch (err) {
        next(err);
      }
    },

    regenerateDraftTopic: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.regenerateDraftTopic(req.body, getUserId(req));
        return sendSuccess(res, { data: result });
      } catch (err) {
        next(err);
      }
    },

    compileDraft: async (req, res, next) => {
      try {
        const { pdfBuffer, filename, diagnostics, errors } = await examService.compileDraft(
          req.body,
          req.id,
          getUserId(req) 
        );

        return sendSuccess(res, {
          req,
          data: {
            filename,
            contentType: "application/pdf",
            pdfBase64: pdfBuffer.toString("base64"),
            diagnostics: diagnostics || null,
            errors: errors || diagnostics || null,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    compileLatexOnly: async (req, res, next) => {
      try {
        const { pdfBuffer, filename, diagnostics, errors } =
          await examService.compileLatexOnly(req.body, req.id);

        return sendSuccess(res, {
          req,
          data: {
            filename,
            contentType: "application/pdf",
            pdfBase64: pdfBuffer.toString("base64"),
            diagnostics: diagnostics || null,
            errors: errors || diagnostics || null,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    getBaseLatexTemplate: async (req, res, next) => {
      try {
        const result = await examService.getBaseLatexTemplate();
        return sendSuccess(res, { req, data: result });
      } catch (err) {
        next(err);
      }
    },

    updateBaseLatexTemplate: async (req, res, next) => {
      try {
        const result = await examService.updateBaseLatexTemplate(req.body);
        return sendSuccess(res, { req, data: result });
      } catch (err) {
        next(err);
      }
    },

    getDraftAsset: async (req, res, next) => {
      try {
        const token = String(req.params.token || "");
        const filename = String(req.params.filename || "");

        const filePath = resolveDraftAssetFilePath(token, filename);
        if (!filePath) {
          return sendError(req, res, {
            status: 404,
            code: "ASSET_NOT_FOUND",
            message: "Asset not found",
          });
        }

        return res.sendFile(filePath);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createExamController };
