import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/Button';
import Card from '../components/Card';
import { Search, Save, SendHorizontal } from 'lucide-react';

interface PatientData {
  name: string;
  matricNumber: number;
  regDate: number;
  hostelRoomNumber: string;
  healthRecord: string;
  accessCode: number;
  isAdmitted: boolean;
}

interface StaffMember {
  staffAddr: string;
  name: string;
  role: string;
}

const DoctorDashboard: React.FC = () => {
  const { contract } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Patient search
  const [matricNumber, setMatricNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  
  // Patient record update
  const [newRecord, setNewRecord] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [recipient, setRecipient] = useState('');
  
  // Staff list
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);

  // Fetch staff list
  const fetchStaffList = async () => {
    if (!contract) return;
    
    try {
      const staff = await contract.getAllStaff();
      setStaffList(staff);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  useEffect(() => {
    if (contract) {
      fetchStaffList();
    }
  }, [contract]);

  // Filter staff by role
  useEffect(() => {
    if (staffList.length > 0) {
      // Filter by role based on admission status
      const role = isAdmitted ? 'Nurse' : 'Pharmacist';
      const filtered = staffList.filter(staff => staff.role === role);
      setFilteredStaff(filtered);
      
      // Reset recipient if it's not in the filtered list
      if (filtered.length > 0 && !filtered.some(staff => staff.staffAddr === recipient)) {
        setRecipient(filtered[0].staffAddr);
      }
    }
  }, [staffList, isAdmitted, recipient]);

  const searchPatient = async () => {
    if (!contract || !matricNumber || !accessCode) {
      setError('Please enter both matric number and access code');
      return;
    }
    
    setSearchLoading(true);
    setError(null);
    setSuccess(null);
    setPatientData(null);
    
    try {
      // First, we need to find the patient's address from matric number
      const studentCount = await contract.getStudentCount();
      const students = await contract.getAllStudents();
      
      // Find the student with matching matric number
      let patientAddress = null;
      for (let i = 0; i < studentCount; i++) {
        if (students[i].matricNumber.toString() === matricNumber) {
          patientAddress = students[i].patientAddr;
          break;
        }
      }
      
      if (!patientAddress) {
        setError('Patient not found with this matric number');
        return;
      }
      
      // Now get the patient data
      const data = await contract.getStudent(patientAddress);
      
      // Check if access code matches
      if (data.accessCode.toString() !== accessCode) {
        setError('Invalid access code or access code has expired');
        return;
      }
      
      setPatientData({
        name: data.name,
        matricNumber: data.matricNumber.toNumber(),
        regDate: data.regDate.toNumber(),
        hostelRoomNumber: data.hostelRoomNumber,
        healthRecord: data.healthRecord,
        accessCode: data.accessCode.toNumber(),
        isAdmitted: data.isAdmitted
      });
      
      // Pre-fill current health record and admission status
      setNewRecord(data.healthRecord);
      setIsAdmitted(data.isAdmitted);
    } catch (err: any) {
      console.error('Error searching patient:', err);
      setError('Failed to retrieve patient data. Please check the matric number and access code.');
    } finally {
      setSearchLoading(false);
    }
  };

  const updatePatientRecord = async () => {
    if (!contract || !patientData) return;
    
    if (!newRecord) {
      setError('Health record cannot be empty');
      return;
    }
    
    if (!prescription) {
      setError('Prescription cannot be empty');
      return;
    }
    
    if (!recipient) {
      setError(`Please select a ${isAdmitted ? 'nurse' : 'pharmacist'} recipient`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const tx = await contract.updatePatientRecord(
        patientData.matricNumber,
        newRecord,
        prescription,
        patientData.accessCode,
        isAdmitted,
        recipient
      );
      
      await tx.wait();
      
      setSuccess('Patient record updated successfully!');
      setTimeout(() => {
        // Reset form after successful update
        setPatientData(null);
        setMatricNumber('');
        setAccessCode('');
        setNewRecord('');
        setPrescription('');
        setIsAdmitted(false);
        setRecipient('');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating patient record:', err);
      setError(err.message || 'Failed to update patient record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>
      
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Patient</h2>
        
        <div className="flex flex-col md:flex-row md:space-x-4">
          <div className="mb-4 md:mb-0 flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="matricNumber">
              Matric Number (6 digits)
            </label>
            <input
              id="matricNumber"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value.slice(0, 6))}
              maxLength={6}
              placeholder="e.g., 123456"
            />
          </div>
          
          <div className="mb-4 md:mb-0 flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="accessCode">
              Patient Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
            />
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={searchPatient}
              isLoading={searchLoading}
              className="w-full md:w-auto"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mt-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-md mt-4">
            {success}
          </div>
        )}
      </Card>
      
      {patientData && (
        <>
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </Card>
          
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Update Health Record</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="healthRecord">
                Health Record
              </label>
              <textarea
                id="healthRecord"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                value={newRecord}
                onChange={(e) => setNewRecord(e.target.value)}
                placeholder="Enter patient health record"
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prescription">
                Prescription
              </label>
              <textarea
                id="prescription"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="Enter prescription"
              ></textarea>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="admitted"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={isAdmitted}
                  onChange={(e) => setIsAdmitted(e.target.checked)}
                />
                <label htmlFor="admitted" className="ml-2 block text-sm text-gray-700">
                  Patient needs to be admitted
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="recipient">
                Send Prescription to: {isAdmitted ? 'Nurse' : 'Pharmacist'}
              </label>
              <select
                id="recipient"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              >
                <option value="">Select a {isAdmitted ? 'nurse' : 'pharmacist'}</option>
                {filteredStaff.map((staff) => (
                  <option key={staff.staffAddr} value={staff.staffAddr}>
                    {staff.name}
                  </option>
                ))}
              </select>
              {filteredStaff.length === 0 && (
                <p className="text-orange-500 text-sm mt-1">
                  No {isAdmitted ? 'nurses' : 'pharmacists'} available in the system
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={updatePatientRecord}
                isLoading={loading}
                className="flex items-center"
              >
                <SendHorizontal className="w-4 h-4 mr-2" />
                Update and Send Prescription
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DoctorDashboard;