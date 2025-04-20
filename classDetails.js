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
  const eventDate = date.toISOString().slice(0, 10);

  data.forEach((row, index) => {
    if (index > 0) {
      for (let i = 6; i <= 11; i++) {
        if (row[i]) {
          const bookingEntries = row[i].split(',').map(entry => entry.trim());
          bookingEntries.forEach(bookingEntry => {
            const match = bookingEntry.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
            if (match) {
              const bookingDate = new Date(match[1]).toISOString().slice(0, 10);
              if (eventDate === bookingDate) {
                const replacementInfo = bookingEntry.split("-");
                const className = replacementInfo[0].trim();
                const studentName = row[0];

                if (!replacementStudents[className]) {
                  replacementStudents[className] = [];
                }

                replacementStudents[className].push({
                  studentName: studentName,
                  replacementDate: bookingDate
                });
              }
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
  // Ensure eventDateField and dataset exist before accessing properties
  if (!eventDateField || !eventDateField.dataset) {
      console.error("Could not find event date field or its dataset.");
      alert("An error occurred preparing data. Please try again.");
      return;
  }
  const eventDateStr = eventDateField.value; // e.g., "2025/04/20"
  const className = eventDateField.dataset.className;
  // Get the list of students who were initially marked absent when the modal opened
  const initialAbsentees = (eventDateField.dataset.absentStudents || "").split(',').filter(Boolean); // Ensure array even if empty

  // Validate date string before creating Date object
  if (!eventDateStr || !className) {
       console.error("Missing event date or class name.");
       alert("An error occurred: Missing class details. Please try again.");
       return;
  }

  // Use specific date format YYYY-MM-DD for backend consistency
  // Create date object assuming input is YYYY/MM/DD from Japan time
  const parts = eventDateStr.split('/');
  let dateOfAbsence = '';
  if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      // Create date in a way less likely to be affected by timezone assumptions during formatting
      const dateObj = new Date(Date.UTC(year, month, day));
      if (!isNaN(dateObj.getTime())) {
           dateOfAbsence = dateObj.toISOString().slice(0, 10); // Get YYYY-MM-DD
      }
  }

  if (!dateOfAbsence) {
      console.error("Invalid date format:", eventDateStr);
      alert("An error occurred: Invalid date. Please check the event.");
      return;
  }

  console.log(`Processing attendance for: Class=${className}, Date=${dateOfAbsence}`);
  console.log("Initial Absentees:", initialAbsentees);

  const saveChangesBtn = document.getElementById("saveChangesBtn");
  const spinner = document.getElementById("spinner");
  const overlay = document.getElementById("overlay");

  // Disable button, show spinner/overlay
  if (saveChangesBtn) saveChangesBtn.disabled = true;
  if (spinner) spinner.classList.remove("d-none");
  if (overlay) overlay.style.display = "block";

  let studentsToMarkAbsent = []; // Students who were present -> now absent
  let studentsToMarkPresent = []; // Students who were absent -> now present

  // Iterate through each student list item in the modal
  document.querySelectorAll("#myModalContent ol li").forEach(function (item) {
      const icon = item.querySelector("i.fas");
      if (!icon || !icon.dataset.student) return; // Skip if no icon or student data found

      const student = icon.dataset.student;
      const isCurrentlyAbsent = icon.classList.contains("fa-times-circle");
      const wasInitiallyAbsent = initialAbsentees.includes(student);

      if (isCurrentlyAbsent && !wasInitiallyAbsent) {
          // Was present, now marked absent
          studentsToMarkAbsent.push(student);
      } else if (!isCurrentlyAbsent && wasInitiallyAbsent) {
          // Was absent, now marked present
          studentsToMarkPresent.push(student);
      }
      // else: state didn't change, do nothing
  });

  console.log("Students to mark ABSENT:", studentsToMarkAbsent);
  console.log("Students to mark PRESENT:", studentsToMarkPresent);

  // --- Prepare data payloads for backend ---
  const absenceDataToAdd = studentsToMarkAbsent.map((student) => ({
      student,
      eventName: className,
      date: dateOfAbsence // YYYY-MM-DD
  }));

  const absenceDataToRemove = studentsToMarkPresent.map((student) => ({
      student,
      eventName: className,
      date: dateOfAbsence // YYYY-MM-DD format to find specific record
  }));

  const attendanceUpdateData = {
      studentsToIncrement: studentsToMarkAbsent,
      studentsToDecrement: studentsToMarkPresent
  };

  try {
      // --- Make API calls concurrently ---
      const apiCalls = [];
      const spreadsheetId = "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U"; // Centralize Spreadsheet ID
      const absenceSheetGID = 759358030; // Centralize Absence Sheet GID

      // 1. Add new absence records (if any) - Uses existing endpoint
      if (absenceDataToAdd.length > 0) {
          console.log("API Call: ADD absence records via /api/updateAbsenceDates");
          apiCalls.push(fetch("/api/updateAbsenceDates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  spreadsheetId: spreadsheetId,
                  sheetId: absenceSheetGID,
                  sheetName: "absence", // Sheet name needed by the handler
                  data: absenceDataToAdd,
              }),
          }));
      } else {
          apiCalls.push(Promise.resolve({ ok: true, statusText: 'No absences to add' })); // Placeholder
      }

      // 2. Remove old absence records (if any) - Needs NEW endpoint /api/removeAbsenceDate
      if (absenceDataToRemove.length > 0) {
           console.log("API Call: REMOVE absence records via /api/removeAbsenceDate");
           apiCalls.push(fetch("/api/removeAbsenceDate", { // NEW endpoint
              method: "POST", // Or DELETE, but POST is often simpler for bodies
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  spreadsheetId: spreadsheetId,
                  sheetName: "absence", // Sheet name to search within
                  sheetId: absenceSheetGID, // Sheet GID needed for batchUpdate
                  data: absenceDataToRemove, // Send data about which records to remove
              }),
          }));
      } else {
          apiCalls.push(Promise.resolve({ ok: true, statusText: 'No absences to remove' })); // Placeholder
      }

      // 3. Update absence counts (Increment and Decrement) - Needs NEW endpoint /api/updateAttendanceCounts
      if (attendanceUpdateData.studentsToIncrement.length > 0 || attendanceUpdateData.studentsToDecrement.length > 0) {
           console.log("API Call: UPDATE counts via /api/updateAttendanceCounts");
           apiCalls.push(fetch("/api/updateAttendanceCounts", { // NEW endpoint
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  spreadsheetId: spreadsheetId,
                  sheetName: "Sheet1", // Sheet where counts are stored (Col C)
                  sheetId: 0, // Assuming Sheet1 has GID 0 - VERIFY THIS
                  data: attendanceUpdateData,
              }),
          }));
      } else {
           apiCalls.push(Promise.resolve({ ok: true, statusText: 'No counts to update' })); // Placeholder
      }

      // Wait for all API calls to complete
      console.log("Waiting for all API calls to complete...");
      const results = await Promise.all(apiCalls);
      console.log("API Call results:", results);

      // Check if any essential call failed
      const failedCall = results.find(res => !res.ok);
      if (failedCall) {
          // Try to get more specific error text if possible
          let errorText = failedCall.statusText || 'Unknown error';
          try {
               // Check if response has body and try parsing as JSON
               if (failedCall.body) {
                   const errorBody = await failedCall.json();
                   errorText = errorBody.message || errorText;
               }
          } catch(e) {
              console.warn("Could not parse error response body as JSON.", e);
              // If parsing fails or no body, try reading as text
              try {
                   if (failedCall.text) { // Check if text() method exists
                       const rawText = await failedCall.text();
                       console.error("Raw error response:", rawText);
                       // Don't override errorText here unless rawText is more useful
                   }
              } catch(textError) {
                   console.warn("Could not read error response body as text.", textError);
              }
          }
          throw new Error(`Failed to update attendance: ${errorText} (status ${failedCall.status})`);
      }

      // All calls appear successful
      console.log("All attendance updates successful.");
      resetState(saveChangesBtn, spinner, overlay);
      showCustomAlert(); // Show success feedback
      setTimeout(function () {
          if (modalInstance) { // Check if modalInstance exists
             modalInstance.hide(); // Hide the modal
          }
          resetModalContent(); // Clear modal content for next time
      }, 2000); // Delay to allow user to see the alert

  } catch (error) {
      console.error("Error saving attendance:", error);
      alert(`Error saving attendance: ${error.message}`); // Show specific error to user
      // Ensure UI is reset even on error
      resetState(saveChangesBtn, spinner, overlay); // Re-enable button etc.
  }
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