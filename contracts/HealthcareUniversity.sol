// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HealthcareUniversity {
    // Struct for Student/Patient
    struct Student {
        address patientAddr;
        string name;
        uint256 matricNumber; // 6-digit number
        uint256 regDate;
        string hostelRoomNumber;
        string healthRecord;
        uint256 accessCode; // Random code for doctor access
        uint256 codeTimestamp; // Timestamp when code was generated
        bool isAdmitted; // Admission status
    }

    // Struct for Doctor/Nurse/Pharmacist
    struct Staff {
        address staffAddr;
        string name;
        string role; // "Doctor", "Nurse", or "Pharmacist"
    }

    // Struct for Prescription
    struct Prescription {
        string patientName;
        uint256 matricNumber;
        string prescription;
        address recipient; // Nurse or Pharmacist address
        uint256 timestamp;
    }

    // Arrays to store students, staff, and prescriptions
    Student[] private students;
    Staff[] private staff;
    Prescription[] private prescriptions;

    // Mappings for quick lookup
    mapping(address => uint256) private studentIndex;
    mapping(uint256 => uint256) private matricToIndex;
    mapping(address => uint256) private staffIndex;
    mapping(address => bool) private isStudent;
    mapping(address => bool) private isStaff;

    // Constants
    uint256 private constant CODE_EXPIRY = 30 minutes;

    // Events
    event StudentRegistered(address indexed patientAddr, uint256 matricNumber);
    event StaffRegistered(address indexed staffAddr, string role);
    event HealthRecordUpdated(address indexed patientAddr, string newRecord);
    event PrescriptionSent(address indexed patientAddr, address indexed recipient, string prescription);
    event AccessCodeCancelled(address indexed patientAddr);
    event AccessCodeGenerated(address indexed patientAddr, uint256 newCode);

    // Modifiers
    modifier onlyDoctor() {
        require(isStaff[msg.sender], "Only registered staff can perform this action");
        uint256 index = staffIndex[msg.sender];
        require(keccak256(abi.encodePacked(staff[index].role)) == keccak256(abi.encodePacked("Doctor")), 
                "Only doctors can perform this action");
        _;
    }

    modifier onlyStudent() {
        require(isStudent[msg.sender], "Only registered students can perform this action");
        _;
    }

    // Generate random code for student access
    function generateRandomCode(address _addr) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, _addr, block.prevrandao))) % 1000000;
    }

    // Register a new student
    function registerStudent(
        string memory _name,
        uint256 _matricNumber,
        uint256 _regDate,
        string memory _hostelRoomNumber
    ) public {
        require(!isStudent[msg.sender], "Student already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_matricNumber >= 100000 && _matricNumber <= 999999, "Matric number must be 6 digits");
        require(_regDate <= block.timestamp, "Invalid registration date");
        require(matricToIndex[_matricNumber] == 0 && students.length == 0 || matricToIndex[_matricNumber] == 0, 
                "Matric number already exists");

        uint256 accessCode = generateRandomCode(msg.sender);
        
        Student memory newStudent = Student({
            patientAddr: msg.sender,
            name: _name,
            matricNumber: _matricNumber,
            regDate: _regDate,
            hostelRoomNumber: _hostelRoomNumber,
            healthRecord: "",
            accessCode: accessCode,
            codeTimestamp: block.timestamp,
            isAdmitted: false
        });

        students.push(newStudent);
        studentIndex[msg.sender] = students.length - 1;
        matricToIndex[_matricNumber] = students.length - 1;
        isStudent[msg.sender] = true;

        emit StudentRegistered(msg.sender, _matricNumber);
        emit AccessCodeGenerated(msg.sender, accessCode);
    }

    // Register a new doctor, nurse, or pharmacist
    function registerStaff(string memory _name, string memory _role) public {
        require(!isStaff[msg.sender], "Staff already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Doctor")) ||
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Nurse")) ||
            keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("Pharmacist")),
            "Role must be Doctor, Nurse, or Pharmacist"
        );

        Staff memory newStaff = Staff({
            staffAddr: msg.sender,
            name: _name,
            role: _role
        });

        staff.push(newStaff);
        staffIndex[msg.sender] = staff.length - 1;
        isStaff[msg.sender] = true;

        emit StaffRegistered(msg.sender, _role);
    }

    // Update patient health record and send prescription
    function updatePatientRecord(
        uint256 _matricNumber,
        string memory _newRecord,
        string memory _prescription,
        uint256 _accessCode,
        bool _isAdmitted,
        address _recipient
    ) public onlyDoctor {
        require(matricToIndex[_matricNumber] != 0 || students.length > 0, "Patient not registered");
        uint256 index = matricToIndex[_matricNumber];
        require(students[index].accessCode == _accessCode, "Invalid access code");
        require(block.timestamp <= students[index].codeTimestamp + CODE_EXPIRY, "Access code expired");
        require(bytes(_newRecord).length > 0, "Health record cannot be empty");
        require(bytes(_prescription).length > 0, "Prescription cannot be empty");
        require(isStaff[_recipient], "Recipient must be registered staff");
        
        // Verify recipient role
        uint256 recipientIndex = staffIndex[_recipient];
        string memory recipientRole = _isAdmitted ? "Nurse" : "Pharmacist";
        require(
            keccak256(abi.encodePacked(staff[recipientIndex].role)) == keccak256(abi.encodePacked(recipientRole)),
            "Invalid recipient role"
        );

        // Update health record and admission status
        students[index].healthRecord = _newRecord;
        students[index].isAdmitted = _isAdmitted;
        students[index].accessCode = 0; // Invalidate code after use
        students[index].codeTimestamp = 0;

        // Create and store prescription
        Prescription memory newPrescription = Prescription({
            patientName: students[index].name,
            matricNumber: _matricNumber,
            prescription: _prescription,
            recipient: _recipient,
            timestamp: block.timestamp
        });
        prescriptions.push(newPrescription);

        emit HealthRecordUpdated(students[index].patientAddr, _newRecord);
        emit PrescriptionSent(students[index].patientAddr, _recipient, _prescription);
    }

    // Cancel access code
    function cancelAccessCode() public onlyStudent {
        uint256 index = studentIndex[msg.sender];
        students[index].accessCode = 0;
        students[index].codeTimestamp = 0;
        emit AccessCodeCancelled(msg.sender);
    }

    // Generate new access code
    function generateNewAccessCode() public onlyStudent {
        uint256 index = studentIndex[msg.sender];
        uint256 newCode = generateRandomCode(msg.sender);
        students[index].accessCode = newCode;
        students[index].codeTimestamp = block.timestamp;
        emit AccessCodeGenerated(msg.sender, newCode);
    }

    // Getter function for all students
    function getAllStudents() public view returns (Student[] memory) {
        return students;
    }

    // Getter function for specific student
    function getStudent(address _patientAddr) public view returns (
        string memory name,
        uint256 matricNumber,
        uint256 regDate,
        string memory hostelRoomNumber,
        string memory healthRecord,
        uint256 accessCode,
        bool isAdmitted
    ) {
        require(isStudent[_patientAddr], "Student not registered");
        uint256 index = studentIndex[_patientAddr];
        Student memory student = students[index];
        
        uint256 code = (msg.sender == _patientAddr && 
                       block.timestamp <= student.codeTimestamp + CODE_EXPIRY) 
                       ? student.accessCode : 0;

        return (
            student.name,
            student.matricNumber,
            student.regDate,
            student.hostelRoomNumber,
            student.healthRecord,
            code,
            student.isAdmitted
        );
    }

    // Getter function for all staff
    function getAllStaff() public view returns (Staff[] memory) {
        return staff;
    }

    // Getter function for specific staff
    function getStaff(address _staffAddr) public view returns (
        string memory name,
        string memory role
    ) {
        require(isStaff[_staffAddr], "Staff not registered");
        uint256 index = staffIndex[_staffAddr];
        Staff memory staffMember = staff[index];
        
        return (
            staffMember.name,
            staffMember.role
        );
    }

    // Getter function for prescriptions (accessible by recipient)
    function getPrescriptions(address _recipient) public view returns (Prescription[] memory) {
        require(isStaff[_recipient], "Not a registered staff");
        uint256 count = 0;
        
        // Count prescriptions for recipient
        for (uint256 i = 0; i < prescriptions.length; i++) {
            if (prescriptions[i].recipient == _recipient) {
                count++;
            }
        }

        // Create array of prescriptions
        Prescription[] memory result = new Prescription[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < prescriptions.length; i++) {
            if (prescriptions[i].recipient == _recipient) {
                result[index] = prescriptions[i];
                index++;
            }
        }
        
        return result;
    }

    // Get student count
    function getStudentCount() public view returns (uint256) {
        return students.length;
    }

    // Get staff count
    function getStaffCount() public view returns (uint256) {
        return staff.length;
    }

    // Get prescription count for recipient
    function getPrescriptionCount(address _recipient) public view returns (uint256) {
        require(isStaff[_recipient], "Not a registered staff");
        uint256 count = 0;
        for (uint256 i = 0; i < prescriptions.length; i++) {
            if (prescriptions[i].recipient == _recipient) {
                count++;
            }
        }
        return count;
    }
}