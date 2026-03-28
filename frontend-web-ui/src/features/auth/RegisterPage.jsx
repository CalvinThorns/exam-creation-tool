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
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import { Link as RouterLink } from "react-router-dom";
import { useRegister } from "./auth.hooks";
import { useTranslation } from "react-i18next";
import { getPasswordRequirementChecks } from "./passwordPolicy";

export function RegisterPage() {
  const { t } = useTranslation();
  const registerM = useRegister();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    repeatPassword: "",
  });
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isRecoveryKeyCopied, setIsRecoveryKeyCopied] = useState(false);
  const [localError, setLocalError] = useState("");

  const passwordChecks = getPasswordRequirementChecks(form.password);
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

    if (form.password !== form.repeatPassword) {
      setLocalError(t("auth.passwordMismatch"));
      return;
    }

    setLocalError("");

    const result = await registerM.mutateAsync(form);
    setRecoveryKey(result?.data?.recoveryKey || "");
    setIsRecoveryKeyCopied(false);
  };

  const copyRecoveryKey = async () => {
    if (!recoveryKey) return;
    await navigator.clipboard.writeText(recoveryKey);
    setIsRecoveryKeyCopied(true);
  };

  return (
    <Box className="min-h-screen flex items-center justify-center p-4">
      <Paper sx={{ width: "100%", maxWidth: 520, p: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t("auth.registerTitle")}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("auth.registerSubtitle")}
        </Typography>

        {localError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {localError}
          </Alert>
        ) : null}

        {registerM.error?.userMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {registerM.error.userMessage}
          </Alert>
        ) : null}

        {recoveryKey ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t("auth.recoveryKeySaved")}
            <Box
              sx={{
                mt: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <TextField
                value={recoveryKey}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton
                      aria-label={t("auth.copyRecoveryKey")}
                      edge="end"
                      onClick={copyRecoveryKey}
                    >
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            {isRecoveryKeyCopied ? (
              <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                {t("auth.copied")}
              </Typography>
            ) : null}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("auth.firstName")}
                value={form.firstName}
                onChange={onChange("firstName")}
                required
                fullWidth
              />
              <TextField
                label={t("auth.lastName")}
                value={form.lastName}
                onChange={onChange("lastName")}
                required
                fullWidth
              />
            </Stack>

            <TextField
              type="email"
              label={t("auth.email")}
              value={form.email}
              onChange={onChange("email")}
              required
            />

            <TextField
              type="password"
              label={t("auth.password")}
              value={form.password}
              onChange={onChange("password")}
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
              disabled={registerM.isPending}
            >
              {registerM.isPending ? t("auth.registering") : t("auth.register")}
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
          <Link component={RouterLink} to="/reset-password" underline="hover">
            {t("auth.goToReset")}
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
