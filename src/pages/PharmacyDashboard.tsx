import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/Button';
import Card from '../components/Card';
import { RefreshCw, FileText, CalendarDays, User, CheckSquare } from 'lucide-react';

interface Prescription {
  patientName: string;
  matricNumber: number;
  prescription: string;
  recipient: string;
  timestamp: number;
  fulfilled?: boolean;
}

const PharmacyDashboard: React.FC = () => {
  const { account, contract } = useWeb3();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  
  // This would be stored in a real database, we'll use local state for demo
  const [fulfilledPrescriptions, setFulfilledPrescriptions] = useState<{[key: string]: boolean}>({});

  const fetchPrescriptions = async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await contract.getPrescriptions(account);
      
      const formattedPrescriptions = data.map((prescription: any) => {
        const id = `${prescription.matricNumber.toString()}-${prescription.timestamp.toString()}`;
        return {
          patientName: prescription.patientName,
          matricNumber: prescription.matricNumber.toNumber(),
          prescription: prescription.prescription,
          recipient: prescription.recipient,
          timestamp: prescription.timestamp.toNumber(),
          fulfilled: fulfilledPrescriptions[id] || false
        };
      });
      
      // Sort prescriptions by timestamp (newest first)
      formattedPrescriptions.sort((a: Prescription, b: Prescription) => b.timestamp - a.timestamp);
      
      setPrescriptions(formattedPrescriptions);
      
      // If a prescription was selected, update it with the refreshed data
      if (selectedPrescription) {
        const updated = formattedPrescriptions.find(
          p => p.matricNumber === selectedPrescription.matricNumber && 
              p.timestamp === selectedPrescription.timestamp
        );
        if (updated) {
          setSelectedPrescription(updated);
        }
      }
    } catch (err: any) {
      console.error('Error fetching prescriptions:', err);
      setError('Failed to load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && contract) {
      fetchPrescriptions();
    }
  }, [account, contract, fulfilledPrescriptions]);

  const markAsFulfilled = (prescription: Prescription) => {
    const id = `${prescription.matricNumber}-${prescription.timestamp}`;
    setFulfilledPrescriptions(prev => ({
      ...prev,
      [id]: true
    }));
    
    // Update the selected prescription
    setSelectedPrescription({
      ...prescription,
      fulfilled: true
    });
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading && prescriptions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
        <Button 
          onClick={fetchPrescriptions} 
          variant="outline"
          className="flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Prescriptions</h2>
            
            {prescriptions.length === 0 ? (
              <p className="text-gray-500">No prescriptions found.</p>
            ) : (
              <div className="divide-y">
                {prescriptions.map((prescription, index) => (
                  <div 
                    key={index} 
                    className={`py-3 px-2 hover:bg-gray-50 cursor-pointer transition-all rounded ${selectedPrescription === prescription ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-500" />
                        <p className="font-medium">{prescription.patientName}</p>
                      </div>
                      {prescription.fulfilled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckSquare className="w-3 h-3 mr-1" />
                          Fulfilled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarDays className="w-3 h-3 mr-1" />
                      <p>{formatDate(prescription.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {selectedPrescription ? (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Prescription Details</h2>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Patient</p>
                    <p className="font-medium">{selectedPrescription.patientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Matric Number</p>
                    <p className="font-medium">{selectedPrescription.matricNumber}</p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDate(selectedPrescription.timestamp)}</p>
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                    <p className="font-medium">Prescription</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="whitespace-pre-line">{selectedPrescription.prescription}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Actions</p>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => markAsFulfilled(selectedPrescription)}
                    disabled={selectedPrescription.fulfilled}
                  >
                    {selectedPrescription.fulfilled ? 'Already Fulfilled' : 'Mark as Fulfilled'}
                  </Button>
                  <Button variant="outline">Print</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No Prescription Selected</h3>
                <p className="text-gray-500">Select a prescription from the list to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;