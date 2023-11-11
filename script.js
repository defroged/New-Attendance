window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();
	
	days.forEach(day => {
        const timeSlotsContainer = day.querySelector('.time-slots');
        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.classList.add('time-slot');
            timeSlot.dataset.hour = hour;
            timeSlotsContainer.appendChild(timeSlot);
        }
    });
	

    function updateCalendar(weekStart) {
        const firstDayOfWeek = new Date(weekStart);
        firstDayOfWeek.setDate(weekStart.getDate() - weekStart.getDay());

        for (let i = 0; i < days.length; i++) {
            const dayDate = new Date(firstDayOfWeek);
            dayDate.setDate(firstDayOfWeek.getDate() + i);

            const dayOfWeekDiv = days[i].querySelector('.day-of-week');
            const dateDiv = days[i].querySelector('.date');

            dayOfWeekDiv.innerText = getJapaneseDayOfWeek(dayDate.getDay());
            dateDiv.innerText = formatDate(dayDate);

            days[i].classList.remove('current-day');
            if (dayDate.toDateString() === new Date().toDateString()) {
                days[i].classList.add('current-day');
            }
        }
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    }

    function getJapaneseDayOfWeek(dayIndex) {
        const daysInJapanese = ['日', '月', '火', '水', '木', '金', '土'];
        return daysInJapanese[dayIndex];
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
