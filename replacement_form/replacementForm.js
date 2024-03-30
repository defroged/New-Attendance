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
    const classSelect = document.getElementById("class-select");
    
    classNames.forEach((className) => {
      const option = document.createElement("option");
      option.value = className;
      option.textContent = className;
      classSelect.appendChild(option);
    });
  }
  
function initializeReplacementForm() {
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
}

async function handleStudentNameMatch(studentName) {
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
}

function displaySubmitSectionIfRequired() {
  if (replacements.added.length > 0 || replacements.removed.length > 0) {
    document.getElementById("submit-section").style.display = "block";
  } else {
    document.getElementById("submit-section").style.display = "none";
  }
}

async function handleReplacementChange() {
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
}
  
async function displayAvailableSlots(availableSlots) {
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
}

async function fetchStudentNameFromSpreadsheet(studentNameToSearch) {
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
}

 async function fetchBookedSlots(studentName) {
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
}

function generateUniqueID() {
  return Math.random().toString(36).substr(2, 9);
}

function fetchAvailableSlots(studentName) {
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
}

async function updateStudentAvailableSlots(studentName) {
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
}

async function incrementStudentAvailableSlots(studentName, count) {
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
}

async function handleStudentChange() {
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
      populateReplacementClassDropdown(events);
    })
    .catch((error) => {
      console.error('Error fetching calendar events:', error);
    });
}

async function populateReplacementClassDropdown(events) {
  const replacementSelect = document.getElementById("replacement-select");
  const structuredColumnData = await fetchStructuredColumnData();

  replacementSelect.innerHTML = '<option value="" disabled selected>選択してください</option>';

  events.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    const eventName = event.summary;
    const eventDate = event.start.dateTime || event.start.date;
    const formattedDate = new Date(eventDate).toLocaleDateString("ja-JP"); 
    const dayOfWeekIndex = new Date(eventDate).getDay();
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

    // Checking if the option value matches the structured column data
    if (structuredColumnData.includes(option.textContent)) {
      option.disabled = true;
      option.style.color = "#898989";
      option.textContent += " 満";
    }
	
    replacementSelect.appendChild(option);
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
  const bookedSlots = await fetchBookedSlots(studentName);

  const newBookedSlots = bookedSlots.filter(
    (slot) => !replacements.added.some((addedEvent) => addedEvent.name === slot)
  );

  newBookedSlots.forEach((slot) => {
    const eventId = generateUniqueID(); 
    const eventData = { id: eventId, name: slot };
    replacements.added.push(eventData);
    addReplacementToDatesList(eventData);
  });
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

  // Find the eventData from the removed list or added list to get the name and id
  const eventData = replacements.removed.find(event => event.id === eventId) || replacements.added.find(event => event.id === eventId);
  
  // Re-add the removed event option back to the dropdown
  const replacementSelect = document.getElementById("replacement-select");
  const option = document.createElement("option");
  option.value = eventData.id;
  option.textContent = eventData.name;
  replacementSelect.appendChild(option);

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

    const newAddedReplacements = replacements.added.filter((addedEvent) => !(
      replacements.removed.some((removedEvent) => removedEvent.id === addedEvent.id)
    ));

    const previouslyBookedSlots = await fetchBookedSlots(studentName);
    const finalAddedReplacements = newAddedReplacements.filter(
      (replacement) => !previouslyBookedSlots.includes(replacement.name)
    );

    const newRemovedReplacements = replacements.removed.filter((removedEvent) => !(
      newAddedReplacements.some((addedEvent) => addedEvent.id === removedEvent.id)
    ));

    await updateReplacements(studentName, finalAddedReplacements);

    const decrementCount = replacements.added.length - newRemovedReplacements.length;
    await updateStudentAvailableSlots(studentName);

    replacements.added = [];
    replacements.removed = [];
    document.getElementById("main-container").style.display = "none";
    document.getElementById("success-message").style.display = "block";
	hideSpinner();
  } catch (error) {
    console.error("Error in handleSubmit()", error);
  }
}

async function updateReplacements(studentName, finalAddedReplacements) {
  const response = await fetch(apiUrl);
  const data = await response.json();
  const values = data.values;
  const rowIndex = values.findIndex((row) => row[0] === studentName);

  if (rowIndex < 0) {
    console.error("Student not found");
    return;
  }

replacements.removed.forEach((replacement) => {
  const columnIndex = values[rowIndex].findIndex((cell) => cell === replacement.name);
  if (columnIndex >= 0) {
    values[rowIndex][columnIndex] = "";
  }
});

  finalAddedReplacements.forEach((replacement) => {
  const columnIndex = findNextEmptyColumnIndex(values, rowIndex);
  values[rowIndex][columnIndex] = replacement.name;
});

  const dataWithoutHeader = values.slice(1);

  const updateResponse = await fetch("/api/updateAttendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spreadsheetId: "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U",
      range: "Sheet1!A2:Z",
      data: dataWithoutHeader,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(
      `Failed to update Google Sheet data for added replacements: ${updateResponse.statusText}`
    );
  }
  console.log("Successfully updated Google Sheet data for added replacements");
}

function findNextEmptyColumnIndex(values, rowIndex) {
  for (let i = 6; i < values[rowIndex].length; i++) {
    if (values[rowIndex][i] === "") {
      return i;
    }
  }
  return Math.max(6, values[rowIndex].length);
}

async function updateRemovedReplacements(studentName, removedReplacement) {
  const response = await fetch(apiUrl);
  const data = await response.json();
  const values = data.values;

  const rowIndex = values.findIndex((row) => row[0] === studentName);

  if (rowIndex < 0) {
    console.error("Student not found");
    return;
  }

  const columnIndex = values[rowIndex].findIndex((cell) => cell === removedReplacement.name);
  if (columnIndex < 0) {
    console.error("Event not found");
    return;
  }

  values[rowIndex][columnIndex] = "";

  const dataWithoutHeader = values.slice(1);

  const updateResponse = await fetch("/api/updateAttendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spreadsheetId: "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U",
      range: "Sheet1!A2:Z",
      data: dataWithoutHeader,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(
      `Failed to update Google Sheet data for removed replacements: ${updateResponse.statusText}`
    );
  }

  console.log("Successfully updated Google Sheet data for removed replacements");
}


async function updateAddedReplacements(studentName, addedReplacements) {
  const response = await fetch(apiUrl);
  const data = await response.json();
  const values = data.values;
  const rowIndex = values.findIndex((row) => row[0] === studentName);

  if (rowIndex < 0) {
    console.error("Student not found");
    return;
  }

  addedReplacements.forEach((replacement) => {
    const columnIndex = findNextEmptyColumnIndex(values, rowIndex);
    values[rowIndex][columnIndex] = replacement.name;
  });

  const dataWithoutHeader = values.slice(1);

  const updateResponse = await fetch("/api/updateAttendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spreadsheetId: "1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U",
      range: "Sheet1!A2:Z",
      data: dataWithoutHeader,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(
      `Failed to update Google Sheet data for added replacements: ${updateResponse.statusText}`
    );
  }
  console.log("Successfully updated Google Sheet data for added replacements");
}

window.initializeReplacementForm = initializeReplacementForm;
  window.displaySubmitSectionIfRequired = displaySubmitSectionIfRequired;
})();