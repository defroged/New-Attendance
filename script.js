window.onload = function() {
    const days = document.querySelectorAll('.day');
    const currentWeekStart = new Date(); // Stores the current week's start date
    let selectedWeekStart = new Date();  // Used to track the week currently displayed

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
            // ... [rest of the displayEvents function]
        });
    }

    function goToCurrentWeek() {
        selectedWeekStart = new Date(currentWeekStart);
        updateCalendar(selectedWeekStart);
        fetchEvents();
    }

    document.getElementById('prevWeek').addEventListener('click', function() {
        selectedWeekStart.setDate(selectedWeekStart.getDate() - 7);
        updateCalendar(selectedWeekStart);
        fetchEvents();
    });

    document.getElementById('nextWeek').addEventListener('click', function() {
        selectedWeekStart.setDate(selectedWeekStart.getDate() + 7);
        updateCalendar(selectedWeekStart);
        fetchEvents();
    });

    document.getElementById('currentWeek').addEventListener('click', goToCurrentWeek);

    updateCalendar(selectedWeekStart);
    fetchEvents();
};
