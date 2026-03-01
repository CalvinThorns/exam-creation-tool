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
        res.status(201).json({ data: exam });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await examService.listExams(req.query);
        res.json({
          data: result.items,
          meta: { page: result.page, limit: result.limit, total: result.total },
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const exam = await examService.getExam(req.params.id);
        res.json({ data: exam });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const exam = await examService.updateExam(req.params.id, req.body);
        res.json({ data: exam });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await examService.deleteExam(req.params.id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    // POST /api/v1/exams/draft
    generateDraft: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.generateDraft(req.body);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/v1/exams/draft/regenerate-topic
    regenerateDraftTopic: async (req, res, next) => {
      try {
        ensureDraftFns(examService);
        const result = await examService.regenerateDraftTopic(req.body);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    compileDraft: async (req, res, next) => {
      try {
        const { pdfBuffer, filename } = await examService.compileDraft(
          req.body,
          req.id,
        );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.status(200).send(pdfBuffer);
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
          res.status(404).json({ error: { message: "Asset not found" } });
          return;
        }

        res.sendFile(filePath);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createExamController };
