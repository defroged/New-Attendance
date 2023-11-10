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
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.innerHTML = ''; 
    });

    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');

        // Create a time element
        const timeElement = document.createElement('div');
        timeElement.classList.add('event-time');

        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        // Format the start and end time in HH:MM format
        const startTime = eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = eventEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        // Set the time text
        timeElement.innerText = `${startTime}-${endTime}`;
        
        // Append the time element to the event element
        eventElement.appendChild(timeElement);

        // Create a summary element
        const summaryElement = document.createElement('div');
        summaryElement.classList.add('event-summary');
        summaryElement.innerText = event.summary;

        // Append the summary to the event element
        eventElement.appendChild(summaryElement);

        const startHour = eventStart.getHours();
        const eventDay = eventStart.getDay(); 

        const dayElement = days[eventDay]; 
        const timeSlot = dayElement.querySelector(`.time-slot[data-hour="${startHour}"]`);

        if (timeSlot) {
            timeSlot.appendChild(eventElement);
        } else {
            console.error('No time slot found for event:', event);
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
