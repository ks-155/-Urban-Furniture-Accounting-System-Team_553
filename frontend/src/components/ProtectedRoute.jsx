import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';

export const ProtectedRoute = ({ children }) => {
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
  return children;
};
