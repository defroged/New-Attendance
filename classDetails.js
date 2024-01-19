const apiUrl = 'https://new-attendance.vercel.app/api/sheetHandler';

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
  var students = [];
  data.forEach(function (row) {
    if (row[0] === className) {
      students.push(row[1]);
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