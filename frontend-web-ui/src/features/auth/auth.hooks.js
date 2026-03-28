import { useMutation } from "@tanstack/react-query";
import { usersApi } from "../../api/users.api";
import { notifySuccess } from "../../app/notifications";
import i18n from "../../i18n";
import { saveAuthSession, clearAuthSession } from "./authSession";

export { clearAuthSession };

export function useRegister() {
  return useMutation({
    mutationFn: async (values) => {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      };
      const registerResult = await usersApi.register(payload);
      const loginResult = await usersApi.login({
        email: payload.email,
        password: payload.password,
      });

      saveAuthSession({
        accessToken: loginResult?.data?.accessToken,
        user: loginResult?.data?.user,
      });

      return {
        ...registerResult,
        data: {
          ...(registerResult?.data || {}),
          login: loginResult?.data || null,
        },
      };
    },
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.userRegistered"));
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (values) => {
      return usersApi.login(values);
    },
    onSuccess: (result) => {
      saveAuthSession({
        accessToken: result?.data?.accessToken,
        user: result?.data?.user,
      });
      notifySuccess(i18n.t("notifications.userLoggedIn"));
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (values) => {
      return usersApi.resetPassword(values);
    },
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.passwordReset"));
    },
  });
}
