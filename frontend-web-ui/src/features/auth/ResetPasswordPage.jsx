import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useResetPassword } from "./auth.hooks";
import { useTranslation } from "react-i18next";
import { getPasswordRequirementChecks } from "./passwordPolicy";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const resetM = useResetPassword();

  const [form, setForm] = useState({
    email: "",
    recoveryKey: "",
    newPassword: "",
    repeatPassword: "",
  });
  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [isNewRecoveryKeyCopied, setIsNewRecoveryKeyCopied] = useState(false);
  const [localError, setLocalError] = useState("");

  const passwordChecks = getPasswordRequirementChecks(form.newPassword);
  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial;

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!isPasswordValid) {
      const missing = [];
      if (!passwordChecks.minLength)
        missing.push(t("auth.requirementMinLength"));
      if (!passwordChecks.hasNumber) missing.push(t("auth.requirementNumber"));
      if (!passwordChecks.hasSpecial)
        missing.push(t("auth.requirementSpecial"));

      setLocalError(
        `${t("auth.passwordMissingPrefix")}: ${missing.join(", ")}`,
      );
      return;
    }

    if (form.newPassword !== form.repeatPassword) {
      setLocalError(t("auth.passwordMismatch"));
      return;
    }

    setLocalError("");

    const result = await resetM.mutateAsync(form);
    setNewRecoveryKey(result?.data?.recoveryKey || "");
    setIsNewRecoveryKeyCopied(false);
  };

  const copyNewRecoveryKey = async () => {
    if (!newRecoveryKey) return;
    await navigator.clipboard.writeText(newRecoveryKey);
    setIsNewRecoveryKeyCopied(true);
  };

  return (
    <Box className="min-h-screen flex items-center justify-center p-4">
      <Paper sx={{ width: "100%", maxWidth: 520, p: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t("auth.resetTitle")}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("auth.resetSubtitle")}
        </Typography>

        {localError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {localError}
          </Alert>
        ) : null}

        {resetM.error?.userMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {resetM.error.userMessage}
          </Alert>
        ) : null}

        {newRecoveryKey ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t("auth.newRecoveryKeySaved")}
            <Box
              sx={{
                mt: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <TextField
                value={newRecoveryKey}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton
                      aria-label={t("auth.copyRecoveryKey")}
                      edge="end"
                      onClick={copyNewRecoveryKey}
                    >
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            {isNewRecoveryKeyCopied ? (
              <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                {t("auth.copied")}
              </Typography>
            ) : null}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              type="email"
              label={t("auth.email")}
              value={form.email}
              onChange={onChange("email")}
              required
            />

            <TextField
              label={t("auth.recoveryKey")}
              value={form.recoveryKey}
              onChange={onChange("recoveryKey")}
              required
            />
            <TextField
              type="password"
              label={t("auth.newPassword")}
              value={form.newPassword}
              onChange={onChange("newPassword")}
              required
            />

            <Stack spacing={0.5} sx={{ mt: -1 }}>
              {[
                {
                  ok: passwordChecks.minLength,
                  label: t("auth.requirementMinLength"),
                },
                {
                  ok: passwordChecks.hasNumber,
                  label: t("auth.requirementNumber"),
                },
                {
                  ok: passwordChecks.hasSpecial,
                  label: t("auth.requirementSpecial"),
                },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  {item.ok ? (
                    <CheckCircleOutlineOutlinedIcon
                      color="success"
                      fontSize="small"
                    />
                  ) : (
                    <RadioButtonUncheckedOutlinedIcon
                      color="disabled"
                      fontSize="small"
                    />
                  )}
                  <Typography
                    variant="caption"
                    color={item.ok ? "success.main" : "text.secondary"}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <TextField
              type="password"
              label={t("auth.repeatPassword")}
              value={form.repeatPassword}
              onChange={onChange("repeatPassword")}
              required
            />
            <Button
              type="submit"
              variant="contained"
              disabled={resetM.isPending}
            >
              {resetM.isPending ? t("auth.resetting") : t("auth.resetPassword")}
            </Button>
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2, flexWrap: "wrap", justifyContent: "center" }}
        >
          <Link component={RouterLink} to="/login" underline="hover">
            {t("auth.login")}
          </Link>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Link component={RouterLink} to="/register" underline="hover">
            {t("auth.register")}
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
