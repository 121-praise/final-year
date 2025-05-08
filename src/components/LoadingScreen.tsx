import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="loader mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Loading HealthChain</h2>
        <p className="text-gray-500 mt-2">Connecting to the blockchain...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;