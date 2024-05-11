async function checkPasswordAndRevealContent() {
  const passwordModal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('passwordInput');
  const submitButton = document.getElementById('submitButton');

  passwordModal.style.display = 'block';

  submitButton.onclick = async () => {
    let password = passwordInput.value;

    const response = await fetch('/api/checkPagePassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (response.status === 200) {
      document.getElementById('pageBody').style.display = 'block';
      scrollToCurrentTime();
      passwordModal.style.display = 'none';
    } else {
      alert('Incorrect password.');
      window.location.href = 'index.html';
    }
  };
}