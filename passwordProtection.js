async function checkPasswordAndRevealContent() {
  document.getElementById("pageBody").style.display = "none";
  let passwordModal = createPasswordModal();
  let passwordInput = passwordModal.querySelector("#passwordInput");
  let submitPassword = passwordModal.querySelector("#submitPassword");

  // Add event listener for the Submit button
  submitPassword.addEventListener("click", async () => {
    const password = passwordInput.value;
    const response = await fetch("/api/checkPagePassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (response.status === 200) {
      document.getElementById("pageBody").style.display = "block";
      scrollToCurrentTime();
      // Hide the modal after successful login
      passwordModal.style.display = "none";
      passwordModal.remove();
    } else {
      alert("Incorrect password.");
      window.location.href = "index.html";
    }
  });
}

function createPasswordModal() {
  const modal = document.createElement("div");
  const modalContent = document.createElement("div");
  const title = document.createElement("h4");
  const input = document.createElement("input");
  const button = document.createElement("button");

  // Set ID and class for the elements
  modal.id = "passwordModal";
  modal.className = "modal";
  input.id = "passwordInput";
  button.id = "submitPassword";

  // Set up the properties and attributes for input and button
  input.type = "number";
  input.placeholder = "Password";
  button.textContent = "Submit";

  // Set up CSS for the modal and its content
  Object.assign(modal.style, {
    display: "block",
    position: "fixed",
    zIndex: 1,
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    overflow: "auto",
    backgroundColor: "rgba(0,0,0,0.4)",
  });

  Object.assign(modalContent.style, {
    backgroundColor: "#fefefe",
    margin: "15% auto",
    padding: "20px",
    border: "1px solid #888",
    width: "80%",
  });

  // Assemble the modal
  modalContent.appendChild(title);
  modalContent.appendChild(input);
  modalContent.appendChild(button);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  return modal;
}