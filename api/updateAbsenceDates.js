const { sheets, spreadsheetId, findStudentRowIndex, authClient } = require('./utils/googleSheets');

// Handler for POST /api/updateAbsenceDates
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ message: 'Method Not Allowed' }); }

    // sheetId (GID) is needed for batchUpdate ranges, sheetName for reading/finding rows
    const { sheetId, sheetName = 'absence', data = [] } = req.body; // Expect GID in request

    if (!sheetId || typeof sheetId !== 'number') {
         console.error("API UpdateAbsenceDates: Missing or invalid numeric sheetId (GID) in request body.");
         return res.status(400).json({ message: 'Missing or invalid sheetId (GID).' });
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("API UpdateAbsenceDates: No absence data provided to add.");
        return res.status(200).json({ message: 'No absence data to add.' }); // Not really an error
    }

    console.log(`API UpdateAbsenceDates: Attempting to add ${data.length} absence records to sheet "${sheetName}" (GID: ${sheetId})`);
    const requests = []; // To hold batchUpdate requests

    try {
        await authClient.authorize(); // Ensure authenticated

        for (const absenceEntry of data) {
            const { student, eventName, date } = absenceEntry;
            if (!student || !eventName || !date) {
                console.warn("API UpdateAbsenceDates: Skipping invalid entry:", absenceEntry);
                continue;
            }

            const rowIndex = await findStudentRowIndex(student, spreadsheetId, sheetName);
            if (rowIndex === null) {
                console.warn(`API UpdateAbsenceDates: Student "${student}" not found in sheet "${sheetName}". Cannot add absence.`);
                continue; // Skip if student not found
            }

            // Find the first empty column for this student's row
            // We need to read the row first to find the next available column
            const rowResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!${rowIndex}:${rowIndex}`, // Get the whole row
            });
            // Find first empty column index (0-based), starting check after name (Col B = index 1)
            const rowValues = rowResponse.data.values ? rowResponse.data.values[0] : [];
            let emptyColumnIndex = 1; // Start checking from column B
            while (rowValues[emptyColumnIndex] !== undefined && rowValues[emptyColumnIndex] !== '') {
                emptyColumnIndex++;
            }

            const classInfo = `${eventName} - ${date}`; // Format: "ClassName - YYYY-MM-DD"
            console.log(`API UpdateAbsenceDates: Adding "${classInfo}" for "${student}" at Row ${rowIndex}, Col Index ${emptyColumnIndex} (Col ${String.fromCharCode(65 + emptyColumnIndex)})`);

            // Add request to update the specific cell
            requests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId, // Use numeric GID
                        startRowIndex: rowIndex - 1, // 0-based for API
                        endRowIndex: rowIndex,
                        startColumnIndex: emptyColumnIndex, // 0-based for API
                        endColumnIndex: emptyColumnIndex + 1,
                    },
                    rows: [{ values: [{ userEnteredValue: { stringValue: classInfo } }] }],
                    fields: "userEnteredValue",
                },
            });
        } // End loop through data entries

        // Execute batch update if requests were generated
        if (requests.length > 0) {
            console.log(`API UpdateAbsenceDates: Executing batch update with ${requests.length} requests.`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests },
            });
            console.log("API UpdateAbsenceDates: Batch update successful.");
            return res.status(200).json({ message: `Successfully added ${requests.length} absence records.` });
        } else {
            console.log("API UpdateAbsenceDates: No valid absence records to add after processing.");
            return res.status(200).json({ message: 'No valid absence records were added.' });
        }

    } catch (error) {
        console.error(`API UpdateAbsenceDates: Error processing request:`, error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Internal Server Error';
        if (!res.headersSent) {
            return res.status(500).json({ message: `Error adding absence dates: ${errorMessage}` });
        }
         console.error("API UpdateAbsenceDates: Headers already sent, cannot send error.");
    }
};