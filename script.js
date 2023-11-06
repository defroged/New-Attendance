// Import the calendar CSS and JS from the installed node_modules
import 'tui-calendar/dist/tui-calendar.css';
import Calendar from 'tui-calendar';

// If you use the default popups, import the default theme CSS
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';

// Create the calendar instance
var calendar = new Calendar('#calendar', {
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

// Assuming your project is set up to transpile or handle module imports,
// this script should work when included in your HTML file and served in a browser.
