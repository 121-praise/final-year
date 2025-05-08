import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { UserPlus, Users } from 'lucide-react';
import { ethers } from 'ethers';

// Assuming you have these components
const Button = ({ children, type = "button", isLoading = false, className = "", ...props }) => (
  <button
    type={type}
    className={`bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md 
    transition-colors flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    disabled={isLoading}
    {...props}
  >
    {isLoading ? (
      <>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </>
    ) : children}
  </button>
);

const Card = ({ children }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    {children}
  </div>
);

const AdminDashboard: React.FC = () => {
  const { contract, account, provider } = useWeb3();

  const [loading, setLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [studentSuccess, setStudentSuccess] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  
  // Student registration form
  const [studentName, setStudentName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [hostelRoom, setHostelRoom] = useState('');
  
  // Staff registration form
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'Doctor' | 'Nurse' | 'Pharmacist'>('Doctor');
  const [staffWallet, setStaffWallet] = useState('');

  // Gas settings
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('3000000'); // Default gas limit
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);

  const resetStudentForm = () => {
    setStudentName('');
    setMatricNumber('');
    setHostelRoom('');
    setStudentSuccess(null);
    setStudentError(null);
  };

  const resetStaffForm = () => {
    setStaffName('');
    setStaffRole('Doctor');
    setStaffWallet('');
    setStaffSuccess(null);
    setStaffError(null);
  };

  const validateStudentForm = () => {
    if (!studentName.trim()) return 'Student name is required';
    if (!matricNumber.trim()) return 'Matric number is required';
    if (matricNumber.length !== 6 || isNaN(Number(matricNumber))) return 'Matric number must be 6 digits';
    if (!hostelRoom.trim()) return 'Hostel room is required';
    return null;
  };

  const validateStaffForm = () => {
    if (!staffName.trim()) return 'Staff name is required';
    if (!staffWallet.trim()) return 'Staff wallet address is required';
    if (!/^0x[a-fA-F0-9]{40}$/.test(staffWallet)) return 'Invalid wallet address';

    return null;
  };

  const getTransactionOptions = () => {
    const options: any = {};
    
    if (gasLimit && Number(gasLimit) > 0) {
      options.gasLimit = ethers.utils.hexlify(Number(gasLimit));
    }
    
    if (gasPrice && Number(gasPrice) > 0) {
      options.gasPrice = ethers.utils.parseUnits(gasPrice, 'gwei');
    }
    
    return options;
  };

  const handleStudentRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStudentForm();
    if (validationError) {
      setStudentError(validationError);
      return;
    }

    setLoading(true);
    setStudentError(null);
    setStudentSuccess(null);
    setTransactionData(null);

    try {
      if (!contract) throw new Error("Contract not initialized");
      if (!account) throw new Error("Please connect your wallet");
      
      const regDate = Math.floor(Date.now() / 1000);
      const matricNum = parseInt(matricNumber, 10);
      
      // Create transaction parameters
      let txOptions = {};
      
      // Only add gas options if debug mode is enabled
      if (debugMode) {
        txOptions = getTransactionOptions();
      }

      if (debugMode) {
        console.log("Transaction parameters:", {
          studentName,
          matricNum,
          regDate,
          hostelRoom,
          txOptions
        });
      }
      
      // Important: Don't pass the txOptions as a separate parameter
      // Pass it as part of the transaction object
      const tx = await contract.registerStudent(
        studentName,
        matricNum,
        regDate,
        hostelRoom,
        txOptions
      );
      
      if (debugMode) {
        console.log('Transaction hash:', tx.hash);
        setTransactionData({
          hash: tx.hash,
          from: account,
          gasLimit: tx.gasLimit?.toString(),
          gasPrice: tx.gasPrice?.toString(),
          nonce: tx.nonce,
          data: tx.data
        });
      }
      
      const receipt = await tx.wait();
      
      if (debugMode) {
        console.log('Transaction receipt:', receipt);
      }
      
      setStudentSuccess('Student registered successfully!');
      resetStudentForm();
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Attempt to extract more detailed error information
      let errorMessage = err.message || 'Failed to register student';
      
      // Check for error data in the error object
      if (err.data) {
        errorMessage += ` - ${err.data}`;
      }
      
      // Check for nested error objects
      if (err.error) {
        if (typeof err.error === 'string') {
          errorMessage += ` - ${err.error}`;
        } else if (err.error.message) {
          errorMessage += ` - ${err.error.message}`;
        }
      }
      
      setStudentError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStaffForm();
    if (validationError) {
      setStaffError(validationError);
      return;
    }

    setLoading(true);
    setStaffError(null);
    setStaffSuccess(null);
    setTransactionData(null);

    try {
      if (!contract) throw new Error("Contract not initialized");
      if (!provider) throw new Error("Provider not initialized");
      
      // Create transaction parameters
      let txOptions = {};
      
      // Only add gas options if debug mode is enabled
      if (debugMode) {
        txOptions = getTransactionOptions();
      }
      
      if (debugMode) {
        console.log("Transaction parameters:", {
          staffName,
          staffRole,
          staffWallet,
          txOptions
        });
      }
      
      // Important: Don't pass the txOptions as a separate parameter
      // Pass it as part of the transaction object
      const tx = await contract.registerStaff(
        staffName, 
        staffRole,
        txOptions
      );
      
      if (debugMode) {
        console.log('Transaction hash:', tx.hash);
        setTransactionData({
          hash: tx.hash,
          from: account,
          gasLimit: tx.gasLimit?.toString(),
          gasPrice: tx.gasPrice?.toString(),
          nonce: tx.nonce,
          data: tx.data
        });
      }
      
      const receipt = await tx.wait();
      
      if (debugMode) {
        console.log('Transaction receipt:', receipt);
      }
      
      setStaffSuccess(`${staffRole} registered successfully!`);
      resetStaffForm();
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Attempt to extract more detailed error information
      let errorMessage = err.message || 'Failed to register staff';
      
      // Check for error data in the error object
      if (err.data) {
        errorMessage += ` - ${err.data}`;
      }
      
      // Check for nested error objects
      if (err.error) {
        if (typeof err.error === 'string') {
          errorMessage += ` - ${err.error}`;
        } else if (err.error.message) {
          errorMessage += ` - ${err.error.message}`;
        }
      }
      
      setStaffError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
          Contract not initialized. Please connect your wallet first.
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Connected wallet info */}
      <Card>
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-semibold">Connected Wallet</h2>
        </div>
        <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-4">
          <p className="font-mono">{account || 'Not connected'}</p>
          <p className="text-sm mt-1">All actions will be performed using this wallet address</p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="debugMode"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="debugMode">Enable Debug Mode</label>
        </div>
      </Card>
      
      {/* Transaction debug info */}
      {debugMode && transactionData && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Transaction Debug Info</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm">
            {JSON.stringify(transactionData, null, 2)}
          </pre>
        </Card>
      )}
      
      {/* Gas Settings Card */}
      <Card>
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-semibold">Gas Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Gas Price (Gwei)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              placeholder="Leave empty for automatic"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Gas Limit
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={gasLimit}
              onChange={(e) => setGasLimit(e.target.value)}
              placeholder="3000000"
            />
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Student Registration */}
        <Card>
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold">Register Student</h2>
          </div>
          
          {studentError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
              {studentError}
            </div>
          )}
          
          {studentSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
              {studentSuccess}
            </div>
          )}
          
          <form onSubmit={handleStudentRegistration}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Matric Number (6 digits)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value.slice(0, 6))}
                maxLength={6}
                placeholder="e.g., 123456"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Hostel Room Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={hostelRoom}
                onChange={(e) => setHostelRoom(e.target.value)}
                placeholder="Enter hostel room"
                required
              />
            </div>
            
            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Register Student
            </Button>
          </form>
        </Card>

        {/* Staff Registration */}
        <Card>
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold">Register Staff</h2>
          </div>
          
          {staffError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
              {staffError}
            </div>
          )}
          // 0x7132dA13b7Df1484dc2a68784f03Bb8DD25f96bB
          {staffSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
              {staffSuccess}
            </div>
          )}
          
          <form onSubmit={handleStaffRegistration}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Role
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as 'Doctor' | 'Nurse' | 'Pharmacist')}
              >
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Pharmacist">Pharmacist</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={staffWallet}
                onChange={(e) => setStaffWallet(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            
            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Register {staffRole}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;