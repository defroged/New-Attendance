const replacements = {
  added: [],
  removed: [],
};

(function() {
	
function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}

function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

async function fetchStructuredColumnData() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    const columnData = values.slice(1).map((row) => {
      return row.slice(6, 12);  
    });

    const filteredData = columnData.flat().filter(cell => {
      const kanjiPattern = /[日月火水木金土]/; 
      return kanjiPattern.test(cell);
    });

    console.log(filteredData);
    return filteredData;
  } catch (error) {
    console.error("Error fetching structured column data:", error);
  }
}

function fetchClassNames() {
	showSpinner();
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const classSet = new Set();
      
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        classSet.add(row[1]);
      }

      populateClassNames(Array.from(classSet)); 
    })
    .catch((error) => {
      console.error('Error fetching class names:', error);
    })
	 .finally(() => {
      hideSpinner();
	  });
}
  
  function populateClassNames(classNames) {
	  showSpinner();
    const classSelect = document.getElementById("class-select");
    
    classNames.forEach((className) => {
      const option = document.createElement("option");
      option.value = className;
      option.textContent = className;
      classSelect.appendChild(option);
    });
	hideSpinner();
  }
  
function initializeReplacementForm() {
	showSpinner();
  document.getElementById("main-container").style.display = "none";
  fetchClassNames();
  document.getElementById("password-input").addEventListener("input", handlePasswordInputChange); 
  document.getElementById("step-one").style.display = "none"; 
  document.getElementById("login-button").addEventListener("click", handleLogin); 
  document.getElementById("class-select").addEventListener("change", handleClassChange);
  document.getElementById("student-select").addEventListener("change", handleStudentChange);
  document.getElementById("replacement-select").addEventListener("change", handleReplacementChange);
  document.getElementById("submit-button").addEventListener("click", handleSubmit);
   fetchStructuredColumnData(); 
   hideSpinner();
}

function handlePasswordInputChange() {
  const passwordInput = document.getElementById("password-input");
  const loginButton = document.getElementById("login-button");
  if (passwordInput.value.length === 4) {
    loginButton.style.display = 'block'; 
    loginButton.disabled = false; 
  } else {
    loginButton.style.display = 'none'; 
    loginButton.disabled = true; 
  }
}

async function fetchStudentNameByPassword(password) {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    for (let i = 0; i < values.length; i++) {
      if (values[i][12] === password.toString()) { 
        return values[i][0];
      }
    }
  } catch (error) {
    console.error('Error fetching student name by password:', error);
  }

  return null;
}

async function handleLogin() {
	showSpinner(); 
  document.getElementById("main-container").style.display = "none";
  const passwordInput = document.getElementById("password-input");
  const password = passwordInput.value;

  const studentName = await fetchStudentNameByPassword(password);

  if (studentName) {
    await handleStudentNameMatch(studentName);
  } else {
    alert("ID番号が違います。再度ご入力お願いします。");
    passwordInput.value = "";
    passwordInput.focus();
  }
hideSpinner();
}

async function handleStudentNameMatch(studentName) {
	showSpinner();
  document.getElementById("main-container").style.display = "block";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("step-one").style.display = "none";
  document.getElementById("step-two").style.display = "none";
  document.getElementById("step-three").style.display = "block";
  document.getElementById("replacement-list").style.display = "block";

  const studentSelect = document.getElementById("student-select");
  const matchedOption = Array.from(studentSelect.options).find(option => option.value === studentName);

  if (matchedOption) {
    matchedOption.selected = true;
  } else {
    const option = document.createElement("option");
    option.value = studentName;
    option.textContent = studentName;
    studentSelect.appendChild(option);
    studentSelect.value = studentName;
  }

  await handleStudentChange();
  
  
  const availableSlots = parseInt(document.getElementById("available-slots").getAttribute("data-count"), 10);
  displayAvailableSlots(availableSlots);
  hideSpinner();
}

function displaySubmitSectionIfRequired() {
	showSpinner();
  if (replacements.added.length > 0 || replacements.removed.length > 0) {
    document.getElementById("submit-section").style.display = "block";
  } else {
    document.getElementById("submit-section").style.display = "none";
  }
  hideSpinner();
}

async function handleReplacementChange() {
	showSpinner();
  const replacementSelect = document.getElementById("replacement-select");
  const eventId = replacementSelect.value;
  const selectedOption = replacementSelect.options[replacementSelect.selectedIndex];
  const eventData = {
    id: eventId,
    name: selectedOption.textContent
  };

  if (eventId) {
    replacements.added.push(eventData);
    displaySubmitSectionIfRequired();
    
    addReplacementToDatesList(eventData);
    selectedOption.remove();

    const availableSlots = parseInt(document.getElementById("available-slots").getAttribute("data-count"), 10) - 1;

    document.getElementById("available-slots").setAttribute("data-count", availableSlots);
    displayAvailableSlots(availableSlots);
  }
  hideSpinner();
}
  
async function displayAvailableSlots(availableSlots) {
	showSpinner();
  const studentSelect = document.getElementById("student-select");
  const studentNameToSearch = studentSelect.value;

  let studentName = await fetchStudentNameFromSpreadsheet(studentNameToSearch);

  if (!studentName) {
     console.error("Student name not found. Please check the spreadsheet.");
  }

  const availableSlotsElement = document.getElementById("available-slots");
  availableSlotsElement.innerHTML = `${studentName}の予約可能な振り替えレッスンは${availableSlots.toString().bold()}枠が残っています`;
  availableSlotsElement.setAttribute("data-count", availableSlots);

  const stepThreeElement = document.getElementById("step-three");
  if (availableSlots > 0) {
    stepThreeElement.style.display = "block";
  } else {
    stepThreeElement.style.display = "none";
  }
  hideSpinner();
}

async function fetchStudentNameFromSpreadsheet(studentNameToSearch) {
	showSpinner();
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === studentNameToSearch) { 
        return values[i][0]; 
      }
    }

    return null; 
  } catch (error) {
    console.error('Error fetching student name from spreadsheet:', error);
    return null;
  }
  hideSpinner();
}

 async function fetchBookedSlots(studentName) {
	 showSpinner();
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    const rowIndex = values.findIndex((row) => row[0] === studentName);

    if (rowIndex > -1) {
      const bookedSlots = values[rowIndex].slice(6, 12).filter((slot) => slot !== '');
      return bookedSlots;
    }
  } catch (error) {
    console.error('Error fetching booked slots: ', error);
  }

  return [];
  hideSpinner();
}

function generateUniqueID() {
  return Math.random().toString(36).substr(2, 9);
}

function fetchAvailableSlots(studentName) {
	showSpinner();
  return fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const availableSlots = findAvailableSlotsByStudentName(studentName, data.values);
      displayAvailableSlots(availableSlots);
    })
    .catch((error) => {
      console.error('Error fetching available slots:', error);
    });
	hideSpinner();
}

async function updateStudentAvailableSlots(studentName) {
	showSpinner();
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    const rowIndex = values.findIndex((row) => row[0] === studentName);

    if (rowIndex < 0) {
      console.error("Student not found");
      return;
    }

    const availableSlots = parseInt(document.getElementById("available-slots").getAttribute("data-count"), 10);

    const updatedValues = values.map((row) => {
      if (row[0] === studentName) {
        row[2] = availableSlots;
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

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Google Sheet data: ${updateResponse.statusText}`);
    }

  } catch (error) {
    console.error("Error updating student available slots:", error);
  }
  hideSpinner();
}

async function incrementStudentAvailableSlots(studentName, count) {
	showSpinner();
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    const updatedValues = values.map((row) => {
      if (row[0] === studentName) {
        row[2] = parseInt(row[2], 10) + count;
      }
      return row.slice(0, 3);
    });
console.log("Starting to increment slots", {
    studentName,
    count,
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

    if (!updateResponse.ok) {
      throw new Error(`Failed to update Google Sheet data: ${updateResponse.statusText}`);
    }

    console.log("Student available slots incremented successfully");
  } catch (error) {
    console.error("Error incrementing student available slots:", error);
  }
  hideSpinner();
}

async function handleStudentChange() {
	showSpinner()
  const studentSelect = document.getElementById("student-select");
  const studentName = studentSelect.value;

  await fetchAvailableSlots(studentName);
  await fetchAvailableClasses(studentName);
  await populateBookedSlots(studentName);
  displaySubmitSectionIfRequired();

  const replacementList = document.getElementById("replacement-list");
  if (studentName) {
    replacementList.style.display = "block"; 
  } else {
    replacementList.style.display = "none"; 
  }
  hideSpinner();
}

function populateStudentNames(students) {
  const studentSelect = document.getElementById("student-select");

  studentSelect.innerHTML = '<option value="" disabled selected>Please select a student</option>';

  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student;
    option.textContent = student;
    studentSelect.appendChild(option);
  });
}

function handleClassChange() {
  const classSelect = document.getElementById("class-select");
  const className = classSelect.value;
  

  fetchStudentNames(className);
  
  document.getElementById("step-two").style.display = "block";
}

function fetchStudentNames(className) {
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const students = findStudentsByClassName(className, data.values);
      populateStudentNames(students);
    })
    .catch((error) => {
      console.error('Error fetching student names:', error);
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

function findAvailableSlotsByStudentName(studentName, data) {
  let availableSlots = 0;
  data.forEach(function (row) {
    if (row[0] === studentName) {
      availableSlots = parseInt(row[2]); 
    }
  });
  return availableSlots;
}

function fetchAvailableClasses(studentName) {
  return fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const classes = findAvailableClassesByStudentName(studentName, data.values);
      fetchCalendarEventsForClasses(classes);
    })
    .catch((error) => {
      console.error('Error fetching available classes:', error);
    });
}

function findAvailableClassesByStudentName(studentName, data) {
    let availableClasses = [];
    data.forEach(function (row) {
      if (row[0] === studentName) {
        if (row[3]) availableClasses.push(row[3]); 
        if (row[4]) availableClasses.push(row[4]); 
        if (row[5]) availableClasses.push(row[5]); 
      }
    });
    return availableClasses;
}

function fetchCalendarEventsForClasses(classes) {
  const timeMin = new Date();
  const timeMax = new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000);

  const encodedTimeMin = encodeURIComponent(timeMin.toISOString());
  const encodedTimeMax = encodeURIComponent(timeMax.toISOString());

  fetch(`/api/calendar-events?timeMin=${encodedTimeMin}&timeMax=${encodedTimeMax}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const events = filterEventsByClassNames(data.items, classes);
	  console.log("Events being passed to populateReplacementClassDropdown:", events);
      populateReplacementClassDropdown(events);
    })
    .catch((error) => {
      console.error('Error fetching calendar events:', error);
    });
}

async function populateReplacementClassDropdown(events) {
  const replacementSelect = document.getElementById("replacement-select");
  const structuredColumnData = await fetchStructuredColumnData();
  
    console.log("Structured Column Data:", structuredColumnData); // Log the structured data fetched

  replacementSelect.innerHTML = '<option value="">選択してください</option>';

  const currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  currentDate.setHours(0, 0, 0, 0);

  events.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    const eventName = event.summary;
    const eventDate = new Date(new Date(event.start.dateTime || event.start.date).toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    eventDate.setHours(0, 0, 0, 0);
    
    const formattedDate = eventDate.toLocaleDateString("ja-JP"); 
    const dayOfWeekIndex = eventDate.getDay();
    const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeekKanji = daysOfWeek[dayOfWeekIndex]; 

    let eventTime = "";
    if (event.start.dateTime) {
        const formattedTime = new Date(event.start.dateTime).toLocaleTimeString("ja-JP", { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        eventTime = ` ${formattedTime}`; 
    }

    option.textContent = `${eventName} - ${formattedDate} (${dayOfWeekKanji}) ${eventTime}`;

 // Log each event before any filtering
    console.log("Processing Event:", {
      eventName,
      formattedDate,
      eventTime,
      optionText: option.textContent,
    });


    if (!eventName.startsWith("Ladybug")) {
        if (structuredColumnData.includes(option.textContent)) {
            option.disabled = true;
            option.style.color = "#898989";
            option.textContent += " 満";
			            console.log(`Event "${option.textContent}" disabled because it exists in structuredColumnData.`);
        }
    }

if (eventDate > currentDate) {
      replacementSelect.appendChild(option);
      console.log(`Event "${option.textContent}" added to dropdown.`);
    } else {
      console.log(`Event "${option.textContent}" not added because it is not a future event.`);
    }
  });
}

function filterEventsByClassNames(events, classNames) {
  const filteredEvents = events.filter((event) => {
    const eventName = event.summary;
    return classNames.some((className) => eventName.includes(className));
  });

  return filteredEvents;
}

async function populateBookedSlots(studentName) {
  console.log("Populating booked slots for:", studentName);
  // Clear the existing list before populating (important if student changes)
  const replacementDatesList = document.getElementById("replacement-dates");
  replacementDatesList.innerHTML = ''; // Clear previous student's list

  // Also reset the session tracking arrays when student changes or data reloads
  // This ensures actions for a previous student don't affect the current one.
  // NOTE: Resetting here might clear selections if user changes student then back again without submitting.
  // Consider if this reset is desired or if state should persist differently. For now, let's reset.
  console.log("Resetting local replacement tracking arrays.");
  replacements.added = [];
  replacements.removed = [];
  // Hide submit button initially when populating
  document.getElementById("submit-section").style.display = "none";


  const bookedSlots = await fetchBookedSlots(studentName); // Fetch currently booked slots from Sheet1 G:L
  console.log("Fetched booked slots:", bookedSlots);

  // Directly iterate over the fetched booked slots and display them.
  // Do NOT add them to replacements.added.
  bookedSlots.forEach((slot) => {
    if (slot && typeof slot === 'string') { // Ensure slot is valid before processing
        const eventId = generateUniqueID(); // Generate an ID for UI interaction tracking
        const eventData = { id: eventId, name: slot };
        // This function just adds the item to the visual list with an 'X' button
        addReplacementToDatesList(eventData);
        console.log(`Displayed booked slot: "${slot}" with UI ID: ${eventId}`);
    } else {
        console.warn("Skipping invalid/empty booked slot value:", slot);
    }
  });

  // Initial state: no submit button needed unless user interacts
  // displaySubmitSectionIfRequired(); // Might not be needed here anymore if reset above
}

function addReplacementToDatesList(eventData) {
  const listElement = document.createElement("li");
  listElement.setAttribute("id", `replacement-date-${eventData.id}`);
  
  const dateTextElement = document.createElement("span");
  dateTextElement.textContent = eventData.name;
  
  const removeButton = document.createElement("button");
  removeButton.textContent = "X";
  removeButton.className = "remove-replacement-button";
  removeButton.addEventListener("click", () => removeReplacement(eventData.id));
  
  listElement.appendChild(dateTextElement);
  listElement.appendChild(removeButton);
  
  const replacementDatesList = document.getElementById("replacement-dates");
  replacementDatesList.appendChild(listElement);
}

async function removeReplacement(eventId) {
  const listElementToRemove = document.getElementById(`replacement-date-${eventId}`);
  const eventText = listElementToRemove.firstElementChild.textContent;
  listElementToRemove.remove();

  const eventData = { id: eventId, name: eventText };
  replacements.removed.push(eventData);
  window.displaySubmitSectionIfRequired();

  const availableSlots = parseInt(document.getElementById("available-slots").getAttribute("data-count"), 10) + 1;
  document.getElementById("available-slots").setAttribute("data-count", availableSlots);
  displayAvailableSlots(availableSlots);
}

async function handleSubmit() {
  try {
    showSpinner();
    const studentSelect = document.getElementById("student-select");
    const studentName = studentSelect.value;

    if (!studentName) {
        alert("生徒を選択してください。"); // Please select a student.
        hideSpinner();
        return;
    }

    // --- Calculate net changes for THIS session ---
    // Slots added in this session and not immediately removed during the session
    const finalAddedReplacements = replacements.added.filter((addedEvent) =>
      !replacements.removed.some((removedEvent) => removedEvent.id === addedEvent.id)
    );

    // Slots that were removed during this session (could be previously booked or added earlier in session)
    const finalRemovedReplacements = replacements.removed.filter((removedEvent) =>
      !replacements.added.some((addedEvent) => addedEvent.id === removedEvent.id)
    );

    console.log("Submitting Replacements:", { studentName, finalAddedReplacements, finalRemovedReplacements });

    // --- Call the new dedicated backend endpoint ---
    const processResponse = await fetch("/api/processReplacementBooking", { // NEW ENDPOINT
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentName: studentName,
        addedReplacements: finalAddedReplacements, // Send details of slots to add {id, name}
        removedReplacements: finalRemovedReplacements, // Send details of slots to remove {id, name}
      }),
    });

    // Check if the backend request was successful
    if (!processResponse.ok) {
        // Attempt to get error message from backend response body
        let errorMsg = `振り替えレッスンの予約処理に失敗しました: ${processResponse.statusText}`; // Failed to process replacement booking
        try {
            const errorData = await processResponse.json();
            errorMsg = errorData.message || errorMsg; // Use backend message if available
        } catch (e) {
            // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMsg); // Throw an error to be caught below
    }

    // --- Backend handled the update, now reset frontend state ---
    const resultData = await processResponse.json();
    console.log("Backend processing result:", resultData);

    replacements.added = []; // Clear local tracking arrays
    replacements.removed = [];

    // Clear the displayed list of selected/booked replacements
    const replacementDatesList = document.getElementById("replacement-dates");
    replacementDatesList.innerHTML = '';

    // Hide form sections and show success message
    document.getElementById("submit-section").style.display = "none";
    document.getElementById("main-container").style.display = "none";
    document.getElementById("success-message").style.display = "block"; // Show confirmation

  } catch (error) {
    // Catch errors from fetch or thrown above
    console.error("Error in handleSubmit:", error);
    alert(`エラーが発生しました: ${error.message}`); // An error occurred: [message]
    // Consider leaving the submit button enabled or offering a retry option here
  } finally {
       hideSpinner(); // Ensure spinner is always hidden afterwards
  }
}

function findNextEmptyColumnIndex(values, rowIndex) {
  for (let i = 6; i < values[rowIndex].length; i++) {
    if (values[rowIndex][i] === "") {
      return i;
    }
  }
  return Math.max(6, values[rowIndex].length);
}

window.initializeReplacementForm = initializeReplacementForm;
  window.displaySubmitSectionIfRequired = displaySubmitSectionIfRequired;
})();