const { google } = require('googleapis');

// Ensure environment variables are loaded (e.g., using dotenv or Vercel's env variables)
if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error("ERROR: Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.");
    // Optionally throw an error to prevent startup without credentials
    // throw new Error("Missing Google Service Account credentials in environment variables.");
} else {
    console.log("Google Service Account credentials found in environment variables.");
}


const authClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'), // Handle potential undefined key
    ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth: authClient });

const spreadsheetId = '1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U'; // Centralize spreadsheet ID

// Helper function to find student row (returns 1-based index or null)
async function findStudentRowIndex(student, currentSpreadsheetId, sheetName) {
    console.log(`findStudentRowIndex: Searching for "${student}" in sheet "${sheetName}"`);
    if (!student || !sheetName) {
        console.error("findStudentRowIndex: Missing student name or sheet name.");
        return null;
    }
    try {
        // Ensure client is authorized before making the call
        await authClient.authorize();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: currentSpreadsheetId,
            range: `${sheetName}!A:A`, // Assume names are always in Column A
        });
        const values = response.data.values;
        if (!values) {
             console.log(`findStudentRowIndex: No values found in column A of "${sheetName}".`);
             return null; // Sheet might be empty
        }
        // Start from row 2 (index 1) assuming row 1 is header
        for (let i = 1; i < values.length; i++) {
            // Check if row exists and column A exists for that row
            if (values[i] && values[i][0] !== undefined && values[i][0] !== null) {
                // Trim both student name from input and sheet for comparison robustness
                if (String(values[i][0]).trim() === String(student).trim()) {
                    const rowIndex = i + 1; // 1-based index
                    console.log(`findStudentRowIndex: Found "${student}" in "${sheetName}" at row ${rowIndex}`);
                    return rowIndex;
                }
            }
        }
        console.log(`findStudentRowIndex: "${student}" not found in column A of "${sheetName}".`);
        return null; // Student not found
    } catch (error) {
         console.error(`findStudentRowIndex: Error searching for student "${student}" in "${sheetName}":`, error.message);
         // Log more details for debugging if needed
         if (error.response?.data?.error) {
            console.error('findStudentRowIndex: Google API Error:', JSON.stringify(error.response.data.error));
         }
         return null; // Indicate failure
    }
}

module.exports = {
    authClient,
    sheets,
    spreadsheetId,
    findStudentRowIndex,
};