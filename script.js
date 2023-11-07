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
    // Now calling the serverless function instead of the Google API directly
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
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.innerHTML = ''; // Clear the previous events
    });

    // Insert new events into the correct time slots
    events.forEach(event => {
        // Create an event element
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
        eventElement.innerText = event.summary;

        // Parse the start and end times of the event
        const startTime = event.start.dateTime || event.start.date; // dateTime for specific times, date for all-day events
        const endTime = event.end.dateTime || event.end.date;

        // Convert start time to an hour and find the corresponding time slot
        const startHour = new Date(startTime).getHours();
        const timeSlot = document.querySelector(`.time-slot[data-hour="${startHour}"]`);
        if (timeSlot) {
            timeSlot.appendChild(eventElement); // Append the event to the time slot
        } else {
            console.error('No time slot found for event:', event);
        }
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
