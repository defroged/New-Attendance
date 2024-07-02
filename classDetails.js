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
  const dateFormat = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  
  console.log('Date Format:', dateFormat); // Log the date format
  data.forEach((row, index) => {
    if (index > 0) {
      for (let i = 6; i <= 11; i++) {
        if (row[i]) {
          console.log('Row:', row[i]); // Log the row data
          const bookingEntries = row[i].split(',').map(entry => entry.trim());
          console.log('Booking Entries:', bookingEntries); // Log the booking entries

          bookingEntries.forEach(bookingEntry => {
            const match = bookingEntry.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
            if (match) {
              console.log('Booking Date:', match[1]); // Log each booking date
            }
            if (match && match[1] === dateFormat) {
              console.log('Match Found:', match[1], bookingEntry);
              const replacementInfo = bookingEntry.split("-").map(s => s.trim());
              const className = replacementInfo[0];
              const studentName = row[0];

              if (!replacementStudents[className]) {
                replacementStudents[className] = [];
              }

              replacementStudents[className].push({
                studentName: studentName,
                replacementDate: match[1]
              });
            }
          });
        }
      }
    }
  });

  return replacementStudents;
}


function getIconClass(student, absentStudents) {
  return absentStudents.includes(student) ? 'fa-times-circle text-danger' : 'fa-check-circle text-success';
}
function showModalWithClassDetails(className, students, eventDate, replacementStudents, eventDetails) {
  const formattedEventDate = eventDate.replace(/-/g, "/");
  const formattedDescription = eventDetails.description ? eventDetails.description.replace(/\n/g, '<br>') : 'No extra details';
  
  fetch(`${apiUrl}?sheetName=absence`)
    .then((response) => response.json())
    .then((data) => {
      const absenceData = data.values;
      const absentStudents = [];
      students.forEach((student) => {
        for (let i = 1; i < absenceData.length; i++) {
          if (absenceData[i][0].trim() === student) {
            for (let j = 1; j < absenceData[i].length; j++) {
              if (absenceData[i][j]) {
                let [absenceClassName, absenceDate] = absenceData[i][j].split(' - ');
                let formattedAbsenceDate = absenceDate.replace(/-/g, '/');
                if (formattedAbsenceDate === formattedEventDate) {
                  absentStudents.push(student);
                  break;
                }
              }
            }
          }
        }
      });
      let modalContent = `<h4>Class: ${className}</h4>
                          <p>Notes:<br>${formattedDescription}</p>
                          <p><a href="${eventDetails.location}" target="_blank">View Lesson Report</a></p>`;
                          
      modalContent += '<h5>Attendance:</h5><ol>';
      students.forEach(function (student) {
  modalContent += `<input type="hidden" id="eventDate" value="${formattedEventDate}" data-absent-students="${absentStudents}" data-class-name="${className}">`;
        const iconClass = getIconClass(student, absentStudents);
        modalContent += `<li>${student} <i class="fas ${iconClass}" data-student="${student}" onclick="iconClicked(event)"></i></li>`;
      });
      modalContent += '</ol>';
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
    })
    .catch((error) => console.error('Error fetching absence data:', error));
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
  eventDate.setMinutes(eventDate.getMinutes() - eventDate.getTimezoneOffset());
  const dateOfAbsence = eventDate.toISOString().slice(0, 10);
  const className = document.getElementById('eventDate').dataset.className;
  const saveChangesBtn = document.getElementById("saveChangesBtn");
  saveChangesBtn.disabled = true;
  const spinner = document.getElementById("spinner");
  spinner.classList.remove("d-none");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "block";
  const absentStudents = eventDateField.dataset.absentStudents.split(',');
  let newAbsences = [];
  document.querySelectorAll(".fa-times-circle").forEach(function (icon) {
    const student = icon.dataset.student;
    if (!absentStudents.includes(student)) {
      newAbsences.push(student);
    }
  });
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;
    const updatedValues = values.map((row) => {
      if (newAbsences.includes(row[0])) {
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
    const absenceData = newAbsences.map((student) => {
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
// Ensure fetchClassDetails is available globally
window.fetchClassDetails = fetchClassDetails;