import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const languages = [
  ["en", "English"], ["es", "Español"], ["fr", "Français"], ["pt", "Português"],
  ["bhb", "Bhili · भीली · ભીલી"],
  ["bhb", "Bhili · भीली · ભીલી"],
  ["de", "Deutsch"], ["zh", "中文"], ["ar", "العربية"], ["hi", "हिन्दी"],
];

const messages = {
  en: { smoothies: "Smoothies", astra: "Astra AI", saved: "Saved", frequencies: "Frequencies", meals: "Meal Plans", taiChi: "Tai Chi", movement: "Movement", vip: "V.I.P.", profile: "Profile", plans: "Plans", language: "Language", signIn: "Sign in / Create account", signOut: "Sign out", account: "Subscriber account", healing: "Healing From Within", system: "Wellness Intelligence System" },
  es: { smoothies: "Batidos", astra: "Astra IA", saved: "Guardados", frequencies: "Frecuencias", meals: "Planes de comidas", taiChi: "Tai Chi", movement: "Movimiento", vip: "V.I.P.", profile: "Perfil", plans: "Planes", language: "Idioma", healing: "Sanación desde dentro", system: "Sistema de inteligencia de bienestar" },
  fr: { smoothies: "Smoothies", astra: "Astra IA", saved: "Enregistrés", frequencies: "Fréquences", meals: "Plans de repas", taiChi: "Tai Chi", movement: "Mouvement", vip: "V.I.P.", profile: "Profil", plans: "Abonnements", language: "Langue", healing: "Guérir de l’intérieur", system: "Système d’intelligence bien-être" },
  pt: { smoothies: "Vitaminas", astra: "Astra IA", saved: "Salvos", frequencies: "Frequências", meals: "Planos alimentares", taiChi: "Tai Chi", movement: "Movimento", vip: "V.I.P.", profile: "Perfil", plans: "Planos", language: "Idioma", healing: "Cura de dentro para fora", system: "Sistema inteligente de bem-estar" },
  de: { smoothies: "Smoothies", astra: "Astra KI", saved: "Gespeichert", frequencies: "Frequenzen", meals: "Speisepläne", taiChi: "Tai Chi", movement: "Bewegung", vip: "V.I.P.", profile: "Profil", plans: "Tarife", language: "Sprache", healing: "Heilung von innen", system: "Wellness-Intelligenzsystem" },
  zh: { smoothies: "果昔", astra: "Astra 人工智能", saved: "已保存", frequencies: "频率", meals: "膳食计划", taiChi: "太极", movement: "运动", vip: "贵宾", profile: "个人资料", plans: "订阅", language: "语言", healing: "由内而外的健康", system: "健康智能系统" },
  ar: { smoothies: "العصائر", astra: "أسترا الذكي", saved: "المحفوظات", frequencies: "الترددات", meals: "خطط الوجبات", taiChi: "تاي تشي", movement: "الحركة", vip: "كبار الشخصيات", profile: "الملف الشخصي", plans: "الخطط", language: "اللغة", healing: "العافية من الداخل", system: "نظام ذكاء العافية" },
  hi: { smoothies: "स्मूदी", astra: "एस्ट्रा एआई", saved: "सहेजे गए", frequencies: "आवृत्तियाँ", meals: "भोजन योजनाएँ", taiChi: "ताई ची", movement: "गतिविधि", vip: "वी.आई.पी.", profile: "प्रोफ़ाइल", plans: "योजनाएँ", language: "भाषा", healing: "भीतर से स्वास्थ्य", system: "वेलनेस इंटेलिजेंस सिस्टम" },
};

const LanguageContext = createContext(null);

const translationCodes = { en: "en", es: "es", fr: "fr", pt: "pt", de: "de", zh: "zh-CN", ar: "ar", hi: "hi" };

function setTranslationCookie(language) {
  const target = translationCodes[language] || "en";
  const value = target === "en" ? "/en/en" : `/en/${target}`;
  document.cookie = `googtrans=${value};path=/;SameSite=Lax`;
  if (window.location.hostname.includes("natures-elixirz-os.web.app")) {
    document.cookie = `googtrans=${value};path=/;domain=.natures-elixirz-os.web.app;SameSite=Lax`;
  }
}

function FullPlatformTranslator({ language }) {
  useEffect(() => {
    const initialize = () => {
      if (document.getElementById("google_translate_element")) return;
      const mount = document.createElement("div");
      mount.id = "google_translate_element";
      mount.setAttribute("aria-hidden", "true");
      document.body.appendChild(mount);
      window.googleTranslateElementInit = () => {
        if (!window.google?.translate?.TranslateElement) return;
        new window.google.translate.TranslateElement({
          pageLanguage: "en",
          includedLanguages: "ar,de,en,es,fr,hi,pt,zh-CN",
          autoDisplay: false,
        }, "google_translate_element");
      };
      if (!document.querySelector('script[data-ne-translate="true"]')) {
        const script = document.createElement("script");
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        script.dataset.neTranslate = "true";
        document.head.appendChild(script);
      }
    };
    if (window.__naturesElixirzDataReady) initialize();
    window.addEventListener("naturesElixirz:data-ready", initialize, { once: true });
    return () => window.removeEventListener("naturesElixirz:data-ready", initialize);
  }, []);

  useEffect(() => { setTranslationCookie(language); }, [language]);
  return null;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("naturesElixirz.language") || "en");
  useEffect(() => {
    localStorage.setItem("naturesElixirz.language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const chooseLanguage = (nextLanguage) => {
    if (!translationCodes[nextLanguage] || nextLanguage === language) return;
    localStorage.setItem("naturesElixirz.language", nextLanguage);
    setTranslationCookie(nextLanguage);
    setLanguage(nextLanguage);
    window.setTimeout(() => window.location.reload(), 80);
  };
  const value = useMemo(() => ({
    language,
    languageName: languages.find(([code]) => code === language)?.[1] || "English",
    setLanguage: chooseLanguage,
    t: (key) => messages[language]?.[key] || messages.en[key] || key,
  }), [language]);
  return <LanguageContext.Provider value={value}><FullPlatformTranslator language={language} />{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
