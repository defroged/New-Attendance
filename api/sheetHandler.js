const fetch = require('node-fetch');
const {google} = require('googleapis');

// Initialize Google Sheets API client and authorize
const authClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({version: 'v4', auth: authClient});

async function updateAttendance(spreadsheetId, range, data) {
	console.log('Input data to updateAttendance: ', { spreadsheetId, range, data }); 
  try {
    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: [
          {
            range: range,
            values: data,
          },
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  const spreadsheetId = '1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U';
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const sheetName = 'Sheet1';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const sheetResponse = await fetch(url);
    if (!sheetResponse.ok) {
      throw new Error(`Failed to fetch Google Sheet data: ${sheetResponse.statusText}`);
    }
    const sheetData = await sheetResponse.json();
    res.status(200).json(sheetData);
  } catch (error) {
    console.error('Error fetching Google Sheet data:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports.updateAttendance = updateAttendance;