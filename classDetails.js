const apiUrl = 'https://new-attendance.vercel.app/api/sheetData';

function fetchClassDetails(className) {
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const students = findStudentsByClassName(className, data.values);
      showModalWithClassDetails(className, students);
    })
    .catch((error) => {
      console.error('Error fetching class details:', error);
    });
}

function findStudentsByClassName(className, data) {
  let students = [];
  data.forEach(function (row) {
    if (row[1] === className) { // Note the change from row[0] to row[1] to search in column B for the class name
      students.push(row[0]); // Get the student name from column A by using row[0] instead of row[1]
    }
  });
  return students;
}

function showModalWithClassDetails(className, students) {
  // Create the modal content HTML string
  var modalContent = '<h4>Class: ' + className + '</h4><ul>';
  students.forEach(function (student) {
    modalContent += '<li>' + student + '</li>';
  });
  modalContent += '</ul>';
  
  // Create the Bootstrap modal and show it
  var modalInstance = new bootstrap.Modal(document.getElementById('myModal'));
  document.getElementById('myModalContent').innerHTML = modalContent;
  modalInstance.show();
}