async function checkPasswordAndRevealContent(password) {
  if (!password) {
    document.getElementById('passwordPrompt').style.display = 'block';
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