/**
 * Admin Page
 * Main admin entry point - redirects to dashboard
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

const Admin: React.FC = () => {
  return <Navigate to="/admin/dashboard" replace />;
};

export default Admin;

