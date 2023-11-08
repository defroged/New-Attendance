window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

    // Updated to use local time calculations
    function updateCalendar(weekStart) {
        const firstDayOfWeek = new Date(weekStart);
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
        for (let i = 0; i < days.length; i++) {
            const dayDate = new Date(firstDayOfWeek);
            dayDate.setDate(dayDate.getDate() + i);

            const dateDiv = days[i].querySelector('.date');
            dateDiv.innerText = dayDate.toDateString();
            days[i].setAttribute('data-date', dayDate.toISOString().split('T')[0]);
        }
    }

    // Simplified fetchEvents function
    function fetchEvents() {
        fetch(`/api/calendar-events`)
        .then(response => response.json())
        .then(data => {
            console.log('Raw event data:', data);
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

            // Assuming event.start.dateTime is in local time
            const eventStart = new Date(event.start.dateTime || event.start.date);
            const startHour = eventStart.getHours();
            const eventDateISO = eventStart.toISOString().split('T')[0];

            console.log(`Event date: ${eventDateISO}`);
            const matchingDay = Array.from(days).find(day => day.getAttribute('data-date') === eventDateISO);
            if (matchingDay) {
                console.log(`Matching day attribute: ${matchingDay.getAttribute('data-date')}`);
                const timeSlot = matchingDay.querySelector(`.time-slot[data-hour="${startHour}"]`);
                console.log(`Looking for time slot at hour: ${startHour}, found:`, timeSlot);
                if (timeSlot) {
                    timeSlot.appendChild(eventElement);
                } else {
                    console.error('No time slot found for event:', event);
                }
            }
        });
    }

    updateCalendar(currentWeekStart);
    fetchEvents();

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
};
