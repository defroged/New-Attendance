const apiUrl = 'https://new-attendance.vercel.app/api/sheetData';
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

function fetchClassReplacements() {
    return new Promise((resolve, reject) => {
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                const replacements = {};
                data.values.forEach(row => {
                    for (let i = 6; i <= 11; i++) {
                        if (row[i]) {
                            const studentInfo = row[i].split(' - ');
                            const replacementDateStr = parseDateFromReplacementText(row[i]);
                            if (replacementDateStr) {
                                if (!replacements[replacementDateStr]) {
                                    replacements[replacementDateStr] = [];
                                }
                                replacements[replacementDateStr].push(studentInfo[0]);
                            }
                        }
                    }
                });
                resolve(replacements);
            })
            .catch(error => {
                console.error("Error fetching class replacements:", error);
                reject(error);
            });
    });
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
            fetchClassReplacements()
                .then(replacements => {
                    displayEvents(data.items, replacements);
                })
                .catch(error => {
                    console.error('Error fetching replacements:', error);
                });
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

    const timeElement = document.createElement('div');
    timeElement.classList.add('event-time');

    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    const startTime = eventStart.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const endTime = eventEnd.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    timeElement.innerText = `${startTime}-${endTime}`;
    eventElement.appendChild(timeElement);

    const summaryElement = document.createElement('div');
    summaryElement.classList.add('event-summary');
    summaryElement.innerText = event.summary;
    eventElement.appendChild(summaryElement);

    function displayEventForDay(eventStart, eventEnd, eventElement, replacements) {
    const startHour = eventStart.getHours();
    const eventDay = eventStart.getDay();
    const dayElement = days[eventDay];
    const timeSlot = dayElement.querySelector(
        `.time-slot[data-hour="${startHour}"]`
    );

    if (timeSlot) {
      const clonedEventElement = eventElement.cloneNode(true);
      if (replacements && replacements.length > 0) {
        const replacementText = ` (${replacements.join(', ')} replacement)`;
        const eventSummaryElement = clonedEventElement.querySelector('.event-summary');
        eventSummaryElement.innerText += replacementText;
      }
      clonedEventElement.addEventListener('click', function () {
        const date = new Date(eventStart);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const strippedDate = date.toISOString().slice(0, 10);
        fetchClassDetails(event.summary, strippedDate);
      });
      timeSlot.appendChild(clonedEventElement);
    } else {
      console.error('No time slot found for event:', event);
    }
}

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (eventStart < eventEnd) {
    if (eventStart >= today) {
        const eventDateStr = eventStart.toISOString().slice(0, 10);
        const replacementsForEvent = replacements[eventDateStr] || [];
        displayEventForDay(eventStart, eventEnd, eventElement, replacementsForEvent);
    }
    eventStart.setDate(eventStart.getDate() + 1);
    eventStart.setHours(0, 0, 0, 0);
}
eventElement.addEventListener('click', function () {
    const date = new Date(eventStart);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const strippedDate = date.toISOString().slice(0, 10);
    fetchClassDetails(event.summary, strippedDate);
});
});  
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
