import { useState } from "react";
import {
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { SettingsOutlined } from "@mui/icons-material";
import { examsApi } from "../../api/exams.api";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { BaseLatexTemplateDialog } from "./BaseLatexTemplateDialog";
import { CustomizeDialog } from "./CustomizeDialog";

export function SidebarCustomize({ isCollapsed }) {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isBaseTemplateDialogOpen, setIsBaseTemplateDialogOpen] =
    useState(false);
  const [baseTemplateDialogKey, setBaseTemplateDialogKey] = useState(0);
  const [baseTemplateDraft, setBaseTemplateDraft] = useState("");
  const [isLoadingBaseTemplate, setIsLoadingBaseTemplate] = useState(false);
  const [isSavingBaseTemplate, setIsSavingBaseTemplate] = useState(false);
  const [isCompilingBaseTemplate, setIsCompilingBaseTemplate] = useState(false);
  const [baseTemplateError, setBaseTemplateError] = useState("");
  const [baseTemplateCompilerMessages, setBaseTemplateCompilerMessages] =
    useState(null);
  const { pdfUrl, setPdfFromBase64, clearPdf } =
    usePdfPreview("base-template.pdf");

  const openCustomizeDialog = () => {
    setIsCustomizeOpen(true);
  };

  const closeCustomizeDialog = () => {
    setIsCustomizeOpen(false);
  };

  const openBaseTemplateDialog = async () => {
    setIsCustomizeOpen(false);
    setBaseTemplateDialogKey((value) => value + 1);
    setIsBaseTemplateDialogOpen(true);
    setIsLoadingBaseTemplate(true);
    setBaseTemplateError("");
    setBaseTemplateCompilerMessages(null);
    clearPdf();

    try {
      const response = await examsApi.getBaseLatexTemplate();
      const payload = response?.data || response || {};
      setBaseTemplateDraft(payload.template || "");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load base template.";
      setBaseTemplateError(message);
    } finally {
      setIsLoadingBaseTemplate(false);
    }
  };

  const closeBaseTemplateDialog = () => {
    setIsBaseTemplateDialogOpen(false);
    setBaseTemplateError("");
    setBaseTemplateCompilerMessages(null);
    setIsCompilingBaseTemplate(false);
    clearPdf();
  };

  const compileBaseTemplate = async () => {
    clearPdf();
    setBaseTemplateError("");
    setBaseTemplateCompilerMessages(null);
    setIsCompilingBaseTemplate(true);

    try {
      const response = await examsApi.compileLatexOnly({
        latexContent: baseTemplateDraft,
      });
      const compileData = response?.data || response || {};
      const { pdfBase64, filename, contentType, errors } = compileData;

      setPdfFromBase64({
        base64: pdfBase64,
        filename,
        mimeType: contentType || "application/pdf",
      });

      setBaseTemplateCompilerMessages({
        clsiStatus: errors?.clsiStatus || null,
        buildId: errors?.buildId || null,
        errorCount: Number(errors?.errorCount ?? errors?.errors?.length ?? 0),
        warningCount: Number(
          errors?.warningCount ?? errors?.warnings?.length ?? 0,
        ),
        errors: errors?.errors || [],
        warnings: errors?.warnings || [],
        timings: errors?.timings || null,
        stats: errors?.stats || null,
        log: errors?.log || "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to compile base template preview.";

      setBaseTemplateCompilerMessages({
        clsiStatus: null,
        buildId: null,
        errorCount: 1,
        warningCount: 0,
        errors: [{ message }],
        warnings: [],
        timings: null,
        stats: null,
        log: message,
      });
    } finally {
      setIsCompilingBaseTemplate(false);
    }
  };

  const saveBaseTemplate = async () => {
    setIsSavingBaseTemplate(true);
    setBaseTemplateError("");
    try {
      const response = await examsApi.updateBaseLatexTemplate({
        template: baseTemplateDraft,
      });
      const payload = response?.data || response || {};
      setBaseTemplateDraft(payload.template || baseTemplateDraft);
      setIsBaseTemplateDialogOpen(false);
      clearPdf();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save base template.";
      setBaseTemplateError(message);
    } finally {
      setIsSavingBaseTemplate(false);
    }
  };

  return (
    <>
      <Box sx={{ mt: "auto" }}>
        <List disablePadding>
          <Tooltip
            title="Customize"
            placement="right"
            disableHoverListener={!isCollapsed}
          >
            <ListItemButton
              onClick={openCustomizeDialog}
              sx={{
                minHeight: 48,
                px: isCollapsed ? 1.5 : 2,
                justifyContent: isCollapsed ? "center" : "flex-start",
                color: "#e8efff",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCollapsed ? 0 : 1.5,
                  justifyContent: "center",
                  color: "inherit",
                }}
              >
                <SettingsOutlined fontSize="small" />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Customize" />}
              {!isCollapsed && isLoadingBaseTemplate ? (
                <CircularProgress size={14} sx={{ color: "#e8efff" }} />
              ) : null}
            </ListItemButton>
          </Tooltip>
        </List>
      </Box>

      <CustomizeDialog
        open={isCustomizeOpen}
        onClose={closeCustomizeDialog}
        onEditBaseLatex={openBaseTemplateDialog}
      />

      <BaseLatexTemplateDialog
        key={baseTemplateDialogKey}
        open={isBaseTemplateDialogOpen}
        onClose={closeBaseTemplateDialog}
        templateValue={baseTemplateDraft}
        onTemplateChange={setBaseTemplateDraft}
        onCompile={compileBaseTemplate}
        isCompiling={isCompilingBaseTemplate}
        pdfUrl={pdfUrl}
        compilerMessages={baseTemplateCompilerMessages}
        onSave={saveBaseTemplate}
        isLoadingTemplate={isLoadingBaseTemplate}
        isSavingTemplate={isSavingBaseTemplate}
        errorMessage={baseTemplateError}
        disableActions={isLoadingBaseTemplate}
      />
    </>
  );
}
