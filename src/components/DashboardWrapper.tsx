import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useUser } from '../context/Usercontext';

interface DashboardWrapperProps {
  children: React.ReactNode;
  requiredRole: string;
}

const DashboardWrapper: React.FC<DashboardWrapperProps> = ({ children, requiredRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { account, userRole, getUserRole } = useWeb3();
  const { userData, loading, error, fetchUserData } = useUser();
  const [isInitializing, setIsInitializing] = useState(true);

  // Extract address from URL query parameter
  const getAddressFromQuery = () => {
    const params = new URLSearchParams(location.search);
    return params.get('address');
  };

  // Verify user has proper access and data
  useEffect(() => {
    const verifyAccess = async () => {
      setIsInitializing(true);
      
      // Make sure account is connected
      if (!account) {
        console.log("No wallet connected, redirecting to home");
        navigate('/', { replace: true });
        return;
      }
      
      // Refresh user role
      await getUserRole();
      
      // Make sure user has the correct role for this dashboard
      if (userRole !== requiredRole && 
          !(requiredRole === 'any' || (requiredRole === 'admin' && userRole === 'admin'))) {
        console.log(`User role ${userRole} doesn't match required role ${requiredRole}, redirecting`);
        navigate('/', { replace: true });
        return;
      }
      
      // Check if the address in URL matches connected wallet
      const urlAddress = getAddressFromQuery();
      if (urlAddress && urlAddress.toLowerCase() !== account.toLowerCase()) {
        console.log("Address mismatch, redirecting");
        navigate(`${location.pathname}?address=${account}`, { replace: true });
        return;
      }
      
      // Fetch user data if needed
      if (!userData) {
        console.log("Fetching user data");
        await fetchUserData();
      }
      
      setIsInitializing(false);
    };
    
    verifyAccess();
  }, [account, userRole, requiredRole, location]);

  // Loading state
  if (isInitializing || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 text-red-800 p-6 rounded-md max-w-md">
          <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // No user data state (probably not registered or approved)
  if (!userData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-md max-w-md">
          <h3 className="text-lg font-medium mb-2">Account Not Found</h3>
          <p>
            {userRole === 'pending' 
              ? "Your account is still pending approval. Please check back later."
              : "Your account doesn't appear to be registered. Please register first."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render dashboard with user data
  return <>{children}</>;
};

export default DashboardWrapper;