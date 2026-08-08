import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationKO from './locales/ko.json';
import translationEN from './locales/en.json';

const resources = {
  ko: { translation: translationKO },
  en: { translation: translationEN }
};

i18n
  .use(LanguageDetector) // 사용자 브라우저의 기본 언어를 자동 감지
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // 기본 언어를 영어로 설정 (글로벌 호환성)
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;