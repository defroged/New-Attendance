window.onload = function() {
    // Define the days of the calendar
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

    // Function to update the calendar display
    function updateCalendar(weekStart) {
        const firstDayOfWeek = new Date(weekStart);
        firstDayOfWeek.setDate(weekStart.getDate() - weekStart.getDay());
        for (let i = 0; i < days.length; i++) {
            const dayDate = new Date(firstDayOfWeek);
            dayDate.setDate(firstDayOfWeek.getDate() + i);

            const dateDiv = days[i].querySelector('.date');
            dateDiv.innerText = dayDate.toDateString();

            days[i].classList.remove('current-day');
            if (dayDate.toDateString() === new Date().toDateString()) {
                days[i].classList.add('current-day');
            }
        }
    }

    // Function to handle the OAuth 2.0 redirect and extract the access token
    function handleAuthRedirect() {
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            if (accessToken) {
                console.log('Access Token:', accessToken);
                document.getElementById('authorize_button').style.display = 'none';
                fetchEvents(accessToken); // Fetch events after getting the access token
            }
        } else {
            document.getElementById('authorize_button').style.display = 'block';
        }
    }

    // Attach the click event to the authorization button
    document.getElementById('authorize_button').onclick = function() {
        const client_id = '995403920982-a2hj9cvj8ngmk91q5pr22eo05gfsmc0d.apps.googleusercontent.com';
        const redirect_uri = 'https://new-attendance.vercel.app/oauth2callback';
        const scope = 'https://www.googleapis.com/auth/calendar.events.readonly';
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=token&scope=${scope}`;

        window.location = url;
    };

    // Function to fetch events from Google Calendar
    function fetchEvents(accessToken) {
        const calendarId = 'primary';
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

        fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Events:', data.items);
            // TODO: Process and display the events in your calendar here
        })
        .catch(error => {
            console.error('Error fetching events:', error);
        });
    }

    // Event listeners for navigating weeks
    document.getElementById('prevWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateCalendar(currentWeekStart);
    });

    document.getElementById('nextWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateCalendar(currentWeekStart);
    });

    // Call the function to check for OAuth redirection
    handleAuthRedirect();

    // Initialize the calendar display for the current week
    updateCalendar(currentWeekStart);
};
