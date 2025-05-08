import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold">HealthChain</h2>
            <p className="text-gray-300 text-sm mt-1">Secure Healthcare on the Blockchain</p>
          </div>
          
          <div className="text-center md:text-right text-sm text-gray-300">
            <p>&copy; {new Date().getFullYear()} HealthChain. All rights reserved.</p>
            <p className="mt-1">Powered by Ethereum Blockchain</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;