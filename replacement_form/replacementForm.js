const replacements = {
  added: [],
  removed: [],
};

(function() {
function fetchClassNames() {
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
  fetchClassNames();
  document.getElementById("class-select").addEventListener("change", handleClassChange);
  document.getElementById("student-select").addEventListener("change", handleStudentChange);
  document.getElementById("replacement-select").addEventListener("change", handleReplacementChange);
  document.getElementById("submit-button").addEventListener("click", handleSubmit);
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
  
  function displayAvailableSlots(availableSlots) {
  const availableSlotsElement = document.getElementById("available-slots");
  availableSlotsElement.innerHTML = `You have ${availableSlots} replacement lesson slots available`;
  availableSlotsElement.setAttribute("data-count", availableSlots);

  const stepThreeElement = document.getElementById("step-three");
  if (availableSlots > 0) {
    stepThreeElement.style.display = "block";
  } else {
    stepThreeElement.style.display = "none";
  }
}

 async function fetchBookedSlots(studentName) {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      const values = data.values;
      const rowIndex = values.findIndex((row) => row[0] === studentName);

      if (rowIndex > -1) {
        const bookedSlots = values[rowIndex].slice(6).filter((slot) => slot !== '');
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

async function handleStudentChange() {
  const studentSelect = document.getElementById("student-select");
  const studentName = studentSelect.value;
  await fetchAvailableSlots(studentName);
  await fetchAvailableClasses(studentName);
  await populateBookedSlots(studentName);

  displaySubmitSectionIfRequired();
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
  const timeMax = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000); // Three months in the future

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

function populateReplacementClassDropdown(events) {
  const replacementSelect = document.getElementById("replacement-select");

  replacementSelect.innerHTML = '<option value="" disabled selected>Please choose a replacement lesson</option>';

  events.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    const eventName = event.summary;
    const eventDate = event.start.dateTime || event.start.date;
    const formattedDate = new Date(eventDate).toLocaleDateString("en-US");
    option.textContent = `${eventName} - ${formattedDate}`;
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

  const eventData = { id: eventId, name: eventText };
  replacements.removed.push(eventData);
  window.displaySubmitSectionIfRequired();

  const availableSlots = parseInt(document.getElementById("available-slots").getAttribute("data-count"), 10) + 1;
  document.getElementById("available-slots").setAttribute("data-count", availableSlots);
  displayAvailableSlots(availableSlots);
}

async function handleSubmit() {
  const studentSelect = document.getElementById("student-select");
  const studentName = studentSelect.value;
  
  const notRemoved = (addedEvent) => !replacements.removed.some((removedEvent) => removedEvent.id === addedEvent.id);
  const newAddedReplacements = replacements.added.filter(notRemoved);
  const removedReplacements = replacements.removed.filter(notRemoved);

  await updateReplacements(studentName, newAddedReplacements);
  await Promise.all(removedReplacements.map((eventData) => updateRemovedReplacements(studentName, eventData)));

  const { updatedValues, newAvailableSlots } = await updateAvailableSlots(studentName);

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

  replacements.added = [];
  replacements.removed = [];
  document.getElementById("submit-section").style.display = "none";
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

  function findNextEmptyColumnIndex() {
    for (let i = 6; i < values[rowIndex].length; i++) {
      if (values[rowIndex][i] === "") {
        return i;
      }
    }
    return Math.max(6, values[rowIndex].length);
  }

  for (let i = 6; i < values[rowIndex].length; i++) {
    values[rowIndex][i] = "";
  }

  finalAddedReplacements.forEach((replacement) => {
    const columnIndex = findNextEmptyColumnIndex();
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

async function updateAvailableSlots(studentName) {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const values = data.values;

    let newAvailableSlots;
    const updatedValues = values.map((row) => {
      if (row[0] === studentName) {
        const notRemoved = (addedEvent) => !replacements.removed.some((removedEvent) => removedEvent.id === addedEvent.id);
        const newAddedReplacements = replacements.added.filter(notRemoved);
        const removedReplacements = replacements.removed.filter(notRemoved);
        
        newAvailableSlots = parseInt(row[2], 10) + removedReplacements.length - newAddedReplacements.length;
        row[2] = newAvailableSlots;
      }
      return row.slice(0, 3);
    });

    console.log("Student available slots updated successfully");
    return { updatedValues, newAvailableSlots };
  } catch (error) {
    console.error("Error updating student available slots:", error);
  }
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

  function findNextEmptyColumnIndex() {
    for (let i = 6; i < values[rowIndex].length; i++) {
      if (values[rowIndex][i] === "") {
        return i;
      }
    }
    return Math.max(6, values[rowIndex].length);
  }

  addedReplacements.forEach((replacement) => {
    const columnIndex = findNextEmptyColumnIndex();
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
