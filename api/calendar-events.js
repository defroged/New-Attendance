const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const calendarId = 'ronward.english@gmail.com';  // Ensure this is the public calendar ID
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;  // Make sure the API key is set in Vercel environment variables
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Optional: Set timeMax to limit events to the next 7 days
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Another option is to restrict the origin to your domain, for example:
    // res.setHeader('Access-Control-Allow-Origin', 'https://new-attendance.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const calendarResponse = await fetch(url);
        if (!calendarResponse.ok) {
            throw new Error(`Failed to fetch calendar events: ${calendarResponse.statusText}`);
        }
        const calendarData = await calendarResponse.json();
        res.status(200).json(calendarData);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).send('Internal Server Error');
    }
};
