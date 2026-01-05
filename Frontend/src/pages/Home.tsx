/**
 * Home Page - Redesigned to match Jansunwai-Samadhan Portal
 * Features: Banner section, Statistics cards, Action cards, Footer
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  MessageSquare,
  Bot,
  X,
  Settings,
  Briefcase,
  Hourglass,
  Trophy,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useI18n } from "@/contexts/I18nContext";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showChatbot, setShowChatbot] = useState(false);

  // Banner images for carousel
  const bannerImages = [
    "https://up.bjp.org/filesup/SPG-image/photo-1_0.jpg",
    "https://up.bjp.org/filesup/SPG-image/photo-7_0.jpg",
    "https://up.bjp.org/filesup/SPG-image/photo-4_0.jpg",
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-slide carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % bannerImages.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [bannerImages.length]);

  // Statistics data (can be fetched from API later)
  const statistics = [
    {
      number: "62,399,467",
      labelKey: "statistics.received",
      icon: Briefcase,
      color: "text-blue-600",
    },
    {
      number: "582,077",
      labelKey: "statistics.pending",
      icon: Hourglass,
      color: "text-orange-600",
    },
    {
      number: "61,498,778",
      labelKey: "statistics.resolved",
      icon: Trophy,
      color: "text-green-600",
    },
  ];

  const actionCards = [
    {
      titleKey: "actionCards.registerGrievance",
      icon: FileText,
      path: "/file-complaint",
      bgColor: "bg-red-600 hover:bg-red-700",
      iconBg: "bg-red-500",
    },
    {
      titleKey: "actionCards.trackGrievance",
      icon: Search,
      path: "/track",
      bgColor: "bg-[#ff791a] hover:bg-[#e66a15]",
      iconBg: "bg-orange-500",
    },
    {
      titleKey: "actionCards.sendReminder",
      icon: Calendar,
      path: "/request-meeting",
      bgColor: "bg-teal-600 hover:bg-teal-700",
      iconBg: "bg-teal-500",
    },
    {
      titleKey: "actionCards.giveFeedback",
      icon: MessageSquare,
      path: "/feedback",
      bgColor: "bg-purple-600 hover:bg-purple-700",
      iconBg: "bg-purple-500",
    },
  ];

  return (
    <div className="relative min-h-screen bg-white">
      {/* Hero/Banner Section */}
      <section className="relative w-full min-h-[500px] md:min-h-[600px] overflow-hidden">
        {/* Image Carousel */}
        <div className="absolute inset-0">
          {/* Fallback gradient if images don't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2a4a6f] to-[#3a5a7f] z-0"></div>

          {/* Carousel Images */}
          {bannerImages.map((imageUrl, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0"
              }`}
              style={{
                backgroundImage: `url(${imageUrl})`,
              }}
            />
          ))}

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent z-20"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-30 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[400px]">
            {/* Left Side - Text Content */}
            <div className="text-white space-y-6">
              <div className="inline-block">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl mb-4 overflow-hidden">
                  <img
                    src="https://raw.githubusercontent.com/himanshujainsanghai/Images/refs/heads/main/bjp_logo.avif"
                    alt="BJP Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                {t("home.hero.title")}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6">
                {t("home.hero.subtitle")}
              </p>
              <div className="space-y-3 text-sm md:text-base">
                <p>{t("home.hero.message1")}</p>
                <p>{t("home.hero.message2")}</p>
              </div>
            </div>

            {/* Right Side - Image Placeholder (for prominent figure) */}
            <div className="hidden lg:flex justify-end items-center">
              <div className="relative">
                <div className="w-80 h-80 lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px] rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 overflow-hidden shadow-2xl">
                  <img
                    src="https://raw.githubusercontent.com/himanshujainsanghai/Images/refs/heads/main/ASHN8681.JPG"
                    alt="Official"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {actionCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <button
                  key={`${card.titleKey}-${index}`}
                  onClick={() => navigate(card.path)}
                  className={`${card.bgColor} rounded-xl p-5 md:p-7 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center space-y-3 min-h-[180px] md:min-h-[220px] w-full`}
                >
                  <div
                    className={`${card.iconBg} p-4 md:p-5 rounded-full shadow-lg`}
                  >
                    <Icon className="w-7 h-7 md:w-9 md:h-9" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-sm md:text-base mb-1">
                      {t(`home.${card.titleKey}.title`)}
                    </h3>
                    <p className="text-xs md:text-sm opacity-90 leading-tight">
                      {t(`home.${card.titleKey}.subtitle`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Chatbot Icon - Fixed Bottom Left */}
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 left-6 z-50 w-16 h-16 bg-[#ff791a] hover:bg-[#e66a15] rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        aria-label="Open Chatbot"
      >
        <Bot className="w-8 h-8 text-white" />
      </button>

      {/* Chatbot Panel */}
      {showChatbot && (
        <div className="fixed bottom-24 left-6 z-50 w-80 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
          <div className="bg-[#1e3a5f] text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold">{t("home.chatbot.title")}</h3>
            </div>
            <button
              onClick={() => setShowChatbot(false)}
              className="hover:bg-[#2a4a6f] rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 h-64 overflow-y-auto">
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  {t("home.chatbot.greeting")}
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    navigate("/file-complaint");
                    setShowChatbot(false);
                  }}
                  className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t("home.chatbot.fileComplaint")}
                </button>
                <button
                  onClick={() => {
                    navigate("/track");
                    setShowChatbot(false);
                  }}
                  className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t("home.chatbot.trackComplaint")}
                </button>
                <button
                  onClick={() => {
                    navigate("/request-meeting");
                    setShowChatbot(false);
                  }}
                  className="text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t("home.chatbot.requestMeeting")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings/Gear Icon - Fixed Right Side */}
      <button
        className="fixed right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white hover:bg-gray-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 border border-gray-200"
        aria-label="Settings"
      >
        <Settings className="w-6 h-6 text-[#1e3a5f]" />
      </button>
    </div>
  );
};

export default Home;
