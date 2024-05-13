window.scrollToCurrentTime = undefined;

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

function scrollToCurrentTime() {
  const today = new Date();
  const currentWeekdayIndex = today.getDay();

  const currentDayElement = days[currentWeekdayIndex];
  if (!currentDayElement) {
    return;
  }

  const currentHourIndex = today.getHours();
  const timeSlotsContainer = currentDayElement.querySelector('.time-slots');
  const timeSlot = currentDayElement.querySelector(`.time-slot[data-hour="${currentHourIndex}"]`);

  if (timeSlot) {
    timeSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const scrollWidth = timeSlotsContainer.scrollWidth;
    const containerWidth = timeSlotsContainer.clientWidth;
    const adjustedScroll = Math.max(0, (scrollWidth / 2) - (containerWidth / 2) - 300);

    timeSlotsContainer.scrollLeft = adjustedScroll;
  }
}

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

function addEventSlotClickListener() {
    const eventSlots = document.querySelectorAll('.event');

    eventSlots.forEach(slot => {
        slot.addEventListener('click', function (e) {
            e.stopPropagation();
            eventSlots.forEach(s => s.style.backgroundColor = '');
            slot.style.backgroundColor = '#ffcc00';
        });
    });

    document.addEventListener('click', function () {
        eventSlots.forEach(slot => {
            slot.style.backgroundColor = '';
        });
    });
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
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.innerHTML = '';
    });

    events.forEach(event => {
        console.log(event); 
        const eventElement = document.createElement('div');
        eventElement.classList.add('event');

        const timeElement = document.createElement('div');
        timeElement.classList.add('event-time');

        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);

        const startTime = eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTime = eventEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        // Display event time range
        timeElement.innerText = `${startTime}-${endTime}`;
        eventElement.appendChild(timeElement);

        const summaryElement = document.createElement('div');
        summaryElement.classList.add('event-summary');
        summaryElement.innerText = event.summary;
        eventElement.appendChild(summaryElement);

        if (event.replacementStudents) {
            const replacementsElement = document.createElement('div');
            replacementsElement.classList.add('replacements');
            replacementsElement.innerText = 'Replacements: ' + event.replacementStudents.join(', ');
            eventElement.appendChild(replacementsElement);
        }

        function displayEventForDay(eventStart, eventEnd, eventElement) {
            const startHour = eventStart.getHours();
            const eventDay = eventStart.getDay();
            const dayElement = days[eventDay];
            const timeSlot = dayElement.querySelector(`.time-slot[data-hour="${startHour}"]`);

            if (timeSlot) {
                const clonedEventElement = eventElement.cloneNode(true);
                clonedEventElement.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const eventDateString = eventStart.toISOString().substring(0, 10);
                    fetchClassDetails(event.summary, eventDateString, event.id, event.location, event.description);
                });
                timeSlot.appendChild(clonedEventElement);
            } else {
                console.error('No time slot found for event:', event);
            }
        } 

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        while (eventStart < eventEnd) {
            displayEventForDay(eventStart, eventEnd, eventElement);
            eventStart.setDate(eventStart.getDate() + 1);
            eventStart.setHours(0, 0, 0, 0);
        }

        eventElement.addEventListener('click', function () {
            const eventDateString = eventStart.toISOString();
            fetchClassDetails(event.summary, eventDateString, event.id, event.location, event.description);
        });
    });

    addEventSlotClickListener(); 
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
window.scrollToCurrentTime = scrollToCurrentTime;	
	scrollToCurrentTime();
	
};

(async function initPage() {
  document.getElementById('passwordPrompt').style.display = 'block';
  document.getElementById('pageBody').style.display = 'none';
  await checkPasswordAndRevealContent();
})();