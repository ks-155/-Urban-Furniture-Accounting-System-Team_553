import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, sessionRestored } = useAccounting();
  const location = useLocation();

  if (!sessionRestored) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Restoring session…</p>
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // Role gate: USER (portal) is bounced back to / from any internal route
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Shorthand for internal books: ADMIN + ACCOUNTANT only
export const StaffRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={['ADMIN', 'ACCOUNTANT']}>{children}</ProtectedRoute>
);
