import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Participant Pages
import { LandingPage } from './pages/LandingPage';
import { ChallengesPage } from './pages/challenges/ChallengesPage';
import { ScoreboardPage } from './pages/scoreboard/ScoreboardPage';
import { TeamsPage } from './pages/teams/TeamsPage';
import { TeamDetailPage } from './pages/teams/TeamDetailPage';
import { RulesPage } from './pages/RulesPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminChallengesPage } from './pages/admin/AdminChallengesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminHintsPage } from './pages/admin/AdminHintsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public & Participant Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/ctf" element={<Navigate to="/challenges" replace />} />
              <Route path="/dashboard" element={<Navigate to="/challenges" replace />} />
              <Route path="/team" element={<Navigate to="/teams" replace />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/scoreboard" element={<ScoreboardPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:slug" element={<TeamDetailPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Admin Restricted Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="challenges" element={<AdminChallengesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="submissions" element={<AdminSubmissionsPage />} />
              <Route path="hints" element={<AdminHintsPage />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="categories" element={<Navigate to="/admin/challenges" replace />} />
              <Route path="scoreboard" element={<Navigate to="/scoreboard" replace />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
