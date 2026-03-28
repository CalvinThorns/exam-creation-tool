import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useLogin } from "./auth.hooks";
import { useTranslation } from "react-i18next";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginM = useLogin();

  const [form, setForm] = useState({ email: "", password: "" });

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = await loginM.mutateAsync(form);
    if (result?.data?.accessToken) {
      navigate("/exams/list", { replace: true });
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center p-4">
      <Paper sx={{ width: "100%", maxWidth: 460, p: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t("auth.loginTitle")}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("auth.loginSubtitle")}
        </Typography>

        {loginM.error?.userMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loginM.error.userMessage}
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
              type="password"
              label={t("auth.password")}
              value={form.password}
              onChange={onChange("password")}
              required
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loginM.isPending}
            >
              {loginM.isPending ? t("auth.loggingIn") : t("auth.login")}
            </Button>
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2, flexWrap: "wrap", justifyContent: "center" }}
        >
          <Link component={RouterLink} to="/register" underline="hover">
            {t("auth.register")}
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
