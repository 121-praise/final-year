import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import HealthChainABI from '../artifacts/contracts/HealthCareUniversity.sol/HealthCareUniversity.json';

// Update this with your deployed contract address
const CONTRACT_ADDRESS = '0xF66FE545a8128476493A18ADE6D560BC3922dB1E';

// Explicitly define admin addresses for direct comparison
const ADMIN_ADDRESSES = ['0x7132dA13b7Df1484dc2a68784f03Bb8DD25f96bB'];

interface Web3ContextType {
  account: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  isAdmin: boolean;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if address is in admin list
  const checkIfAddressIsAdmin = (address: string): boolean => {
    return ADMIN_ADDRESSES.some((admin) => admin.toLowerCase() === address.toLowerCase());
  };

  // Initialize ethers on component mount
  useEffect(() => {
    const initializeEthers = async () => {
      try {
        if (window.ethereum) {
          const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
          setProvider(ethersProvider);
          console.log('Provider initialized');

          // Handle account changes
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length > 0) {
              const currentAccount = accounts[0];
              setAccount(currentAccount);
              setIsAdmin(checkIfAddressIsAdmin(currentAccount));
            } else {
              setAccount(null);
              setIsAdmin(false);
              setSigner(null);
              setContract(null);
            }
          });

          // Handle chain changes
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });

          const accounts = await ethersProvider.listAccounts();
          if (accounts.length > 0) {
            const currentAccount = accounts[0];
            setAccount(currentAccount);
            setIsAdmin(checkIfAddressIsAdmin(currentAccount));

            const ethSigner = ethersProvider.getSigner();
            setSigner(ethSigner);

            try {
              const healthContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                HealthChainABI.abi,
                ethSigner
              );
              setContract(healthContract);
            } catch (contractErr) {
              console.error('Error creating contract:', contractErr);
              setError('Failed to initialize contract. Ensure CONTRACT_ADDRESS is correct.');
            }
          }
        } else {
          setError('Please install MetaMask to use this application');
        }
      } catch (err: any) {
        console.error('Failed to initialize ethers:', err);
        setError('Failed to connect to blockchain: ' + err.message);
      } finally {
        setIsConnecting(false);
      }
    };

    initializeEthers();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      setError('MetaMask is not installed!');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      setAccount(currentAccount);
      setIsAdmin(checkIfAddressIsAdmin(currentAccount));

      const ethSigner = provider.getSigner();
      setSigner(ethSigner);

      try {
        const healthContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          HealthChainABI.abi,
          ethSigner
        );
        setContract(healthContract);
      } catch (contractErr) {
        console.error('Error creating contract:', contractErr);
        setError('Failed to initialize contract. Ensure CONTRACT_ADDRESS is correct.');
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const value = {
    account,
    provider,
    signer,
    contract,
    connectWallet,
    isConnecting,
    error,
    isAdmin,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};