window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

    function updateCalendar(weekStart) {
    const firstDayOfWeek = new Date(weekStart);
    firstDayOfWeek.setUTCHours(0, 0, 0, 0);
    firstDayOfWeek.setUTCDate(firstDayOfWeek.getUTCDate() - firstDayOfWeek.getUTCDay());

    for (let i = 0; i < days.length; i++) {
        const dayDate = new Date(firstDayOfWeek);
        dayDate.setUTCDate(firstDayOfWeek.getUTCDate() + i);

        const dateDiv = days[i].querySelector('.date');
        dateDiv.innerText = dayDate.toUTCString().slice(0, 16); // Format to a more readable form
        days[i].setAttribute('data-date', dayDate.toISOString().split('T')[0]); // Set ISO date without time

    }
}



    function fetchEvents(weekStart) {
    // Adjust weekStart to the beginning of the day in Japan time zone
    weekStart.setHours(0 - (weekStart.getTimezoneOffset() / 60) + 9, 0, 0, 0);
    const timeMin = weekStart.toISOString();

    // Calculate three months later in Japan time zone
    const threeMonthsLater = new Date(weekStart);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const timeMax = threeMonthsLater.toISOString();

    fetch(`/api/calendar-events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
    .then(response => response.json())
    .then(data => {
        // Log the raw data from the API
        console.log('Raw event data:', data);

        // Check if the items array exists and log its contents
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach((event, index) => {
                console.log(`Event ${index}:`, event);
                console.log('Start time:', event.start.dateTime || event.start.date);
                console.log('End time:', event.end.dateTime || event.end.date);
            });
        }

        displayEvents(data.items);
    })
    .catch(error => {
        console.error('Error fetching events:', error);
    });
}



function displayEvents(events) {
    // Clear previous events
    document.querySelectorAll('.time-slot').forEach(slot => slot.innerHTML = '');

    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
        eventElement.innerText = event.summary;

        // Parse the event start time directly without timezone adjustment
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const startHour = eventStart.getHours(); // This should already be in JST
        const eventDateISO = event.start.dateTime.split('T')[0]; // Extract the date part

        // Find the .day element that matches the event date
        const matchingDay = Array.from(days).find(day => day.getAttribute('data-date') === eventDateISO);
        if (matchingDay) {
            const timeSlot = matchingDay.querySelector(`.time-slot[data-hour="${startHour}"]`);
            if (timeSlot) {
                timeSlot.appendChild(eventElement);
            } else {
                console.error('No time slot found for event:', event);
            }
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
