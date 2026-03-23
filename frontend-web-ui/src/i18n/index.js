import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";

const LANGUAGE_STORAGE_KEY = "exam-creation-tool.language";
const SUPPORTED_LANGUAGES = ["en", "de"];

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(savedLanguage)) {
    return savedLanguage;
  }

  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (nextLanguage) => {
  if (typeof window === "undefined") {
    return;
  }

  if (SUPPORTED_LANGUAGES.includes(nextLanguage)) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }
});

export const languageOptions = [
  { value: "en", labelKey: "language.english", flag: "🇺🇸" },
  { value: "de", labelKey: "language.german", flag: "🇩🇪" },
];

export default i18n;
