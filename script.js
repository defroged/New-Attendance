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

    function fetchEvents(weekStart) {
    const timeMin = new Date(weekStart).toISOString();
    const threeMonthsLater = new Date(weekStart);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const timeMax = threeMonthsLater.toISOString();

    fetch(`/api/calendar-events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
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
        slot.innerHTML = ''; 
    });

    events.forEach(event => {
        // Create an event element
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
        eventElement.innerText = event.summary;

        // Parse the start time of the event
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const startHour = eventStart.getHours();
        const eventDay = eventStart.getDay(); // This gets the day of the week (0 is Sunday, 1 is Monday, etc.)

        // Find the matching day and time slot
        const dayElement = days[eventDay]; // This assumes that the days NodeList is in the correct order (Sunday to Saturday)
        const timeSlot = dayElement.querySelector(`.time-slot[data-hour="${startHour}"]`);

        if (timeSlot) {
            timeSlot.appendChild(eventElement);
        } else {
            console.error('No time slot found for event:', event);
        }
    });
}


    // When you update the calendar for the current week:
updateCalendar(currentWeekStart);
fetchEvents(currentWeekStart);

// When navigating weeks:
document.getElementById('prevWeek').addEventListener('click', function() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateCalendar(currentWeekStart);
    fetchEvents(currentWeekStart);
});

document.getElementById('nextWeek').addEventListener('click', function() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateCalendar(currentWeekStart);
    fetchEvents(currentWeekStart);
});
 
};
