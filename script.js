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

        const startTime = new Date(event.start.dateTime || event.start.date);
        const endTime = new Date(event.end.dateTime || event.end.date);

        // Format times to HH:MM format
        const formattedStartTime = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0');
        const formattedEndTime = endTime.getHours().toString().padStart(2, '0') + ':' + endTime.getMinutes().toString().padStart(2, '0');

        const timeSpan = document.createElement('div');
        timeSpan.classList.add('event-time');
        timeSpan.innerText = `${formattedStartTime}-${formattedEndTime}`;

        const titleSpan = document.createElement('div');
        titleSpan.classList.add('event-title');
        titleSpan.innerText = event.summary;

        // Append timeSpan and titleSpan to eventElement
        eventElement.appendChild(timeSpan);
        eventElement.appendChild(titleSpan);

        const startHour = startTime.getHours();
        const eventDay = startTime.getDay(); 

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
