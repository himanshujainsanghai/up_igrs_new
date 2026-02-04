/**
 * Admin Dashboard Page
 * Shows Uttar Pradesh Heat Map by default
 * Clicking Badaun navigates to detailed Badaun map
 */

import React from "react";
import ComplaintsHeatMapPage from "./ComplaintsHeatMapPage";

const Dashboard: React.FC = () => {
  // Dashboard shows the full UP heat map inside AdminLayout; embedded keeps navbar/sidebar visible
  return <ComplaintsHeatMapPage embedded />;
};

export default Dashboard;
