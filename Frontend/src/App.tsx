/**
 * Main App Component
 * Sets up routing, contexts, and providers
 */

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "@/store";
import { initializeAuth, getMe } from "@/store/slices/auth.slice";
import { STORAGE_KEYS } from "@/lib/constants";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { BadaunDistrictProvider } from "@/contexts/BadaunDistrictContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/components/AdminLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Track from "@/pages/Track";
import Complaints from "@/pages/Complaints";
import FileComplaint from "@/pages/FileComplaint";
import RequestMeeting from "@/pages/RequestMeeting";
import Feedback from "@/pages/Feedback";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/admin/Dashboard";
import ComplaintsPage from "@/pages/admin/ComplaintsPage";
import ComplaintsHeatMapPage from "@/pages/admin/ComplaintsHeatMapPage";
import ComplaintDetailPage from "@/pages/admin/ComplaintDetailPage";
import MeetingsPage from "@/pages/admin/MeetingsPage";
import InventoryPage from "@/pages/admin/InventoryPage";
import InventoryDetailPage from "@/pages/admin/InventoryDetailPage";
import InventoryFormPage from "@/pages/admin/InventoryFormPage";
import DocumentsPage from "@/pages/admin/DocumentsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import BadaunMapTestPage from "./pages/admin/BadaunMapTestPage";
import BadaunHeatMapPage from "./pages/admin/BadaunHeatMapPage";
import HierarchicalDataUploadPage from "./pages/admin/HierarchicalDataUploadPage";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent: React.FC = () => {
  useEffect(() => {
    // Initialize auth from localStorage
    store.dispatch(initializeAuth());

    // Verify token is still valid by calling getMe
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      // Verify token with backend
      store.dispatch(getMe()).catch(() => {
        // Token invalid, clear auth state
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ModalProvider>
            <BadaunDistrictProvider autoFetch={false}>
              <Router>
                <Routes>
                  {/* Standalone Heat Map Routes - No AdminLayout */}
                  <Route
                    path="/admin/complaints/heatmap"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <ComplaintsHeatMapPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/badaun/heatmap"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <BadaunHeatMapPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedRoute allowOfficer={true}>
                        <AdminLayout>
                          <Routes>
                            <Route index element={<Admin />} />
                            <Route
                              path="badaun"
                              element={<BadaunMapTestPage />}
                            />
                            <Route
                              path="data-upload"
                              element={<HierarchicalDataUploadPage />}
                            />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route
                              path="complaints"
                              element={<ComplaintsPage />}
                            />
                            <Route
                              path="complaints/:id"
                              element={<ComplaintDetailPage />}
                            />
                            <Route
                              path="complaints/pending"
                              element={<ComplaintsPage />}
                            />
                            <Route
                              path="complaints/in-progress"
                              element={<ComplaintsPage />}
                            />
                            <Route
                              path="complaints/resolved"
                              element={<ComplaintsPage />}
                            />
                            <Route
                              path="complaints/rejected"
                              element={<ComplaintsPage />}
                            />
                            <Route
                              path="complaints/category/:category"
                              element={<ComplaintsPage />}
                            />
                            <Route path="meetings" element={<MeetingsPage />} />
                            <Route
                              path="meetings/pending"
                              element={<MeetingsPage />}
                            />
                            <Route
                              path="meetings/approved"
                              element={<MeetingsPage />}
                            />
                            <Route
                              path="meetings/completed"
                              element={<MeetingsPage />}
                            />
                            <Route
                              path="inventory"
                              element={<InventoryPage />}
                            />
                            <Route
                              path="inventory/add"
                              element={<InventoryFormPage />}
                            />
                            <Route
                              path="inventory/:id"
                              element={<InventoryDetailPage />}
                            />
                            <Route
                              path="inventory/:id/edit"
                              element={<InventoryFormPage />}
                            />
                            <Route
                              path="inventory/by-type"
                              element={<InventoryPage />}
                            />
                            <Route
                              path="inventory/by-location"
                              element={<InventoryPage />}
                            />
                            <Route
                              path="documents"
                              element={<DocumentsPage />}
                            />
                            <Route
                              path="documents/upload"
                              element={<DocumentsPage />}
                            />
                            <Route
                              path="documents/by-type"
                              element={<DocumentsPage />}
                            />
                            <Route path="reports" element={<ReportsPage />} />
                            <Route
                              path="reports/complaints"
                              element={<ReportsPage />}
                            />
                            <Route
                              path="reports/status"
                              element={<ReportsPage />}
                            />
                            <Route
                              path="reports/inventory"
                              element={<ReportsPage />}
                            />
                            <Route
                              path="reports/financial"
                              element={<ReportsPage />}
                            />
                            <Route
                              path="users"
                              element={
                                <ProtectedRoute requireAdmin={true}>
                                  <UserManagementPage />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="complaints/my-complaints"
                              element={<ComplaintsPage />}
                            />
                            <Route path="settings" element={<SettingsPage />} />
                          </Routes>
                        </AdminLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Public Routes */}
                  <Route
                    path="/*"
                    element={
                      <AppLayout>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route
                            path="/file-complaint"
                            element={<FileComplaint />}
                          />
                          <Route path="/track" element={<Track />} />
                          <Route
                            path="/request-meeting"
                            element={<RequestMeeting />}
                          />
                          <Route path="/feedback" element={<Feedback />} />
                          <Route path="/complaints" element={<Complaints />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
                    }
                  />
                </Routes>
              </Router>
              <Toaster />
            </BadaunDistrictProvider>
          </ModalProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
