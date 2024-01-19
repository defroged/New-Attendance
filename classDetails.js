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
    if (row[1] === className) { 
      students.push(row[0]); 
    }
  });
  return students;
}

function showModalWithClassDetails(className, students) {
  var modalContent = '<h4>Class: ' + className + '</h4><ul>';
  students.forEach(function (student) {
    modalContent += '<li>' + student + ' <i class="fas fa-check-circle text-success" onclick="iconClicked(event)"></i></li>';
  });
  modalContent += '</ul>';
  
  var modalInstance = new bootstrap.Modal(document.getElementById('myModal'));
  document.getElementById('myModalContent').innerHTML = modalContent;
  modalInstance.show();
}

function iconClicked(event) {
  const iconElement = event.target;
  if (iconElement.classList.contains("fa-check-circle")) {
    iconElement.classList.remove("fa-check-circle", "text-success");
    iconElement.classList.add("fa-times-circle", "text-danger");
    // Call function when icon changed to "x" mark
    myPlaceholderFunction();
  } else {
    iconElement.classList.remove("fa-times-circle", "text-danger");
    iconElement.classList.add("fa-check-circle", "text-success");
  }
}

function myPlaceholderFunction() {
  // Placeholder function for later implementation
  console.log("Placeholder function called");
}