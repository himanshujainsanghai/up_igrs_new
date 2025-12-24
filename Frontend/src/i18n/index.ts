/**
 * i18n Configuration and Translations Index
 * Centralized translation management
 */

import hindiHome from "./hindi/home.json";
import hindiHeader from "./hindi/header.json";
import hindiFooter from "./hindi/footer.json";
import englishHome from "./english/home.json";
import englishHeader from "./english/header.json";
import englishFooter from "./english/footer.json";

export type Language = "hindi" | "english";

export interface Translations {
  home: typeof hindiHome;
  header: typeof hindiHeader;
  footer: typeof hindiFooter;
}

export const translations: Record<Language, Translations> = {
  hindi: {
    home: hindiHome,
    header: hindiHeader,
    footer: hindiFooter,
  },
  english: {
    home: englishHome,
    header: englishHeader,
    footer: englishFooter,
  },
};

export const defaultLanguage: Language = "hindi";

export const supportedLanguages: Language[] = ["hindi", "english"];

