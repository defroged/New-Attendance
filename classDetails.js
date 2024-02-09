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
    modalContent += '<li>' + student + ' <i class="fas fa-check-circle text-success" data-student="' + student + '" onclick="iconClicked(event)"></i></li>';
  });
  modalContent += '</ul>';
  // Save Changes button
  modalContent += '<button id="saveChangesBtn" class="btn btn-primary mt-3" onclick="saveAttendance()">Save Changes <span id="spinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></button>';

  var modalInstance = new bootstrap.Modal(document.getElementById('myModal'));
  document.getElementById('myModalContent').innerHTML = modalContent;
  modalInstance.show();
}

function iconClicked(event) {
  const iconElement = event.target;
  if (iconElement.classList.contains("fa-check-circle")) {
    iconElement.classList.remove("fa-check-circle", "text-success");
    iconElement.classList.add("fa-times-circle", "text-danger");
  } else {
    iconElement.classList.remove("fa-times-circle", "text-danger");
    iconElement.classList.add("fa-check-circle", "text-success");
  }
}

async function saveAttendance() {
  // Disable the button
  const saveChangesBtn = document.getElementById("saveChangesBtn");
  saveChangesBtn.disabled = true;

  // Show the spinner
  const spinner = document.getElementById("spinner");
  spinner.classList.remove("d-none");

  // Darken the screen
  const overlay = document.getElementById("overlay");
  overlay.style.display = "block";
  let xMarkedStudents = [];
  document.querySelectorAll(".fa-times-circle").forEach(function (icon) {
    xMarkedStudents.push(icon.dataset.student);
  });

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    const updatedValues = values.map((row) => {
      if (xMarkedStudents.includes(row[0])) {
        row[2] = parseInt(row[2], 10) + 1;
      }
      return row;
    });
	  console.log('Updated values:', updatedValues);

    const dataWithoutHeader = updatedValues.slice(1);

    const updateResponse = await fetch("/api/updateAttendance", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  spreadsheetId: "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U",
  range: "Sheet1!A2:C",
  data: dataWithoutHeader,
}),
});
 // Reset the state inside the fetch, regardless of the response status
    resetState(saveChangesBtn, spinner, overlay);
    
    // Check if the updateResponse has an error
    if (!updateResponse.ok) {
      // Log the error response details and throw new error
      try {
        console.error('Error response details:', await updateResponse.json());
      } catch (logErr) {
        console.error('Error logging response details:', logErr);
      }
      throw new Error(`Failed to update Google Sheet data: ${updateResponse.statusText}`);
    }

    // If successful, show the custom alert and close the modal after 2 seconds
console.log("Attendance updated successfully");
showCustomAlert();

setTimeout(function () {
  // Close the modal
  $('#myModal').modal('hide');
}, 2000);

// Add the event listener for 'hidden.bs.modal'
$('#myModal').on('hidden.bs.modal', function () {
  resetModalContent();
});

  } catch (error) {
    console.error("Error updating attendance:", error);
  }
}

function showCustomAlert() {
  const customAlert = document.getElementById("customAlert");

  // Show the alert
  customAlert.classList.remove("d-none");
  customAlert.classList.add("show");

  // Auto-dismiss after 2 seconds
  setTimeout(function () {
    customAlert.classList.remove("show");
    customAlert.classList.add("d-none");
  }, 2000);
}

function resetState(saveChangesBtn, spinner, overlay) {
  saveChangesBtn.disabled = false;
  spinner.classList.add("d-none");
  overlay.style.display = "none";
}

function resetModalContent() {
  const modalContent = document.getElementById("myModalContent");
  modalContent.innerHTML = "";
}