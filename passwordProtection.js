async function checkPasswordAndRevealContent(password) {
  if (!password) {
    return;
  }

  const response = await fetch('/api/checkPagePassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  if (response.status === 200) {
    document.getElementById('pageBody').style.display = 'block';
    document.getElementById('passwordPrompt').style.display = 'none';
    scrollToCurrentTime();
  } else {
    alert('Incorrect password.');
    window.location.href = 'index.html';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.onsubmit = handleSubmit;
  }
});