import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/Button';
import Card from '../components/Card';

type RegistrationType = 'Patient' | 'Doctor' | 'Nurse' | 'Pharmacist';

const Register: React.FC = () => {
  const { contract, account, signer, provider, connectWallet, error: web3Error } = useWeb3();
  const navigate = useNavigate();
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userChecked, setUserChecked] = useState(false);

  // Patient registration form
  const [patientName, setPatientName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [regDate, setRegDate] = useState('');
  const [hostelRoom, setHostelRoom] = useState('');

  // Staff registration form
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'Doctor' | 'Nurse' | 'Pharmacist'>('Doctor');

  // Check if user is already registered when component mounts
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (!account || !contract) return;
      
      try {
        // Check if user is admin
        const isAdmin = await contract.isAdmin(account);
        if (isAdmin) {
          navigate('/admin', { replace: true });
          return;
        }
        
        // Check user roles in parallel
        const [student, staff] = await Promise.all([
          contract.getStudent(account).catch(() => ({ exists: false })),
          contract.getStaff(account).catch(() => ({ exists: false }))
        ]);
        
        if (student.exists) {
          navigate('/patient', { replace: true });
          return;
        }
        
        if (staff.exists) {
          const rolePaths: { [key: string]: string } = {
            Doctor: '/doctor',
            Nurse: '/nurse',
            Pharmacist: '/pharmacy',
          };
          navigate(rolePaths[staff.role], { replace: true });
          return;
        }
        
        // User is not registered in any role
        setUserChecked(true);
      } catch (err) {
        console.error('Error checking user registration:', err);
        setUserChecked(true);
      }
    };
    
    if (account && contract && !userChecked) {
      checkUserRegistration();
    } else if (!account) {
      setUserChecked(true); // No account means we don't need to check
    }
  }, [account, contract, navigate, userChecked]);

  // Effect to check for Web3Context errors
  useEffect(() => {
    if (web3Error) {
      setError(web3Error);
    }
  }, [web3Error]);

  const resetForm = () => {
    setPatientName('');
    setMatricNumber('');
    setRegDate('');
    setHostelRoom('');
    setStaffName('');
    setError(null);
    setSuccess(null);
  };

  const validatePatientForm = () => {
    if (!patientName.trim()) return 'Name is required';
    if (!matricNumber.trim()) return 'Matric number is required';
    if (matricNumber.length !== 6 || isNaN(Number(matricNumber))) return 'Matric number must be exactly 6 digits';
    if (!regDate.trim()) return 'Registration date is required';
    if (isNaN(Number(regDate))) return 'Registration date must be a valid Unix timestamp';
    if (!hostelRoom.trim()) return 'Hostel room is required';
    return null;
  };

  const validateStaffForm = () => {
    if (!staffName.trim()) return 'Name is required';
    return null;
  };

  const handlePatientRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePatientForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!contract || !signer || !account || !provider) {
      setError('Blockchain connection not available. Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matricNum = parseInt(matricNumber, 10);
      const regDateNum = parseInt(regDate, 10);

      console.log('Registering patient with:', {
        name: patientName,
        matricNum,
        regDate: regDateNum,
        hostelRoom,
        account,
      });

      const contractWithSigner = contract.connect(signer);
      // Estimate gas
      let txOptions: { gasLimit?: any; nonce: number } = {
        nonce: await provider.getTransactionCount(account, 'pending'),
      };

      try {
        const gasEstimate = await contractWithSigner.estimateGas.registerStudent(
          patientName,
          matricNum,
          regDateNum,
          hostelRoom
        );
        txOptions.gasLimit = gasEstimate.mul(12).div(10); // Add 20% buffer
      } catch (gasErr: any) {
        console.error('Gas estimation failed:', gasErr);
        if (gasErr.message.includes('revert')) {
          throw new Error(`Contract validation failed: ${gasErr.reason || 'Invalid input or matric number already registered'}`);
        }
        // Fallback to manual gas limit
        txOptions.gasLimit = 500000;
      }

      const tx = await contractWithSigner.registerStudent(
        patientName,
        matricNum,
        regDateNum,
        hostelRoom,
        txOptions
      );

      console.log('Transaction sent:', tx.hash);

      // Set a timeout for the transaction
      const timeout = 120000; // 2 minutes
      const txReceipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timed out')), timeout)
        ),
      ]);

      console.log('Transaction confirmed:', txReceipt.transactionHash);

      // Store user details in sessionStorage for dashboard use
      const userDetails = {
        name: patientName,
        matricNumber: matricNum,
        regDate: regDateNum,
        hostelRoom,
        exists: true
      };
      sessionStorage.setItem('userDetails', JSON.stringify(userDetails));

      setSuccess('Patient registration successful!');
      resetForm();
      // Delay navigation to show success message
      setTimeout(() => navigate('/patient?address=' + account, { replace: true }), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'Failed to register. Please try again.';
      if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction. Please add test ETH to your wallet.';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('revert') || err.message.includes('Contract validation failed')) {
        errorMessage = err.reason || 'Transaction reverted: Matric number already registered or invalid inputs.';
      } else if (err.message.includes('nonce')) {
        errorMessage = 'Nonce error. Reset MetaMask nonce in Settings > Advanced > Clear activity and nonce data.';
      } else if (err.message.includes('timed out')) {
        errorMessage = 'Transaction timed out. Check network conditions or increase gas.';
      } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = err.reason || 'Failed to estimate gas. Check inputs or contract state.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStaffForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!contract || !signer || !account || !provider) {
      setError('Blockchain connection not available. Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Registering staff with:', {
        name: staffName,
        role: staffRole,
        account,
      });

      const contractWithSigner = contract.connect(signer);
      // Estimate gas
      let txOptions: { gasLimit?: any; nonce: number } = {
        nonce: await provider.getTransactionCount(account, 'pending'),
      };

      try {
        const gasEstimate = await contractWithSigner.estimateGas.registerStaff(staffName, staffRole);
        txOptions.gasLimit = gasEstimate.mul(12).div(10); // Add 20% buffer
      } catch (gasErr: any) {
        console.error('Gas estimation failed:', gasErr);
        if (gasErr.message.includes('revert')) {
          throw new Error(`Contract validation failed: ${gasErr.reason || 'Invalid input or staff already registered'}`);
        }
        // Fallback to manual gas limit
        txOptions.gasLimit = 500000;
      }

      const tx = await contractWithSigner.registerStaff(staffName, staffRole, txOptions);

      console.log('Transaction sent:', tx.hash);

      // Set a timeout for the transaction
      const timeout = 120000; // 2 minutes
      const txReceipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timed out')), timeout)
        ),
      ]);

      console.log('Transaction confirmed:', txReceipt.transactionHash);

      // Store user details in sessionStorage for dashboard use
      const userDetails = {
        name: staffName,
        role: staffRole,
        exists: true
      };
      sessionStorage.setItem('userDetails', JSON.stringify(userDetails));

      setSuccess(`${staffRole} registration successful!`);
      resetForm();

      const rolePaths: { [key: string]: string } = {
        Doctor: '/doctor',
        Nurse: '/nurse',
        Pharmacist: '/pharmacy',
      };
      // Delay navigation to show success message
      setTimeout(() => navigate(rolePaths[staffRole] + '?address=' + account, { replace: true }), 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'Failed to register. Please try again.';
      if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction. Please add test ETH to your wallet.';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('revert') || err.message.includes('Contract validation failed')) {
        errorMessage = err.reason || 'Transaction reverted: Check inputs or ensure only authorized accounts can register staff.';
      } else if (err.message.includes('nonce')) {
        errorMessage = 'Nonce error. Reset MetaMask nonce in Settings > Advanced > Clear activity and nonce data.';
      } else if (err.message.includes('timed out')) {
        errorMessage = 'Transaction timed out. Check network conditions or increase gas.';
      } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = err.reason || 'Failed to estimate gas. Check inputs or contract state.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Only show loading state until we've checked the user's registration status
  if (!userChecked && account) {
    return (
      <Card className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Checking Registration Status</h2>
          <p className="mb-4">Please wait while we check your account status...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="mb-4">Please connect your wallet to register.</p>
          <Button onClick={connectWallet} isLoading={loading}>
            Connect Wallet
          </Button>
          <div className="mt-4">
            <Link to="/" className="text-blue-500 hover:underline">
              Back to Home
            </Link>
          </div>
          {error && (
            <div className="mt-4 bg-red-50 text-red-500 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="fade-in max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Register on HealthChain</h1>
      <div className="text-center mb-4">
        <Link to="/" className="text-blue-500 hover:underline">
          Back to Home
        </Link>
      </div>

      {!registrationType ? (
        <Card>
          <h2 className="text-xl font-semibold mb-6 text-center">Select Registration Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setRegistrationType('Patient');
              }}
              className="py-3"
            >
              Register as Patient
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetForm();
                setRegistrationType('Doctor');
                setStaffRole('Doctor');
              }}
              className="py-3"
            >
              Register as Staff
            </Button>
          </div>
        </Card>
      ) : registrationType === 'Patient' ? (
        <Card>
          <h2 className="text-xl font-semibold mb-6">Patient Registration</h2>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">{success}</div>
          )}

          <form onSubmit={handlePatientRegistration}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="matricNumber"
              >
                Matric Number (6 digits)
              </label>
              <input
                id="matricNumber"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={matricNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setMatricNumber(value);
                }}
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="e.g., 123456"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="regDate">
                Registration Date (Unix Timestamp)
              </label>
              <input
                id="regDate"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                placeholder="e.g., 1697059200"
                required
              />
            </div>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="hostelRoom"
              >
                Hostel Room Number
              </label>
              <input
                id="hostelRoom"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={hostelRoom}
                onChange={(e) => setHostelRoom(e.target.value)}
                placeholder="e.g., A123"
                required
              />
            </div>
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setRegistrationType(null);
                }}
              >
                Back
              </Button>
              <Button type="submit" isLoading={loading}>
                Register as Patient
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-semibold mb-6">Staff Registration</h2>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">{success}</div>
          )}

          <form onSubmit={handleStaffRegistration}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="staffName">
                Full Name
              </label>
              <input
                id="staffName"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="staffRole">
                Role
              </label>
              <select
                id="staffRole"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as 'Doctor' | 'Nurse' | 'Pharmacist')}
                required
              >
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Pharmacist">Pharmacist</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setRegistrationType(null);
                }}
              >
                Back
              </Button>
              <Button type="submit" isLoading={loading}>
                Register as {staffRole}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default Register;