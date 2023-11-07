window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

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

    function fetchEvents() {
        const apiKey = 'AIzaSyBTp54-gKed7hQWoqSxWT2vaz5vrUMQOvc';
        const calendarId = 'ronward.english@gmail.com';
        const timeMin = new Date(currentWeekStart).toISOString(); // Start of the current week
    const timeMax = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 7).toISOString(); // End of the current week

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
        displayEvents(data.items);
    })
    .catch(error => {
        console.error('Error fetching events:', error);
    });
}

function displayEvents(events) {
    // Clear previous events
    document.querySelectorAll('.events').forEach(eventContainer => {
        eventContainer.innerHTML = '';
    });

    // Insert new events into the calendar
    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
        eventElement.innerText = event.summary; // Use the summary as the content of the event

        // Parse the start date of the event
        const eventStartDate = event.start.dateTime || event.start.date; // Use dateTime for timed events and date for all-day events
        const eventDate = new Date(eventStartDate);
        const eventDay = eventDate.toDateString();

        // Find the matching day container
        days.forEach(day => {
            const dayDate = day.querySelector('.date').innerText;
            if (new Date(dayDate).toDateString() === eventDay) {
                day.querySelector('.events').appendChild(eventElement);
            }
        });
    });
}

    document.getElementById('prevWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateCalendar(currentWeekStart);
        fetchEvents(); // You may want to fetch events for this new week
    });

    document.getElementById('nextWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateCalendar(currentWeekStart);
        fetchEvents(); // You may want to fetch events for this new week
    });

    updateCalendar(currentWeekStart); // Initialize the calendar
    fetchEvents(); // Fetch events for the current week
};
