const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const calendarId = 'ronward.english@gmail.com';
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    const timeMin = req.query.timeMin ? new Date(req.query.timeMin).toISOString() : new Date().toISOString();
    const timeMax = req.query.timeMax ? new Date(req.query.timeMax).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const fields = 'items(description,location,start,end)';
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&fields=${fields}`;

    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const calendarResponse = await fetch(url);
        if (!calendarResponse.ok) {
            throw new Error(`Failed to fetch calendar events: ${calendarResponse.statusText}`);
        }
        const calendarData = await calendarResponse.json();
        res.status(200).json(calendarData.items.map(({ description, location, start, end }) => ({
            description,
            location,
            start: start.dateTime,
            end: end.dateTime
        })));
    } catch (error) {
        console.error('Error fetching calendar event details:', error);
        res.status(500).send('Internal Server Error');
    }
};