window.onload = function() {
    const days = document.querySelectorAll('.day');
    let currentWeekStart = new Date();

    function updateCalendar(weekStart) {
    const days = document.querySelectorAll('.day'); // Select all day containers
    const firstDayOfWeek = new Date(weekStart); // Clone the date to avoid mutations
    firstDayOfWeek.setDate(weekStart.getDate() - weekStart.getDay()); // Set to the first day of the week

    for (let i = 0; i < days.length; i++) {
        // Calculate the date for this day of the week
        const dayDate = new Date(firstDayOfWeek);
        dayDate.setDate(firstDayOfWeek.getDate() + i);

        // Select the .date div for this day and update its content
        const dateDiv = days[i].querySelector('.date');
        dateDiv.innerText = dayDate.toDateString();

        // Clear current-day class from all days
        days[i].classList.remove('current-day');

        // If this day is today, add the current-day class
        if (dayDate.toDateString() === new Date().toDateString()) {
            days[i].classList.add('current-day');
        }

        // Now let's populate the hourly blocks
        const hours = days[i].querySelectorAll('.hour');
        for (let j = 0; j < hours.length; j++) {
            // Assuming you want to do something with these blocks
            // Otherwise, this inner loop might be unnecessary
            // For instance, you could add event listeners or dynamic content here
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
