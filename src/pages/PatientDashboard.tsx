import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/Button';
import Card from '../components/Card';
import { RefreshCw, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PatientData {
  name: string;
  matricNumber: number;
  regDate: number;
  hostelRoomNumber: string;
  healthRecord: string;
  accessCode: number;
  isAdmitted: boolean;
}

const PatientDashboard: React.FC = () => {
  const { account, contract } = useWeb3();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeLoading, setCodeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeGeneratedTime, setCodeGeneratedTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const fetchPatientData = async () => {
    if (!contract || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await contract.getStudent(account);
      
      setPatientData({
        name: data.name,
        matricNumber: data.matricNumber.toNumber(),
        regDate: data.regDate.toNumber(),
        hostelRoomNumber: data.hostelRoomNumber,
        healthRecord: data.healthRecord,
        accessCode: data.accessCode.toNumber(),
        isAdmitted: data.isAdmitted
      });
      
      if (data.accessCode.toNumber() > 0) {
        // Calculate time remaining from contract
        setCodeGeneratedTime(Date.now());
      }
    } catch (err: any) {
      console.error('Error fetching patient data:', err);
      setError('Failed to load patient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAccessCode = async () => {
    if (!contract) return;
    
    setCodeLoading(true);
    setError(null);
    
    try {
      const tx = await contract.generateNewAccessCode();
      await tx.wait();
      await fetchPatientData();
      setCodeGeneratedTime(Date.now());
    } catch (err: any) {
      console.error('Error generating access code:', err);
      setError('Failed to generate access code. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const cancelAccessCode = async () => {
    if (!contract) return;
    
    setCancelLoading(true);
    setError(null);
    
    try {
      const tx = await contract.cancelAccessCode();
      await tx.wait();
      await fetchPatientData();
      setCodeGeneratedTime(null);
      setTimeRemaining(null);
    } catch (err: any) {
      console.error('Error cancelling access code:', err);
      setError('Failed to cancel access code. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const copyAccessCode = () => {
    if (patientData?.accessCode) {
      navigator.clipboard.writeText(patientData.accessCode.toString());
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (account && contract) {
      fetchPatientData();
    }
  }, [account, contract]);

  useEffect(() => {
    if (!codeGeneratedTime || !patientData?.accessCode) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      // Code expires after 30 minutes (1800000 ms)
      const elapsed = Date.now() - codeGeneratedTime;
      const remaining = 1800000 - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(interval);
        // Refresh data to confirm code expiration on contract
        fetchPatientData();
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeGeneratedTime, patientData?.accessCode]);

  // Format time remaining
  const formatTimeRemaining = () => {
    if (!timeRemaining) return '--:--';
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <Card className="max-w-lg mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Patient Data</h2>
          <p className="mb-4">We couldn't find your patient record. Please register first.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Patient Dashboard</h1>
        <Button 
          onClick={fetchPatientData} 
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-2">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{patientData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Matric Number</p>
              <p className="font-medium">{patientData.matricNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Registration Date</p>
              <p className="font-medium">{formatDate(patientData.regDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hostel Room</p>
              <p className="font-medium">{patientData.hostelRoomNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Admission Status</p>
              <div className="flex items-center">
                {patientData.isAdmitted ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <p className="font-medium text-green-600">Currently Admitted</p>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                    <p className="font-medium">Not Admitted</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className={patientData.accessCode ? "border-2 border-blue-500" : ""}>
          <h2 className="text-xl font-semibold mb-4">Access Code</h2>
          
          {patientData.accessCode ? (
            <div className="text-center">
              <div className="bg-blue-50 py-4 px-2 rounded-lg mb-3">
                <p className="text-sm text-blue-700 mb-1">Your active access code:</p>
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-900 tracking-wide mr-2">
                    {patientData.accessCode}
                  </span>
                  <button 
                    onClick={copyAccessCode}
                    className="text-blue-500 hover:text-blue-700"
                    title="Copy code"
                  >
                    {codeCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-center mb-4">
                <Clock className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-sm">
                  Expires in: <span className="font-semibold">{formatTimeRemaining()}</span>
                </span>
              </div>
              
              <Button
                variant="danger"
                onClick={cancelAccessCode}
                isLoading={cancelLoading}
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Access Code
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-4 text-gray-600">Generate a temporary access code for doctors to view your medical records.</p>
              <Button
                onClick={generateAccessCode}
                isLoading={codeLoading}
                className="w-full"
              >
                Generate Access Code
              </Button>
            </div>
          )}
        </Card>
      </div>
      
      <Card>
        <h2 className="text-xl font-semibold mb-4">Medical Records</h2>
        {patientData.healthRecord ? (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="whitespace-pre-line">{patientData.healthRecord}</p>
          </div>
        ) : (
          <p className="text-gray-500">No medical records available yet.</p>
        )}
      </Card>
    </div>
  );
};

export default PatientDashboard;