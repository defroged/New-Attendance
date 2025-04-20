const fetch = require('node-fetch'); // Still needed for API Key fetch

// Handler for GET /api/sheetData?sheetName=...
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET
    if (req.method !== 'GET') {
         return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const spreadsheetIdFromUtil = require('./utils/googleSheets').spreadsheetId; // Use centralized ID
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY; // API Key used for read-only access
    const sheetName = req.query.sheetName || 'Sheet1'; // Get sheetName from query param

    if (!apiKey) {
        console.error("API_KEY for Google Calendar/Sheets read is missing.");
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetIdFromUtil}/values/${sheetName}?key=${apiKey}`;

    try {
      console.log(`API: Fetching sheet data for: ${sheetName}`);
      const sheetResponse = await fetch(url);

      if (!sheetResponse.ok) {
        const errorText = await sheetResponse.text();
        console.error(`API: Failed to fetch Google Sheet data (${sheetResponse.status}) for ${sheetName}: ${errorText}`);
        // Provide slightly more info if possible
        let detail = `Status: ${sheetResponse.statusText}`;
        if (sheetResponse.status === 400) detail = "Bad Request (Check Sheet Name?)";
        if (sheetResponse.status === 403) detail = "Forbidden (Check API Key/Permissions?)";
        return res.status(sheetResponse.status).json({ message: `Failed to fetch sheet data. ${detail}` });
      }

      const sheetData = await sheetResponse.json();
      console.log(`API: Successfully fetched data for: ${sheetName}`);
      return res.status(200).json(sheetData);

    } catch (error) {
      console.error(`API: Error fetching Google Sheet data for ${sheetName}:`, error);
      if (!res.headersSent) {
         return res.status(500).json({ message: 'Internal Server Error fetching sheet data.'});
      }
      console.error("API: Headers already sent for fetchSheetData, cannot send error response.");
      // No return needed here as headersSent check prevents further action
    }
};