// No import statements needed, as the necessary scripts and styles are loaded via CDN in your HTML file.

// Create the calendar instance
var calendar = new tui.Calendar('#calendar', {
  defaultView: 'week', // You can also set this to 'day' or 'month'
  taskView: true,  // Enable the task view
  scheduleView: true,  // Enable the schedule view
  useCreationPopup: true,
  useDetailPopup: true
});

// To see if the calendar is rendered properly, let's create a dummy event.
calendar.createSchedules([
  {
    id: '1',
    calendarId: '1',
    title: 'My Schedule',
    category: 'time',
    dueDateClass: '',
    start: '2023-10-18T22:30:00+09:00',
    end: '2023-10-19T02:30:00+09:00'
  }
]);

// The rest of your script here...
