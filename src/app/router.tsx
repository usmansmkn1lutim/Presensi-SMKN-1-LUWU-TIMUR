import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PublicOnlyRoute } from '../components/auth/PublicOnlyRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { HistoryPage } from '../pages/history/HistoryPage';
import { RequestsPage } from '../pages/requests/RequestsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

// Admin / Management Pages
import { EmployeesPage } from '../pages/admin/EmployeesPage';
import { SchedulesPage } from '../pages/admin/SchedulesPage';
import { LocationsPage } from '../pages/admin/LocationsPage';
import { HolidaysPage } from '../pages/admin/HolidaysPage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { SettingsPage } from '../pages/admin/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Root redirect handler: / -> /dashboard (if logged in) or /login (if not)
const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

export const router = createBrowserRouter([
  // Root Redirect
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Public / Auth Route
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },

  // Protected App Routes
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/attendance',
        element: <AttendancePage />,
      },
      {
        path: '/history',
        element: <HistoryPage />,
      },
      {
        path: '/requests',
        element: <RequestsPage />,
      },
      {
        path: '/notifications',
        element: <NotificationsPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },

      // Administrator & Management Routes with Role Protection
      {
        path: '/employees',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'headmaster']}>
            <EmployeesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/schedules',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'headmaster']}>
            <SchedulesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/locations',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <LocationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/holidays',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <HolidaysPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/reports',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin', 'headmaster', 'verifier']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/audit-logs',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },

      // 404 Catch All inside layout
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
