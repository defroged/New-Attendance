window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

    function updateCalendar(weekStart) {
        const firstDayOfWeek = weekStart.getDate() - weekStart.getDay();

        for (let i = 0; i < days.length; i++) {
            const dayDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), firstDayOfWeek + i);
            days[i].innerText = dayDate.toDateString();
            days[i].classList.remove('current-day');
            if (dayDate.toDateString() === new Date().toDateString()) {
                days[i].classList.add('current-day');
            }
        }
    }

    document.getElementById('prevWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        updateCalendar(currentWeekStart);
    });

    document.getElementById('nextWeek').addEventListener('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        updateCalendar(currentWeekStart);
    });

    updateCalendar(currentWeekStart);
};
