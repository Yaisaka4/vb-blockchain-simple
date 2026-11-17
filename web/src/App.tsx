import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { TooltipProvider } from '@/components/ui/tooltip';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { MinistryPage } from '@/pages/MinistryPage';
import { UniversityPage } from '@/pages/UniversityPage';
import { StudentPage } from '@/pages/StudentPage';
import { VerifyPage } from '@/pages/VerifyPage';
import { ExplorerPage } from '@/pages/ExplorerPage';

// Giữ tương thích ngược nếu ai mở đường dẫn cũ /tuyen-dung.html?cert=...
const LegacyVerifyRedirect: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={`/verify${q ? `?${q}` : ''}`} replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/tuyen-dung.html" element={<LegacyVerifyRedirect />} />
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/explorer.html" element={<Navigate to="/explorer" replace />} />

              <Route
                path="/ministry"
                element={
                  <ProtectedRoute allowedRoles={['ministry']}>
                    <MinistryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/university"
                element={
                  <ProtectedRoute allowedRoles={['university']}>
                    <UniversityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
};

export default App;
