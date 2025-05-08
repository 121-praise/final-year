import React from 'react';
import { useWeb3 } from '../context/Web3Context';

// Admin addresses for verification
const ADMIN_ADDRESSES = [
  '0x9e4cB95abcAe280a1b09E97cFeE4bFB0Fa39B56e'
];

const AuthDebugger: React.FC = () => {
  const { account, userRole, contract, isConnecting, error } = useWeb3();
  
  const isAdminAddress = account ? 
    ADMIN_ADDRESSES.some(addr => addr.toLowerCase() === account.toLowerCase()) 
    : false;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto my-6">
      <h2 className="text-xl font-semibold mb-4">Authentication Debugger</h2>
      
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
          <p><strong>User Role:</strong> {userRole}</p>
          <p><strong>Is Admin Address:</strong> {isAdminAddress ? 'Yes' : 'No'}</p>
          <p><strong>Should Have Admin Access:</strong> {(userRole === 'admin' || isAdminAddress) ? 'Yes' : 'No'}</p>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-medium mb-2">Admin Address Check</h3>
        <ul className="list-disc pl-5">
          {ADMIN_ADDRESSES.map((addr, index) => (
            <li key={index} className={account && addr.toLowerCase() === account.toLowerCase() ? 'text-green-600 font-medium' : ''}>
              {addr}
              {account && addr.toLowerCase() === account.toLowerCase() && ' (Your Address)'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AuthDebugger;