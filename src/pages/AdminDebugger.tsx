import React from 'react';
import { useWeb3 } from '../context/Web3Context';

// Admin addresses for verification
const ADMIN_ADDRESSES = [
  '0x9e4cB95abcAe280a1b09E97cFeE4bFB0Fa39B56e',
  '0xA752CC430588A27f972fc49786C1D873edD8D161'
  // Add any other admin addresses here
];

const AdminDebugger: React.FC = () => {
  const { account, userRole, contract, isConnecting, error, isAdmin } = useWeb3();
  
  const isAdminAddress = account ? 
    ADMIN_ADDRESSES.some(addr => addr.toLowerCase() === account.toLowerCase()) 
    : false;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto my-6">
      <h2 className="text-xl font-semibold mb-4">Admin Access Debugger</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Connection Status</h3>
          <p><strong>Connected Account:</strong> {account || 'Not connected'}</p>
          <p><strong>Is Connecting:</strong> {isConnecting ? 'Yes' : 'No'}</p>
          <p><strong>Contract Initialized:</strong> {contract ? 'Yes' : 'No'}</p>
          {error && (
            <p className="text-red-600"><strong>Error:</strong> {error}</p>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Role Information</h3>
          <p><strong>User Role from Context:</strong> {userRole}</p>
          <p><strong>Is Admin from Context:</strong> {isAdmin ? 'Yes' : 'No'}</p>
          <p><strong>Is Admin by Address Check:</strong> {isAdminAddress ? 'Yes' : 'No'}</p>
          <p><strong>Should Have Admin Access:</strong> {(userRole === 'admin' || isAdmin || isAdminAddress) ? 'Yes' : 'No'}</p>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-medium mb-2">Admin Address Check</h3>
        <p>Your current address: <strong>{account || 'Not connected'}</strong></p>
        <p className="mt-2">Expected admin addresses:</p>
        <ul className="list-disc pl-5 mt-1">
          {ADMIN_ADDRESSES.map((addr, index) => (
            <li key={index} className={account && addr.toLowerCase() === account.toLowerCase() ? 'text-green-600 font-medium' : ''}>
              {addr}
              {account && addr.toLowerCase() === account.toLowerCase() && ' (Your Address)'}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded">
        <p><strong>Troubleshooting Steps:</strong></p>
        <ol className="list-decimal pl-5 mt-2">
          <li>Ensure your wallet is connected with the correct account</li>
          <li>Verify the admin address is correctly set in the code</li>
          <li>Check that your ProtectedRoute component is configured correctly</li>
          <li>Verify that contract address is correct in Web3Context.tsx</li>
          <li>Make sure the contract's isAdmin() function is working correctly</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminDebugger;