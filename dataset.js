const mockStudentDataset = [
  {
    "StudentID": "STU1001",
    "Name": "Olivia Rodriguez",
    "StudyHours": 18.5,
    "Attendance": 95.0,
    "SleepHours": 8.0,
    "ScreenTime": 12.0,
    "ParentalInvolvement": "High",
    "Tutoring": "Yes",
    "Extracurricular": "Yes",
    "StressLevel": 3,
    "PreTestScore": 88.0,
    "FinalScore": 92.4
  },
  {
    "StudentID": "STU1002",
    "Name": "Noah Smith",
    "StudyHours": 6.2,
    "Attendance": 72.5,
    "SleepHours": 5.0,
    "ScreenTime": 28.5,
    "ParentalInvolvement": "Low",
    "Tutoring": "No",
    "Extracurricular": "No",
    "StressLevel": 8,
    "PreTestScore": 45.0,
    "FinalScore": 48.7
  },
  {
    "StudentID": "STU1003",
    "Name": "Sophia Martinez",
    "StudyHours": 12.0,
    "Attendance": 88.0,
    "SleepHours": 7.0,
    "ScreenTime": 18.0,
    "ParentalInvolvement": "Medium",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 5,
    "PreTestScore": 72.0,
    "FinalScore": 75.6
  },
  {
    "StudentID": "STU1004",
    "Name": "Liam Garcia",
    "StudyHours": 22.0,
    "Attendance": 98.5,
    "SleepHours": 7.5,
    "ScreenTime": 8.0,
    "ParentalInvolvement": "High",
    "Tutoring": "Yes",
    "Extracurricular": "No",
    "StressLevel": 4,
    "PreTestScore": 92.5,
    "FinalScore": 95.8
  },
  {
    "StudentID": "STU1005",
    "Name": "Amelia Hernandez",
    "StudyHours": 15.0,
    "Attendance": 91.0,
    "SleepHours": 6.8,
    "ScreenTime": 15.5,
    "ParentalInvolvement": "Medium",
    "Tutoring": "Yes",
    "Extracurricular": "Yes",
    "StressLevel": 6,
    "PreTestScore": 78.0,
    "FinalScore": 83.1
  },
  {
    "StudentID": "STU1006",
    "Name": "Lucas Davis",
    "StudyHours": 5.0,
    "Attendance": 65.0,
    "SleepHours": 4.5,
    "ScreenTime": 32.0,
    "ParentalInvolvement": "Low",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 9,
    "PreTestScore": 50.0,
    "FinalScore": 46.2
  },
  {
    "StudentID": "STU1007",
    "Name": "Emma Wilson",
    "StudyHours": 14.5,
    "Attendance": 89.5,
    "SleepHours": 7.2,
    "ScreenTime": 20.0,
    "ParentalInvolvement": "High",
    "Tutoring": "No",
    "Extracurricular": "No",
    "StressLevel": 4,
    "PreTestScore": 76.0,
    "FinalScore": 78.9
  },
  {
    "StudentID": "STU1008",
    "Name": "Benjamin Miller",
    "StudyHours": 9.8,
    "Attendance": 82.0,
    "SleepHours": 6.0,
    "ScreenTime": 22.5,
    "ParentalInvolvement": "Medium",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 7,
    "PreTestScore": 65.0,
    "FinalScore": 67.3
  },
  {
    "StudentID": "STU1009",
    "Name": "Isabella Gonzalez",
    "StudyHours": 24.5,
    "Attendance": 99.0,
    "SleepHours": 8.5,
    "ScreenTime": 5.0,
    "ParentalInvolvement": "High",
    "Tutoring": "Yes",
    "Extracurricular": "Yes",
    "StressLevel": 2,
    "PreTestScore": 95.0,
    "FinalScore": 99.2
  },
  {
    "StudentID": "STU1010",
    "Name": "James Anderson",
    "StudyHours": 8.0,
    "Attendance": 80.0,
    "SleepHours": 6.5,
    "ScreenTime": 24.0,
    "ParentalInvolvement": "Low",
    "Tutoring": "Yes",
    "Extracurricular": "No",
    "StressLevel": 6,
    "PreTestScore": 58.0,
    "FinalScore": 62.5
  },
  {
    "StudentID": "STU1011",
    "Name": "Ava Taylor",
    "StudyHours": 11.2,
    "Attendance": 86.0,
    "SleepHours": 7.0,
    "ScreenTime": 17.5,
    "ParentalInvolvement": "Medium",
    "Tutoring": "No",
    "Extracurricular": "No",
    "StressLevel": 5,
    "PreTestScore": 70.0,
    "FinalScore": 72.1
  },
  {
    "StudentID": "STU1012",
    "Name": "Elijah Thomas",
    "StudyHours": 19.0,
    "Attendance": 94.5,
    "SleepHours": 8.2,
    "ScreenTime": 10.0,
    "ParentalInvolvement": "High",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 3,
    "PreTestScore": 84.0,
    "FinalScore": 89.6
  },
  {
    "StudentID": "STU1013",
    "Name": "Charlotte Moore",
    "StudyHours": 13.5,
    "Attendance": 90.0,
    "SleepHours": 7.8,
    "ScreenTime": 14.0,
    "ParentalInvolvement": "Medium",
    "Tutoring": "Yes",
    "Extracurricular": "Yes",
    "StressLevel": 4,
    "PreTestScore": 75.0,
    "FinalScore": 81.3
  },
  {
    "StudentID": "STU1014",
    "Name": "Mason Martin",
    "StudyHours": 4.5,
    "Attendance": 68.0,
    "SleepHours": 5.5,
    "ScreenTime": 35.0,
    "ParentalInvolvement": "Low",
    "Tutoring": "No",
    "Extracurricular": "No",
    "StressLevel": 8,
    "PreTestScore": 48.0,
    "FinalScore": 45.9
  },
  {
    "StudentID": "STU1015",
    "Name": "Mia Lee",
    "StudyHours": 16.8,
    "Attendance": 93.0,
    "SleepHours": 6.5,
    "ScreenTime": 16.0,
    "ParentalInvolvement": "Medium",
    "Tutoring": "Yes",
    "Extracurricular": "No",
    "StressLevel": 6,
    "PreTestScore": 80.0,
    "FinalScore": 84.2
  },
  {
    "StudentID": "STU1016",
    "Name": "Henry Perez",
    "StudyHours": 10.5,
    "Attendance": 84.0,
    "SleepHours": 7.0,
    "ScreenTime": 21.0,
    "ParentalInvolvement": "Medium",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 5,
    "PreTestScore": 67.0,
    "FinalScore": 70.4
  },
  {
    "StudentID": "STU1017",
    "Name": "Evelyn Thompson",
    "StudyHours": 20.0,
    "Attendance": 96.0,
    "SleepHours": 7.5,
    "ScreenTime": 9.5,
    "ParentalInvolvement": "High",
    "Tutoring": "No",
    "Extracurricular": "Yes",
    "StressLevel": 3,
    "PreTestScore": 90.0,
    "FinalScore": 92.7
  },
  {
    "StudentID": "STU1018",
    "Name": "Alexander White",
    "StudyHours": 7.0,
    "Attendance": 78.0,
    "SleepHours": 6.0,
    "ScreenTime": 26.0,
    "ParentalInvolvement": "Low",
    "Tutoring": "No",
    "Extracurricular": "No",
    "StressLevel": 7,
    "PreTestScore": 55.0,
    "FinalScore": 55.8
  },
  {
    "StudentID": "STU1019",
    "Name": "Harper Harris",
    "StudyHours": 13.0,
    "Attendance": 87.5,
    "SleepHours": 6.8,
    "ScreenTime": 18.5,
    "ParentalInvolvement": "Medium",
    "Tutoring": "Yes",
    "Extracurricular": "Yes",
    "StressLevel": 5,
    "PreTestScore": 74.0,
    "FinalScore": 79.4
  },
  {
    "StudentID": "STU1020",
    "Name": "Ethan Sanchez",
    "StudyHours": 3.0,
    "Attendance": 60.0,
    "SleepHours": 4.8,
    "ScreenTime": 38.0,
    "ParentalInvolvement": "Low",
    "Tutoring": "Yes",
    "Extracurricular": "No",
    "StressLevel": 10,
    "PreTestScore": 42.0,
    "FinalScore": 41.5
  }
];

// Helper to calculate grades and risk status
function enrichStudentData(student) {
  let grade = "F";
  const score = student.FinalScore;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  
  let riskStatus = "Low Risk";
  if (score < 60) {
    riskStatus = "High Risk";
  } else if (score < 75) {
    riskStatus = "Medium Risk";
  }
  
  return {
    ...student,
    Grade: grade,
    RiskStatus: riskStatus
  };
}

const enrichedDataset = mockStudentDataset.map(enrichStudentData);
// Attach to window for direct browser script loading compatibility (prevents CORS issues on file:// protocol)
window.mockStudentDataset = enrichedDataset;
window.enrichStudentData = enrichStudentData;
