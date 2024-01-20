const fetch = require('node-fetch');
const {google} = require('googleapis');

const authClient = new google.auth.JWT(
  'your-google-client-email@developer.gserviceaccount.com',
  null,
  `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNEzrsw5r6yGkP\nEiN/atPMt9xV4JPoqA0u7mQhCehgs1htqhsqAd6uSdh+uGOvPi2WVSAg+t8sfT5Q\ng/pRU33DMAo94YC+/E9yWGXvRqKvz9Xp0Ty3sZl30ybAb9PcB2c6J2yFUi3tIODI\ntGWetkTW7NcuANAE+mvIcyJ26+EVIhzna1OMiSgiNoz2h6gKZoaRuI7kE0xHrYMP\nF4fUgJRGf2aPRYIwXiCTvaskVVDsmjlzwQGEzGaKs2DlcgJNWLEx5gGKfNhjNQK5\nyHK30iZ9tVBrcidoNncM2QvgEitdj7v19sjXWGYWTW60VPlCkGvawQIWIDw9S3D6\ndXl7QoYVAgMBAAECggEAJMp96Eshazt4KaWB69KRA+m6ZEfBkVxQ3SoUmZ7K60pR\no38Al5U1S4RhDD7tV1uq1w0XkgMf9b3UZ6J9zohRiCp+s+JYdCsU37k/NGGyPyNk\nx6lroLMCiu49Rgnp8s/7M4IuJG79YUzkNu2yS3p8uChOZGjt6O66VoBdXwNrYpxk\n+r/z2h0EmHmQ4PnJsjUXnPu9TRCZwNeeJDXXaQnIHm7D9625y02lvqScWVc5zEt5\nZzkVQfCt083JxV6bG35KYKqKjH4d9G5707kM6qFNHofrL2dcrPuETu55ntiswqSa\npyC7dBjwQhuUKCXeMERr7YvDN2PBmhc7c6fQkNTdQQKBgQD9ot94qHLkqf9WK2F4\nmZiSGEjbXhNdyXPKgsDssmlUQGDfKgf8G/ZVx+1DOm9Rcy0uBpsG7KrJc7/PxcZ5\nmq48Ta/ba6rCLxFbTRwUvFEwEolLUoCZ2xqOVyBIJwwaI3UW7REPf+QDLa73SqY6\n0QEAtngINf4MZ3Ux54jMRzAFYQKBgQDO/H/0JYeRRBClUGjDsgUv3Ad6HIVc0d7c\ncf4xVtJYTrE6miU0Gjsn4bihLbiCq0q289EVxxvQ6+RjpYvMwlsS5shUlX4brbkR\nYURJnAtySnIgFt/DK+MKp9XGwM0d5ywiEu/3cWDN7HGbjTdU5PendF/HJrZgWYD9\n8QG6AMEJNQKBgQCEtN1cEjbbMZ8phNUg9qx/dDlaneRgI/FzueobblXyASUuXp2C\n6VaAF3Uqwb5QzYSMGmSuwNGzSd7IZWCta6NSZgtnMPRNWbcpIDVbHBUWo/w17tre\npWdFpox7dAK/AmJXNn7Ar1er2hE7zlEfYQ+3QcGX+jgMYW1OSSioSW70wQKBgDL9\nr0PlLvWRcAxZt8VmCLMWoFzrw8rvBNkH2BgtjFom4LBQIxQn1iToDYTfb5H5Qsm5\nXOvhhi+8vSHzOXJy+t64LefwgAWvkWT/skP0BjncryrKl8tL9327hQWWn7FbLtsi\nES3DJ5bzRbWNX3ExivUczS+RkOJBim6EvekloGh1AoGAL9Rzp7ZrssN9LnkvbcVX\nKB2+EzrZEAETou5PEbXSZFEaXRR22lvhEYBlxkfh7W3FpkCEcL5U7Z1nMaO1WGvg\nfWkJAU6kWkEEbADkFlTiIsR720ytVjX8On7zy9hpYXpwrvEVVOUPTtOViprYARj4\n9V7DHvaB+ckGAPIse9Nxhjg=\n-----END PRIVATE KEY-----\n`,
  ['https://www.googleapis.com/auth/spreadsheets']
);


const sheets = google.sheets({version: 'v4', auth: authClient});

async function updateAttendance(spreadsheetId, range, data) {
  // Check if data is undefined and set it to an empty array if necessary 2
  data = data || [];

  // Convert all values to strings
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
            values: stringData, // Use the converted stringData
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