import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: string;
  requireAdmin?: boolean;
  userRole: string | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  role,
  requireAdmin = false,
  userRole,
}) => {
  const { account, isConnecting, error, isAdmin } = useWeb3();

  console.log('ProtectedRoute Debug:', {
    account,
    userRole,
    isConnecting,
    role,
    requireAdmin,
    isAdmin,
    hasCorrectRole: role === 'any' || userRole === role || (requireAdmin && (userRole === 'Admin' || isAdmin)),
  });

  if (isConnecting) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!account || userRole === 'none') {
    console.log('ProtectedRoute: No account or unregistered, redirecting to /register');
    return <Navigate to="/register" replace />;
  }

  if (error) {
    console.log('ProtectedRoute: Web3 error detected:', error);
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (requireAdmin && (userRole === 'Admin' || isAdmin)) {
    console.log('ProtectedRoute: Admin access granted');
    return <>{children}</>;
  }

  if (!requireAdmin && (role === 'any' || userRole === role)) {
    console.log('ProtectedRoute: Role access granted for role:', role);
    return <>{children}</>;
  }

  console.log('ProtectedRoute: Access denied, redirecting to /register');
  return <Navigate to="/register" replace />;
};

export default ProtectedRoute;