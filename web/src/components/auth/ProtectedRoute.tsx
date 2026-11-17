import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getDashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${redirectTarget}`} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
