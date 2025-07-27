import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardPage from '@/pages/DashboardPage';
import UserDashboardPage from '@/pages/UserDashboardPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import LoginPage from '@/pages/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import OAuthCallback from '@/components/OAuthCallback';

const AppRoutes: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} 
      />
      
      {/* OAuth callback route */}
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      
      {/* User Analytics Dashboard */}
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <UserDashboardPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Dashboard */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect */}
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
      
      {/* Catch all - redirect to dashboard or login */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
      />
    </Routes>
  );
};

export default AppRoutes;