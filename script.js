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
    fetch('/api/calendar-events')
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
    document.querySelectorAll('.day').forEach(day => {
        // This query selector should be specific to event elements within the day.
        day.querySelectorAll('.event').forEach(event => event.remove());
    });

    events.forEach(event => {
        // Create the event element
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');

        // Parse the start and end times of the event
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);

        // Format the start and end times to HH:MM
        const formattedStartTime = eventStart.getHours().toString().padStart(2, '0') + ':' + eventStart.getMinutes().toString().padStart(2, '0');
        const formattedEndTime = eventEnd.getHours().toString().padStart(2, '0') + ':' + eventEnd.getMinutes().toString().padStart(2, '0');

        // Create and add the time span element
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('event-time');
        timeSpan.innerText = `${formattedStartTime}-${formattedEndTime}`;
        eventElement.appendChild(timeSpan);

        // Create and add the title span element
        const titleSpan = document.createElement('div');
        titleSpan.classList.add('event-title');
        titleSpan.innerText = event.summary;
        eventElement.appendChild(titleSpan);

        // Calculate the top offset and height based on the event's start time and duration
        const openingHour = 9; // Calendar starts at 9 AM
        const pixelsPerMinute = 2; // Define how many pixels represent one minute
        const startMinutesFromOpening = (eventStart.getHours() - openingHour) * 60 + eventStart.getMinutes();
        const eventDurationMinutes = (eventEnd - eventStart) / (1000 * 60);

        eventElement.style.position = 'absolute';
        eventElement.style.top = `${startMinutesFromOpening * pixelsPerMinute}px`;
        eventElement.style.height = `${eventDurationMinutes * pixelsPerMinute}px`;

        // Append the event to the correct day column based on the day of the week
        const eventDayIndex = eventStart.getDay(); // getDay() returns 0 for Sunday, 1 for Monday, etc.
        const dayElement = days[eventDayIndex]; // Make sure 'days' is an array of .day elements

        if (dayElement) {
            dayElement.appendChild(eventElement);
        } else {
            console.error('No day element found for the event date:', eventStart.toDateString());
        }
    });
}

    document.getElementById('prevWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateCalendar(currentWeekStart);
        fetchEvents(); 
    });

    document.getElementById('nextWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateCalendar(currentWeekStart);
        fetchEvents(); 
    });

    updateCalendar(currentWeekStart); 
    fetchEvents(); 
};
