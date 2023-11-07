// This is an example using node-fetch, which you may need to install as a dependency
// You can install it by running `npm install node-fetch` in your project directory
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const calendarId = 'ronward.english@gmail.com';
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY; // The API key is stored in an environment variable
    const timeMin = new Date().toISOString(); // Start from the current date
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}`;

    try {
        const calendarResponse = await fetch(url);
        const calendarData = await calendarResponse.json();
        res.status(200).json(calendarData);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).send('Internal Server Error');
    }
};
