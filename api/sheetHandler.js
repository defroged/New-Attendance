const fetch = require('node-fetch');
const {google} = require('googleapis');

console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL);
console.log('GOOGLE_PRIVATE_KEY:', JSON.stringify(process.env.GOOGLE_PRIVATE_KEY));

const authClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({version: 'v4', auth: authClient});

async function updateAttendance(spreadsheetId, range, data) {
  data = data || [];

const stringData = data.map(row => {
  if (!Array.isArray(row)) {
    console.error('Unexpected data format:', row);
    return [];
  }
  return row.map(value => String(value));
});

  console.log('Input data to updateAttendance:', {spreadsheetId, range, stringData});
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



async function findStudentRowIndex(student, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  const values = response.data.values;
  for (let i = 1; i < values.length; i++) {
    if (values[i] && student === values[i][0]) {
      return i + 1;
    }
  }
  return null;
}

//new - update to write to one cell
async function updateAbsenceDates(spreadsheetId, sheetId, sheetName, absenceData) {
  const requests = [];
  for (const absenceEntry of absenceData) {
    const student = absenceEntry.student;
    const rowIndex = await findStudentRowIndex(student, spreadsheetId, sheetName);
    if (rowIndex === null) {
      console.warn(`Student not found: ${student}`);
      continue;
    }

    // Concatenate the eventName and date with a separator (e.g., " - ")
    const classInfo = `${absenceEntry.eventName} - ${absenceEntry.date}`;

    requests.push({
      updateCells: {
        range: {
          sheetId: sheetId, // Use the sheetId parameter instead of a hardcoded value
          startRowIndex: rowIndex - 1,
          endRowIndex: rowIndex,
          startColumnIndex: 1, // Assuming you want to write to the second column (index 1)
          endColumnIndex: 2, // Only need to increase this by 1 as we are writing to a single cell
        },
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  stringValue: classInfo, // Use the concatenated classInfo as the value
                },
              },
              // Remove the second cell value since we're combining the data into one cell
            ],
          },
        ],
        fields: "userEnteredValue",
      },
    });
  }

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });

  return response.data;
}


module.exports = {
  fetchSheetData: async (req, res) => {
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
  },
  updateAttendance,
  updateAbsenceDates,
};