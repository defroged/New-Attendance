// Fetch the distinct class names from the Google Spreadsheet
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
        for (const row of data.values) {
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
  }
  
  // Add this line to ensure the function is added to the global scope properly.
  window.initializeReplacementForm = initializeReplacementForm;
})();