/**
 * App Layout Component
 * Simple header with logo and login button
 */

import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Home, FilePlus, Search, Calendar, LogIn, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const navigationItems = [
    { type: "route", path: "/", icon: Home, label: "Home" },
    {
      type: "route",
      path: "/file-complaint",
      icon: FilePlus,
      label: "New Complaint",
    },
    { type: "route", path: "/track", icon: Search, label: "Track" },
    {
      type: "route",
      path: "/request-meeting",
      icon: Calendar,
      label: "Meeting",
    },
  ];

  const handleNavigation = (item: (typeof navigationItems)[0]) => {
    navigate(item.path);
  };

  const handleAdminAccess = () => {
    navigate("/admin");
  };

  const handleLogin = () => {
    navigate("/admin");
  };

  // Don't show navigation on home page (it has its own design)
  const isHomePage = location.pathname === "/";

  if (isHomePage) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header - Blue/Dark Header for Home Page */}
        <header className="bg-[#1e3a5f] text-white shadow-lg">
          {/* Top Header Bar */}
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden">
                  <img
                    src="https://raw.githubusercontent.com/himanshujainsanghai/Images/refs/heads/main/bjp_logo.avif"
                    alt="BJP Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {t("header.logo.title")}
                </h1>
              </div>

              {/* Language Selector and Login Button */}
              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <Select
                  value={language}
                  onValueChange={(value: "hindi" | "english") =>
                    setLanguage(value)
                  }
                >
                  <SelectTrigger className="h-9 w-[130px] bg-white/10 hover:bg-white/20 border-white/30 text-white focus:ring-2 focus:ring-white/50 focus:ring-offset-0 data-[state=open]:bg-white/20">
                    <div className="flex items-center gap-2 w-full">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <SelectValue className="text-sm font-medium">
                        {t(`header.language.${language}`)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg min-w-[140px]">
                    <SelectItem
                      value="hindi"
                      className="cursor-pointer py-2.5 focus:bg-[#ff791a]/10 focus:text-[#ff791a] data-[highlighted]:bg-[#ff791a]/10"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">
                          {t("header.language.hindi")}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          Hindi
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="english"
                      className="cursor-pointer py-2.5 focus:bg-[#ff791a]/10 focus:text-[#ff791a] data-[highlighted]:bg-[#ff791a]/10"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">
                          {t("header.language.english")}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          अंग्रेजी
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Login Button */}
                {!isAuthenticated && (
                  <Button
                    onClick={handleLogin}
                    className="flex items-center space-x-2 bg-[#ff791a] hover:bg-[#e66a15] text-white border-0"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {t("header.login.officerLogin")}
                    </span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                )}
                {isAuthenticated && (
                  <Button
                    onClick={handleAdminAccess}
                    variant="outline"
                    className="flex items-center space-x-2 border-white text-white bg-white/10 hover:bg-white/20 hover:text-blue-500"
                  >
                    <span>{t("header.login.adminPanel")}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="bg-[#2a4a6f] border-t border-[#3a5a7f]">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4 md:gap-6 h-12 overflow-x-auto">
                <Link
                  to="/"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.home")}
                </Link>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.governmentOrders")}
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.download")}
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.antiLandMafia")}
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.antiCorruption")}
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap"
                >
                  {t("header.navigation.cmMonitoring")}
                </a>
                <a
                  href="#"
                  className="text-sm font-medium text-white hover:text-[#ff791a] transition-colors whitespace-nowrap relative"
                >
                  {t("header.navigation.sandesApp")}
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
                    {t("header.navigation.new")}
                  </span>
                </a>
              </div>
            </div>
          </nav>
        </header>

        {/* Home Page Content - No padding/margin constraints */}
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Standard layout for other pages
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-orange-200 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold gradient-orange-text">
                  Jansunwai-Samadhan
                </h1>
              </div>
            </div>

            {/* Admin CTA */}
            <div className="flex items-center gap-2">
              {!isAuthenticated && (
                <Button
                  onClick={handleAdminAccess}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin Login</span>
                </Button>
              )}
              {isAuthenticated && location.pathname !== "/admin" && (
                <Button
                  onClick={handleAdminAccess}
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center space-x-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <span>Admin Panel</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-orange-200 bg-white/95 backdrop-blur-lg shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => handleNavigation(item)}
                className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <IconComponent
                  className={`w-6 h-6 mb-1 transition-colors duration-200`}
                />
                <span className="text-xs font-semibold tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
