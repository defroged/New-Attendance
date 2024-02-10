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
}
  
  window.initializeReplacementForm = initializeReplacementForm;
})();

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

function handleStudentChange() {
  const studentSelect = document.getElementById("student-select");
  const studentName = studentSelect.value;

  fetchAvailableSlots(studentName);
}

function fetchAvailableSlots(studentName) {
  fetch(apiUrl)
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

function findAvailableSlotsByStudentName(studentName, data) {
  let availableSlots = 0;
  data.forEach(function (row) {
    if (row[0] === studentName) {
      availableSlots = parseInt(row[2]); // Assuming Column C stores the available slots
    }
  });
  return availableSlots;
}

function displayAvailableSlots(availableSlots) {
  const availableSlotsElement = document.getElementById("available-slots");
  availableSlotsElement.innerHTML = `You have ${availableSlots} replacement lesson slots available`;

  // Conditionally show/hide the "Choose the replacement lesson" dropdown
  const stepThreeElement = document.getElementById("step-three");
  if (availableSlots > 0) {
    stepThreeElement.style.display = "block";
  } else {
    stepThreeElement.style.display = "none";
  }
}