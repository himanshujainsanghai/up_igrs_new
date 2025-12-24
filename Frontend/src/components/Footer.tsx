/**
 * Footer Component
 * Footer with links, contact information, and social media icons
 */

import React from "react";
import { Facebook, Twitter, Youtube, ArrowUp } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const Footer: React.FC = () => {
  const { t } = useI18n();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#1e3a5f] text-white">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          <a
            href="#"
            className="text-sm hover:text-[#ff791a] transition-colors"
          >
            {t("footer.links.websitePolicies")}
          </a>
          <a
            href="#"
            className="text-sm hover:text-[#ff791a] transition-colors"
          >
            {t("footer.links.aboutUs")}
          </a>
          <a
            href="#"
            className="text-sm hover:text-[#ff791a] transition-colors"
          >
            {t("footer.links.suggestions")}
          </a>
          <a
            href="#"
            className="text-sm hover:text-[#ff791a] transition-colors"
          >
            {t("footer.links.contactUs")}
          </a>
          <a
            href="#"
            className="text-sm hover:text-[#ff791a] transition-colors"
          >
            {t("footer.links.faq")}
          </a>
        </div>

        {/* Social Media Icons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#ff791a] flex items-center justify-center transition-colors"
            aria-label={t("footer.social.facebook")}
          >
            <Facebook className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#ff791a] flex items-center justify-center transition-colors"
            aria-label={t("footer.social.twitter")}
          >
            <Twitter className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#ff791a] flex items-center justify-center transition-colors"
            aria-label={t("footer.social.youtube")}
          >
            <Youtube className="w-5 h-5" />
          </a>
        </div>

        {/* Contact Information */}
        <div className="text-center text-sm text-white/80 mb-4">
          <p className="mb-2">{t("footer.contact.queryText")}</p>
          <p className="mb-2">{t("footer.contact.contactPerson")}</p>
          <p className="mb-2">
            {t("footer.contact.emailLabel")}{" "}
            <a
              href="mailto:jansunwai-up@gov.in"
              className="text-[#ff791a] hover:underline"
            >
              jansunwai-up@gov.in
            </a>
          </p>
        </div>

        {/* Copyright and Last Updated */}
        <div className="text-center text-xs text-white/60 border-t border-white/20 pt-4">
          <p className="mb-1">
            {t("footer.copyright.lastUpdated")}{" "}
            {new Date().toLocaleDateString()}
          </p>
          <p className="mb-1">{t("footer.copyright.vishnu")}</p>
          <p>{t("footer.copyright.content")}</p>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-[#ff791a] hover:bg-[#e66a15] rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6 text-white" />
      </button>
    </footer>
  );
};

export default Footer;
