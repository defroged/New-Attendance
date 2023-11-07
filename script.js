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
    document.querySelectorAll('.time-slot').forEach(slot => slot.innerHTML = '');

    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');
        eventElement.innerText = event.summary;

        // Convert event start time to a Date object
        const eventStart = new Date(event.start.dateTime || event.start.date);
        
        // Adjust for time zone offset
        const userTimezoneOffset = eventStart.getTimezoneOffset() * 60000; // Offset in milliseconds
        eventStart.setTime(eventStart.getTime() - userTimezoneOffset);

        const startHour = eventStart.getHours();
        const eventDateISO = eventStart.toISOString().split('T')[0];

        days.forEach(day => {
            if (day.getAttribute('data-date') === eventDateISO) {
                const timeSlot = day.querySelector(`.time-slot[data-hour="${startHour}"]`);
                if (timeSlot) {
                    timeSlot.appendChild(eventElement);
                } else {
                    console.error('No time slot found for event:', event);
                }
            }
        });
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
