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
    // Clear existing events
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.innerHTML = ''; 
    });

    // Loop over each event and create its element
    events.forEach(event => {
        // Create the event element and add 'event' class
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');

        // Extract the start and end times
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);

        // Format the start and end times into HH:MM format
        const formattedStartTime = eventStart.getHours().toString().padStart(2, '0') + ':' + eventStart.getMinutes().toString().padStart(2, '0');
        const formattedEndTime = eventEnd.getHours().toString().padStart(2, '0') + ':' + eventEnd.getMinutes().toString().padStart(2, '0');

        // Create and style the time span
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('event-time');
        timeSpan.innerText = `${formattedStartTime}-${formattedEndTime}`;

        // Create and style the title span
        const titleSpan = document.createElement('div');
        titleSpan.classList.add('event-title');
        titleSpan.innerText = event.summary;

        // Append timeSpan and titleSpan to the eventElement
        eventElement.appendChild(timeSpan);
        eventElement.appendChild(titleSpan);

        // Calculate the top offset and height for the event
        const startHour = eventStart.getHours();
        const startMinutes = eventStart.getMinutes();
        const endHour = eventEnd.getHours();
        const endMinutes = eventEnd.getMinutes();
        const topOffset = (startHour * 60) + startMinutes; // This assumes 1 minute = 1px.
        const eventDuration = ((endHour - startHour) * 60) + (endMinutes - startMinutes);

        // Set style to position the event at the calculated offset
        eventElement.style.position = 'absolute';
        eventElement.style.top = `${topOffset}px`;
        eventElement.style.height = `${eventDuration}px`; // Height based on event duration

        // Find the corresponding day column and time slot
        const eventDay = eventStart.getDay();
        const dayElement = days[eventDay];

        // If you're not using full-day time slots, find the specific time slot
        // const timeSlot = dayElement.querySelector(`.time-slot[data-hour="${startHour}"]`);

        // If dayElement itself is the time slot container
        if (dayElement) {
            dayElement.appendChild(eventElement);
        } else {
            console.error('No day column found for event:', event);
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
