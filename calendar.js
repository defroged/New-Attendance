window.onload = function() {
     const days = document.querySelectorAll('.day');
    const today = new Date();
    let currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
	
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
    const weekStartDate = new Date(currentWeekStart);
    weekStartDate.setHours(0, 0, 0, 0);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);

    const timeMin = encodeURIComponent(weekStartDate.toISOString());
    const timeMax = encodeURIComponent(weekEndDate.toISOString());
    
    fetch(`/api/calendar-events?timeMin=${timeMin}&timeMax=${timeMax}`)
        .then(response => response.json())
        .then(data => {
            displayEvents(data.items);
        })
        .catch(error => {
            console.error('Error fetching events:', error);
        });
}

function displayEvents(events) {
    // First, clear any existing events from the slots to prevent duplicates
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.innerHTML = ''; // Clear existing events
    });

    // Iterate over each event to create and display its element
    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');

        // Creating and appending the time element
        const timeElement = document.createElement('div');
        timeElement.classList.add('event-time');
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        const startTime = eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = eventEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        timeElement.innerText = `${startTime} - ${endTime}`;
        eventElement.appendChild(timeElement);

        // Creating and appending the summary element
        const summaryElement = document.createElement('div');
        summaryElement.classList.add('event-summary');
        summaryElement.innerText = event.summary;
        eventElement.appendChild(summaryElement);

        // Optional: Adding replacement student info, if available
        if (event.replacementStudents) {
            const replacementsElement = document.createElement('div');
            replacementsElement.classList.add('replacements');
            replacementsElement.innerText = 'Replacements: ' + event.replacementStudents.join(', ');
            eventElement.appendChild(replacementsElement);
        }

        // Function to find the correct day and time slot for this event and display it
        function displayEventForDay(eventStart, eventEnd, eventElement) {
            const startHour = eventStart.getHours();
            const eventDay = eventStart.getDay();
            const dayElement = days[eventDay];
            const timeSlot = dayElement.querySelector(`.time-slot[data-hour="${startHour}"]`);

            if (timeSlot) {
                const clonedEventElement = eventElement.cloneNode(true);
                clonedEventElement.addEventListener('click', function(e) {
                    e.stopPropagation(); // Stop the event from bubbling up to clear the active state
                    document.querySelectorAll('.event').forEach(ev => ev.classList.remove('event-active'));
                    this.classList.add('event-active'); // Add active class to the clicked event
                });
                timeSlot.appendChild(clonedEventElement);
            } else {
                console.error('No time slot found for event:', event);
            }
        }

        // Display the event for each day it spans
        while (eventStart < eventEnd) {
            displayEventForDay(eventStart, eventEnd, eventElement);
            eventStart.setDate(eventStart.getDate() + 1); // Move to the next day
            eventStart.setHours(0, 0, 0, 0); // Reset hours to start of the day
        }
    });

    // Add a listener to the document to clear the active class when clicking anywhere else
    document.addEventListener('click', function() {
        document.querySelectorAll('.event').forEach(event => {
            event.classList.remove('event-active');
        });
    }, { once: true }); // Execute the listener once and remove it
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

	document.getElementById('resetWeek').addEventListener('click', function() {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - currentDay);

    currentWeekStart = startOfWeek;
    updateCalendar(currentWeekStart);
    fetchEvents();
});
	
    updateCalendar(currentWeekStart); 
    fetchEvents(); 
};