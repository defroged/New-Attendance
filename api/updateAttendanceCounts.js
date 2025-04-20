const { sheets, spreadsheetId, findStudentRowIndex, authClient } = require('./utils/googleSheets');

// Handler for POST /api/updateAttendanceCounts
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ message: 'Method Not Allowed' }); }

    const { sheetId = 0, sheetName = 'Sheet1', data } = req.body; // Sheet1 GID often 0, VERIFY

    if (typeof sheetId !== 'number') {
         console.error("API UpdateAttendanceCounts: Missing or invalid numeric sheetId (GID) in request body.");
         return res.status(400).json({ message: 'Missing or invalid sheetId (GID) for Sheet1.' });
    }
    if (!data || (!data.studentsToIncrement?.length && !data.studentsToDecrement?.length)) {
        console.log("API UpdateAttendanceCounts: No count updates provided.");
        return res.status(200).json({ message: 'No count updates needed.' });
    }

    const { studentsToIncrement = [], studentsToDecrement = [] } = data;
    console.log(`API UpdateAttendanceCounts: Incrementing ${studentsToIncrement.length}, Decrementing ${studentsToDecrement.length} for sheet "${sheetName}" (GID: ${sheetId})`);

    const requests = []; // To hold batchUpdate requests
    const studentUpdateMap = new Map(); // Store { student: { rowIndex, change } }

    // Consolidate changes per student
    studentsToIncrement.forEach(student => {
        const current = studentUpdateMap.get(student) || { rowIndex: null, change: 0 };
        current.change += 1;
        studentUpdateMap.set(student, current);
    });
    studentsToDecrement.forEach(student => {
        const current = studentUpdateMap.get(student) || { rowIndex: null, change: 0 };
        current.change -= 1;
        studentUpdateMap.set(student, current);
    });

    // Remove students with net zero change
    for (const [student, update] of studentUpdateMap.entries()) {
        if (update.change === 0) {
            studentUpdateMap.delete(student);
        }
    }

    if (studentUpdateMap.size === 0) {
         console.log("API UpdateAttendanceCounts: Net count change is zero for all students.");
         return res.status(200).json({ message: 'No net count updates needed.' });
    }

    try {
        await authClient.authorize(); // Ensure authenticated

        // Find row indices for all affected students efficiently
        const studentNames = Array.from(studentUpdateMap.keys());
        const studentRowPromises = studentNames.map(student =>
            findStudentRowIndex(student, spreadsheetId, sheetName).then(rowIndex => ({ student, rowIndex }))
        );
        const studentRowResults = await Promise.all(studentRowPromises);

        // Update map with row indices
        studentRowResults.forEach(({ student, rowIndex }) => {
            if (rowIndex !== null) {
                studentUpdateMap.get(student).rowIndex = rowIndex;
            } else {
                console.warn(`API UpdateAttendanceCounts: Student "${student}" not found in "${sheetName}". Cannot update count.`);
                studentUpdateMap.delete(student); // Remove if not found
            }
        });

        if (studentUpdateMap.size === 0) {
             console.log("API UpdateAttendanceCounts: No students found in sheet after lookup.");
             return res.status(200).json({ message: 'Students not found, no counts updated.' });
        }

        // Fetch current counts for students found
        const rangesToGet = Array.from(studentUpdateMap.values()).map(update => `${sheetName}!C${update.rowIndex}`); // Get Column C for each row
        const batchGetResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: rangesToGet,
        });

        // Prepare update requests based on current count + change
        let updatesPrepared = 0;
        batchGetResponse.data.valueRanges.forEach((valueRange, index) => {
            const student = studentNames[index]; // Assumes order is preserved
            const update = studentUpdateMap.get(student);
            if (!update) return; // Should not happen if map is consistent

            const currentCountStr = valueRange.values ? valueRange.values[0]?.[0] : '0';
            let currentCount = parseInt(currentCountStr, 10);
            if (isNaN(currentCount)) {
                console.warn(`API UpdateAttendanceCounts: Current count for "${student}" is not a number (${currentCountStr}). Assuming 0.`);
                currentCount = 0;
            }

            const newCount = Math.max(0, currentCount + update.change); // Calculate new count, ensure >= 0
            console.log(`API UpdateAttendanceCounts: Updating count for "${student}" Row ${update.rowIndex}: ${currentCount} -> ${newCount} (Change: ${update.change})`);

            // Add request to update the count cell (Column C = index 2)
            requests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId, // Use numeric GID (assuming 0 for Sheet1)
                        startRowIndex: update.rowIndex - 1, // 0-based for API
                        endRowIndex: update.rowIndex,
                        startColumnIndex: 2, // Column C
                        endColumnIndex: 3,
                    },
                    rows: [{ values: [{ userEnteredValue: { numberValue: newCount } }] }],
                    fields: "userEnteredValue",
                },
            });
            updatesPrepared++;
        });


        // Execute batch update if requests were generated
        if (requests.length > 0) {
            console.log(`API UpdateAttendanceCounts: Executing batch update with ${requests.length} requests.`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests },
            });
            console.log("API UpdateAttendanceCounts: Batch update successful.");
            return res.status(200).json({ message: `Successfully updated counts for ${updatesPrepared} students.` });
        } else {
            console.log("API UpdateAttendanceCounts: No valid count updates to perform after processing.");
            return res.status(200).json({ message: 'No count updates were performed.' });
        }

    } catch (error) {
        console.error(`API UpdateAttendanceCounts: Error processing request:`, error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Internal Server Error';
         if (!res.headersSent) {
            return res.status(500).json({ message: `Error updating attendance counts: ${errorMessage}` });
        }
        console.error("API UpdateAttendanceCounts: Headers already sent, cannot send error.");
    }
};