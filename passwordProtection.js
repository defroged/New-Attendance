async function checkPasswordAndRevealContent() {
  let password = prompt("Please enter the password to access the page:");
  const response = await fetch('/api/checkPagePassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  if (response.status === 200) {
    document.getElementById('pageBody').style.display = 'block';
    scrollToCurrentTime();
  } else {
    alert('Incorrect password.');
    window.location.href = 'index.html';
  }
}