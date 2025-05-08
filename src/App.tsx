import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App: React.FC = () => {
  const { account, contract, isAdmin, isConnecting } = useWeb3();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!account || !contract) {
        setUserRole(null);
        return;
      }
      setLoading(true);
      try {
        console.log('App.tsx: Checking role for account:', account);
        const student = await contract.getStudent(account);
        console.log('App.tsx: Student:', student);
        if (student.exists) {
          setUserRole('Patient');
          return;
        }

        const staff = await contract.getStaff(account);
        console.log('App.tsx: Staff:', staff);
        if (staff.exists) {
          setUserRole(staff.role);
          return;
        }

        if (isAdmin) {
          setUserRole('Admin');
          return;
        }

        setUserRole('none');
      } catch (err: any) {
        console.error('App.tsx: Error checking user role:', err);
        setUserRole('none');
      } finally {
        setLoading(false);
      }
    };

    if (!isConnecting) {
      checkUserRole();
    }
  }, [account, contract, isAdmin, isConnecting]);

  if (isConnecting || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/patient"
        element={
          <ProtectedRoute userRole={userRole} role="Patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute userRole={userRole} role="Doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse"
        element={
          <ProtectedRoute userRole={userRole} role="Nurse">
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute userRole={userRole} role="Pharmacist">
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute userRole={userRole} role="Admin" requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;