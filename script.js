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
        const apiKey = 'AIzaSyBTp54-gKed7hQWoqSxWT2vaz5vrUMQOvc';
        const calendarId = 'ronward.english@gmail.com';
        const timeMin = new Date().toISOString(); // Start from the current date
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}`;

        fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Events:', data.items);
            // TODO: Process and display the events in your calendar here
        })
        .catch(error => {
            console.error('Error fetching events:', error);
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
