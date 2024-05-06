let modalInstance;
const apiUrl = 'https://new-attendance.vercel.app/api/sheetData';

function fetchClassDetails(className, eventDate, eventId, eventLocation, eventDescription) {
  fetch(apiUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        const students = findStudentsByClassName(className, data.values);
        const date = new Date(eventDate.replace(/-/g, '/'));
        const replacementStudents = findReplacementStudents(data.values, date);

        const eventDetails = {
            location: eventLocation,
            description: eventDescription
        };

        showModalWithClassDetails(className, students, eventDate, replacementStudents, eventDetails);
    })
    .catch(error => {
        console.error('Error:', error);
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

function findReplacementStudents(data, date) {
  const replacementStudents = {};
  const dateFormat = `${date.getFullYear()}/${String(date.getMonth() + 1)}/${String(date.getDate())}`;

  data.forEach((row, index) => { 
    if (index > 0) { 
      for (let i = 6; i <= 11; i++) { 
        if (row[i] && row[i].includes(dateFormat)) {
          const replacementInfo = row[i].split("-"); 
          const className = replacementInfo[0].trim();
          const studentName = row[0]; 

          if (!replacementStudents[className]) {
            replacementStudents[className] = [];
          }
          replacementStudents[className].push({
            studentName: studentName,
            replacementDate: row[i].substr(row[i].indexOf("(") + 1, 10) 
          }); 
        }
      }
    }
  });
  return replacementStudents; 
}

function showModalWithClassDetails(className, students, eventDate, replacementStudents, eventDetails) {
    const formattedEventDate = eventDate.replace(/-/g, "/");
    // Check if description exists, if not, set a default message or empty string
    const formattedDescription = eventDetails.description ? eventDetails.description.replace(/\n/g, '<br>') : 'No extra details';
    
    let modalContent = `<h4>Class: ${className}</h4>
                        <p>${formattedDescription}</p>
                        <p><a href="${eventDetails.location}" target="_blank">Lesson Report</a></p>
                        <ul>`;
    modalContent += '<h5>Attendance:</h5><ul>'; 
    students.forEach(function (student) {
        modalContent += `<input type="hidden" id="eventDate" value="${formattedEventDate}">`;
        modalContent += `<li>${student} <i class="fas fa-check-circle text-success" data-student="${student}" onclick="iconClicked(event)"></i></li>`;
    });

    modalContent += '</ul><h5>Replacement Students:</h5><ul>';
    const replacements = replacementStudents[className] || [];
    if (replacements.length) {
        replacements.forEach((replacement) => {
            modalContent += `<li>${replacement.studentName} <i class="fas fa-check-circle text-success" data-student="${replacement.studentName}" onclick="iconClicked(event)"></i></li>`;
        });
    } else {
        modalContent += '<li>No replacement students today.</li>';
    }
    modalContent += `</ul><button id="saveChangesBtn" class="btn btn-primary mt-3" onclick="saveAttendance()">Save Changes <span id="spinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span></button>`;
    modalInstance = new bootstrap.Modal(document.getElementById('myModal'));
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
  const eventDateField = document.getElementById('eventDate');
  const eventDate = new Date(eventDateField.value);

  // Fix for timezone differences
  eventDate.setMinutes(eventDate.getMinutes() - eventDate.getTimezoneOffset());

  const dateOfAbsence = eventDate.toISOString().slice(0, 10);

  const className = document.querySelector("h4").innerText.slice(6);

  const saveChangesBtn = document.getElementById("saveChangesBtn");
  saveChangesBtn.disabled = true;

  const spinner = document.getElementById("spinner");
  spinner.classList.remove("d-none");

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
      return row.slice(0, 3);
    });
    
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

    const absenceData = xMarkedStudents.map((student) => {
      return { student, eventName: className, date: dateOfAbsence };
    });

    const sheetId = 759358030; 
    const sheetName = 'absence'; 

    const updateAbsenceResponse = await fetch("/api/updateAbsenceDates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheetId: "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U",
        sheetId: 759358030, 
        sheetName: "absence", 
        data: absenceData,
      }),
    });

    if (!updateAbsenceResponse.ok) {
      throw new Error(`Failed to update Google Sheet data: ${updateAbsenceResponse.statusText}`);
    }

    resetState(saveChangesBtn, spinner, overlay);

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Google Sheet data: ${updateResponse.statusText}`);
    }

    resetState(saveChangesBtn, spinner, overlay); 
    showCustomAlert();

    setTimeout(function () {
      modalInstance.hide(); 
      resetModalContent();
    }, 2000);

  } catch (error) {}
}

function showCustomAlert() {
  const customAlert = document.getElementById("customAlert");

  customAlert.classList.remove("d-none");
  customAlert.classList.add("show");

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

window.fetchClassDetails = fetchClassDetails;