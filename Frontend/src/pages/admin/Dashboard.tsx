/**
 * Admin Dashboard Page
 * Shows Uttar Pradesh Heat Map by default
 * Clicking Badaun navigates to detailed Badaun map
 */

import React from "react";
import ComplaintsHeatMapPage from "./ComplaintsHeatMapPage";

const Dashboard: React.FC = () => {
  // Dashboard now shows the full UP heat map with all districts
  return <ComplaintsHeatMapPage />;
};

export default Dashboard;
