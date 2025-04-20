const { sheets, spreadsheetId, findStudentRowIndex, authClient } = require('./utils/googleSheets');

// Handler for POST /api/removeAbsenceDate
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST for simplicity, could be DELETE
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    // Allow POST (or DELETE if you prefer, but POST is easier with request body)
    if (req.method !== 'POST') { return res.status(405).json({ message: 'Method Not Allowed' }); }

    const { sheetId, sheetName = 'absence', data = [] } = req.body; // Expect GID

    if (!sheetId || typeof sheetId !== 'number') {
         console.error("API RemoveAbsenceDate: Missing or invalid numeric sheetId (GID) in request body.");
         return res.status(400).json({ message: 'Missing or invalid sheetId (GID).' });
    }
     if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("API RemoveAbsenceDate: No absence data provided to remove.");
        return res.status(200).json({ message: 'No absence data to remove.' });
    }

    console.log(`API RemoveAbsenceDate: Attempting to remove ${data.length} absence records from sheet "${sheetName}" (GID: ${sheetId})`);
    const requests = []; // To hold batchUpdate requests
    let recordsFoundAndCleared = 0;

    try {
        await authClient.authorize(); // Ensure authenticated

        // Since multiple removals might affect the same student, process student by student or fetch all rows first.
        // Let's process entry by entry, fetching row data each time (less efficient but simpler logic).
        // For higher efficiency, group by student, fetch rows once per student.

        for (const absenceEntry of data) {
            const { student, eventName, date } = absenceEntry; // Expect date in YYYY-MM-DD format
            if (!student || !eventName || !date) {
                console.warn("API RemoveAbsenceDate: Skipping invalid entry:", absenceEntry);
                continue;
            }

            const rowIndex = await findStudentRowIndex(student, spreadsheetId, sheetName);
            if (rowIndex === null) {
                console.warn(`API RemoveAbsenceDate: Student "${student}" not found in sheet "${sheetName}". Cannot remove absence.`);
                continue; // Skip if student not found
            }

            // Fetch the student's row data to find the matching absence record
            const rowResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!${rowIndex}:${rowIndex}`, // Get the whole row
                valueRenderOption: 'FORMATTED_VALUE' // Get strings as they appear
            });
            const rowValues = rowResponse.data.values ? rowResponse.data.values[0] : [];

            // Find the specific column index containing "eventName - date"
            const targetValue = `${eventName} - ${date}`;
            let columnIndexToRemove = -1; // 0-based index
            // Start searching from Col B (index 1)
            for (let j = 1; j < rowValues.length; j++) {
                 // Trim comparison for robustness
                 if (String(rowValues[j]).trim() === targetValue.trim()) {
                    columnIndexToRemove = j;
                    break;
                 }
            }

            // If found, add a request to clear that cell
            if (columnIndexToRemove !== -1) {
                 console.log(`API RemoveAbsenceDate: Found "${targetValue}" for "${student}" at Row ${rowIndex}, Col ${columnIndexToRemove + 1}. Adding clear request.`);
                 requests.push({
                    updateCells: {
                        range: {
                            sheetId: sheetId, // Use numeric GID
                            startRowIndex: rowIndex - 1, // 0-based for API
                            endRowIndex: rowIndex,
                            startColumnIndex: columnIndexToRemove, // 0-based for API
                            endColumnIndex: columnIndexToRemove + 1,
                        },
                        rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }], // Set empty
                        fields: "userEnteredValue",
                    },
                });
                recordsFoundAndCleared++;
            } else {
                 console.warn(`API RemoveAbsenceDate: Could not find absence record "${targetValue}" for student "${student}" in row ${rowIndex}.`);
            }
        } // End loop through data entries

        // Execute batch update if requests were generated
        if (requests.length > 0) {
            console.log(`API RemoveAbsenceDate: Executing batch update to clear ${requests.length} cells.`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests },
            });
            console.log("API RemoveAbsenceDate: Batch update successful.");
            return res.status(200).json({ message: `Attempted to remove ${data.length} records. Found and cleared ${recordsFoundAndCleared}.` });
        } else {
            console.log("API RemoveAbsenceDate: No absence records found matching the criteria to remove.");
            return res.status(200).json({ message: 'No matching absence records found to remove.' });
        }

    } catch (error) {
        console.error(`API RemoveAbsenceDate: Error processing request:`, error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Internal Server Error';
         if (!res.headersSent) {
            return res.status(500).json({ message: `Error removing absence dates: ${errorMessage}` });
        }
        console.error("API RemoveAbsenceDate: Headers already sent, cannot send error.");
    }
};