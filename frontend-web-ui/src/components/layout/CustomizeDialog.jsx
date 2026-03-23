import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useColorMode } from "../../app/useColorMode";
import i18n, { languageOptions } from "../../i18n";

export function CustomizeDialog({ open, onClose, onEditBaseLatex }) {
  const { t } = useTranslation();
  const { mode, setMode } = useColorMode();
  const language = i18n.language === "de" ? "de" : "en";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("customizeDialog.title")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel id="language-select-label">
              {t("language.label")}
            </InputLabel>
            <Select
              labelId="language-select-label"
              id="language-select"
              value={language}
              label={t("language.label")}
              onChange={(event) => i18n.changeLanguage(event.target.value)}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box component="span" sx={{ mr: 1 }}>
                    {option.flag}
                  </Box>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="theme-mode-select-label">
              {t("customizeDialog.mode")}
            </InputLabel>
            <Select
              labelId="theme-mode-select-label"
              id="theme-mode-select"
              value={mode}
              label={t("customizeDialog.mode")}
              onChange={(event) => setMode(event.target.value)}
            >
              <MenuItem value="light">{t("customizeDialog.light")}</MenuItem>
              <MenuItem value="dark">{t("customizeDialog.dark")}</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={onEditBaseLatex}>
            {t("customizeDialog.editBaseLatex")}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
