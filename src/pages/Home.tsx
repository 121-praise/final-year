import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/Button';
import Navbar from '../components/Navbar';
import { Shield, UserCheck, FileText, Clock } from 'lucide-react';

const Home: React.FC = () => {
  const { account, contract, isAdmin, connectWallet, error: web3Error, isConnecting } = useWeb3();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Function to fetch user role and details
  const fetchUserRoleAndDetails = async () => {
    if (!account || !contract) {
      console.log('Home.tsx: Skipping role fetch - account or contract not available', { account, contract });
      setUserRole('none');
      return null;
    }

    setIsLoadingUserData(true);
    setError(null);

    try {
      console.log('Home.tsx: Fetching role for account:', account);

      // Check if user is admin first
      if (isAdmin) {
        console.log('Home.tsx: User is admin');
        setUserRole('Admin');
        return { isAdmin: true };
      }

      // Run these checks in parallel for better performance
      const [student, staff] = await Promise.all([
        contract.getStudent(account).catch(err => {
          console.warn('Error fetching student:', err);
          return { exists: false };
        }),
        contract.getStaff(account).catch(err => {
          console.warn('Error fetching staff:', err);
          return { exists: false };
        })
      ]);

      console.log('Home.tsx: Student:', student);
      console.log('Home.tsx: Staff:', staff);

      // Check results in order of priority
      if (student.exists) {
        setUserRole('Patient');
        return student;
      }

      if (staff.exists) {
        setUserRole(staff.role);
        return staff;
      }

      // No role found
      setUserRole('none');
      console.log('Home.tsx: No role found for account');
      return null;
    } catch (err: any) {
      console.error('Home.tsx: Error fetching user role and details:', err);
      let errorMessage = 'Failed to fetch user role. Please try again.';
      if (err.code === -32603 || err.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to blockchain. Check your network or MetaMask settings.';
      } else if (err.reason === 'Student not registered' || err.reason === 'Staff not registered') {
        errorMessage = 'Account not registered. Please register first.';
      }
      setError(errorMessage);
      setUserRole('none');
      return null;
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      console.log('Home.tsx: Connecting wallet...');
      await connectWallet();
      // Reset redirect flag when connecting a new wallet
      setRedirectAttempted(false);
    } catch (err) {
      console.error('Home.tsx: Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  // Effect to handle fetching user role after wallet connection
  useEffect(() => {
    if (account && contract && !isConnecting && !isLoadingUserData && userRole === null) {
      fetchUserRoleAndDetails();
    }
  }, [account, contract, isConnecting, isLoadingUserData]);

  // Separate effect to handle redirection based on role
  useEffect(() => {
    const attemptRedirect = async () => {
      // Only try to redirect once we have a determined role and haven't tried redirecting yet
      if (
        userRole && 
        userRole !== null && 
        account && 
        contract && 
        !isLoadingUserData && 
        !redirectAttempted && 
        !isConnecting
      ) {
        setRedirectAttempted(true);
        
        if (userRole !== 'none') {
          try {
            console.log('Home.tsx: Redirecting user with role:', userRole);
            
            // Get user details for session storage
            let userDetails = null;
            if (userRole === 'Admin') {
              userDetails = { isAdmin: true };
            } else if (userRole === 'Patient') {
              userDetails = await contract.getStudent(account);
            } else {
              userDetails = await contract.getStaff(account);
            }
            
            // Store user details in sessionStorage for dashboard use
            if (userDetails) {
              sessionStorage.setItem('userDetails', JSON.stringify(userDetails));
              
              // Redirect to appropriate dashboard with user address as parameter
              const dashboardPath = getRoleDashboardLink() + `?address=${account}`;
              console.log('Home.tsx: Redirecting to:', dashboardPath);
              navigate(dashboardPath, { replace: true });
            }
          } catch (err) {
            console.error('Home.tsx: Error during redirect:', err);
            setError('Failed during redirect. Please try again.');
          }
        }
      }
    };

    attemptRedirect();
  }, [userRole, account, contract, isLoadingUserData, redirectAttempted, isConnecting, navigate]);

  // Handle Web3Context errors
  useEffect(() => {
    if (web3Error) {
      setError(web3Error);
    }
  }, [web3Error]);

  const getRoleDashboardLink = () => {
    if (!userRole || userRole === 'none') return '/register';
    switch (userRole.toLowerCase()) {
      case 'patient':
        return '/patient';
      case 'doctor':
        return '/doctor';
      case 'nurse':
        return '/nurse';
      case 'pharmacist':
        return '/pharmacy';
      case 'admin':
        return '/admin';
      default:
        return '/register';
    }
  };

  return (
    <div className="fade-in">
      <Navbar />
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0077cc] to-[#0066b3] text-white py-16 md:py-24 rounded-xl shadow-lg">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Secure Healthcare Management on the Blockchain
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Connect your wallet to access secure medical records, prescriptions, and healthcare services.
          </p>
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-md mb-4 max-w-md mx-auto">
              {error}
            </div>
          )}
          {!account ? (
            <Button
              onClick={handleConnect}
              size="lg"
              className="bg-white text-[#0077cc] hover:bg-gray-100"
            >
              Connect Wallet
            </Button>
          ) : userRole && userRole !== 'none' ? (
            <Link to={`${getRoleDashboardLink()}?address=${account}`}>
              <Button size="lg" className="bg-white text-[#0077cc] hover:bg-gray-100">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="lg" className="bg-white text-[#0077cc] hover:bg-gray-100">
                Register Now
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
              <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <Shield className="text-[#0077cc] w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Access</h3>
              <p className="text-gray-600">
                Patient records are securely protected with temporary access codes that expire after 30 minutes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
              <div className="bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <UserCheck className="text-[#00b8a9] w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-gray-600">
                Different dashboards and permissions for Doctors, Patients, Nurses, and Pharmacy staff.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
              <div className="bg-purple-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <FileText className="text-purple-600 w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Digital Prescriptions</h3>
              <p className="text-gray-600">
                Securely send prescriptions to nurses or pharmacy with full tracking and verification.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
              <div className="bg-orange-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <Clock className="text-[#ff6b6b] w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                All medical records and prescriptions are instantly updated on the blockchain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-16 rounded-xl">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Connect your wallet and join our secure healthcare blockchain platform today.
          </p>
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-md mb-4 max-w-md mx-auto">
              {error}
            </div>
          )}
          { !account ? (
            <Button onClick={handleConnect} size="lg">
              Connect Wallet
            </Button>
          ) : userRole && userRole !== 'none' ? (
            <Link to={`${getRoleDashboardLink()}?address=${account}`}>
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="lg">Register Now</Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;