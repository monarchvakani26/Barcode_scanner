import React, { useState } from 'react';
import './App.css'; // We'll create this soon
import studentsData from './studentsData'; // Import our demo data
import BarcodeScanner from './BarcodeScanner';

function App() {
  // State to hold our student data, so we can update attendance
  const [students, setStudents] = useState(studentsData);
  // State to display the last scanned student's info
  const [scannedStudent, setScannedStudent] = useState(null);
  // State for scanner status or messages
  const [scanMessage, setScanMessage] = useState("Ready to scan...");

  // Function to handle a barcode scan
  const handleScan = (decodedText) => {
    setScanMessage(`Scanned: ${decodedText}`); // Show what was scanned

    // Find the student in our data
    const studentIndex = students.findIndex(s => s.id === decodedText);

    if (studentIndex !== -1) {
      // Student found! Update their attendance
      const updatedStudents = [...students];
      updatedStudents[studentIndex].attendance = 'Present';
      setStudents(updatedStudents);
      setScannedStudent(updatedStudents[studentIndex]); // Set the found student for display
    } else {
      setScannedStudent(null); // No student found
      setScanMessage("Student not found for this barcode!");
    }
  };

  return (
    <div className="App">
      <h1>Student Attendance Portal</h1>

      {/* This is where our barcode scanner component will go */}
      <div className="scanner-container">
        <BarcodeScanner onDetected={handleScan} />
      </div>

      <div className="scan-info">
        <h2>Scan Status:</h2>
        <p>{scanMessage}</p>

        {scannedStudent && (
          <div className="scanned-student-details">
            <h3>Last Scanned Student:</h3>
            <p><strong>Name:</strong> {scannedStudent.name}</p>
            <p><strong>ID:</strong> {scannedStudent.id}</p>
            <p><strong>Branch:</strong> {scannedStudent.branch}</p>
            <p><strong>Class:</strong> {scannedStudent.class}</p>
            <p><strong>Attendance:</strong> <span className={scannedStudent.attendance === 'Present' ? 'present' : 'absent'}>{scannedStudent.attendance}</span></p>
          </div>
        )}
      </div>

      <hr />

      <h2>Student List</h2>
      <table className="student-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Class</th>
            <th>Attendance</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.id}</td>
              <td>{student.name}</td>
              <td>{student.branch}</td>
              <td>{student.class}</td>
              <td><span className={student.attendance === 'Present' ? 'present' : 'absent'}>{student.attendance}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;