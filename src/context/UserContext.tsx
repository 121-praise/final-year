import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWeb3 } from './Web3Context';

// Define types for our user data based on different roles
interface BaseUserData {
  isRegistered: boolean;
  isApproved: boolean;
}

interface PatientData extends BaseUserData {
  name: string;
  age: number;
  address: string;
  contactInfo: string;
  medicalHistory: string;
  // Add other patient-specific fields
}

interface StaffData extends BaseUserData {
  name: string;
  role: string;
  department: string;
  specialization: string;
  contactInfo: string;
  // Add other staff-specific fields
}

type UserData = PatientData | StaffData | null;

interface UserContextType {
  userData: UserData;
  loading: boolean;
  error: string | null;
  fetchUserData: () => Promise<void>;
  clearUserData: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { account, contract, userRole } = useWeb3();
  const [userData, setUserData] = useState<UserData>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data based on their role
  const fetchUserData = async () => {
    if (!account || !contract || !userRole) {
      setError("Cannot fetch user data: Missing account, contract, or role");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching data for ${userRole} with address ${account}`);
      
      let data = null;
      
      switch (userRole.toLowerCase()) {
        case 'patient':
          data = await contract.getPatient(account);
          console.log("Patient data:", data);
          break;
        case 'doctor':
        case 'nurse':
        case 'pharmacist':
          data = await contract.getStaff(account);
          console.log("Staff data:", data);
          break;
        case 'admin':
          // For admin, we might have a different method or just set basic info
          data = { isAdmin: true, isRegistered: true, isApproved: true };
          break;
        default:
          setError(`Unknown role: ${userRole}`);
          break;
      }
      
      setUserData(data);
    } catch (err: any) {
      console.error("Error fetching user data:", err);
      setError(`Failed to fetch user data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear user data (useful for logout)
  const clearUserData = () => {
    setUserData(null);
  };

  // Automatically fetch user data when account or role changes
  useEffect(() => {
    if (account && userRole && userRole !== 'none' && userRole !== 'pending') {
      fetchUserData();
    } else {
      clearUserData();
    }
  }, [account, userRole]);

  const value = {
    userData,
    loading,
    error,
    fetchUserData,
    clearUserData
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};