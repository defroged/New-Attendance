window.onload = function() {
    const days = document.querySelectorAll('.day');
    const today = new Date();
    const firstDayOfWeek = today.getDate() - today.getDay();

    for (let i = 0; i < days.length; i++) {
        const dayDate = new Date(today.getFullYear(), today.getMonth(), firstDayOfWeek + i);
        days[i].innerText = dayDate.toDateString();
        if (i === today.getDay()) {
            days[i].classList.add('current-day');
        }
    }
};
