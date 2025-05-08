import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';

const Navbar: React.FC = () => {
  const { account, connectWallet, userRole, isAdmin } = useWeb3();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  // Instead of trying to disconnect (which isn't supported by Web3Context),
  // we'll just redirect to home and rely on the user to disconnect via MetaMask
  const handleDisconnect = () => {
    // Navigate to home
    navigate('/');
    // Close mobile menu if open
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    // Note: We can't actually disconnect the wallet programmatically
    // The user will need to disconnect from MetaMask directly
    console.log('To fully disconnect, please use the MetaMask extension');
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getNavLinks = () => {
    const links = [
      { name: 'Home', path: '/', access: 'all' },
    ];

    // Add role-specific links
    if (userRole === 'admin' || isAdmin) {
      links.push({ name: 'Admin Dashboard', path: '/admin', access: 'admin' });
    }

    if (userRole === 'doctor') {
      links.push({ name: 'Doctor Dashboard', path: '/doctor', access: 'doctor' });
    }

    if (userRole === 'nurse') {
      links.push({ name: 'Nurse Dashboard', path: '/nurse', access: 'nurse' });
    }

    if (userRole === 'pharmacist') {
      links.push({ name: 'Pharmacy', path: '/pharmacy', access: 'pharmacist' });
    }

    if (userRole === 'patient') {
      links.push({ name: 'Patient Dashboard', path: '/patient', access: 'patient' });
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">HealthChain</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                {link.name}
              </Link>
            ))}
            
            {account ? (
              <div className="relative ml-3">
                <div className="flex items-center">
                  <button 
                    className="bg-blue-50 p-2 rounded-md text-blue-700 text-sm font-medium flex items-center"
                    onClick={handleDisconnect}
                  >
                    <span>{shortenAddress(account)}</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {account ? (
              <button
                onClick={handleDisconnect}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                {shortenAddress(account)} (Disconnect)
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full mt-2 px-4 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;