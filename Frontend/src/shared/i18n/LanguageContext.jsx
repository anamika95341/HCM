import { createContext, useCallback, useContext, useState } from "react";
import i18n, { LANG_STORAGE_KEY } from "./i18n.js";

const LanguageContext = createContext({
  language: "en",
  toggleLanguage: () => {},
  setLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => i18n.language || "en");

  const setLanguage = useCallback((lang) => {
    i18n.changeLanguage(lang);
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "hi" : "en");
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
