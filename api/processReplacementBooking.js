const { sheets, spreadsheetId, findStudentRowIndex, authClient } = require('./utils/googleSheets');

// Handler for POST /api/processReplacementBooking
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ message: 'Method Not Allowed' }); }

    const { studentName, addedReplacements = [], removedReplacements = [] } = req.body;
    const mainSheetName = 'Sheet1';
    const absenceSheetName = 'absence';
    const bookedAbsencesSheetName = 'BookedAbsencesLog'; // <-- NEW SHEET

    // Get sheet IDs (These are critical for batchUpdate range operations)
    const mainSheetId = 0; // Often 0 for the first sheet, BUT VERIFY THIS!
    const absenceSheetId = 759358030; // You provided this earlier, VERIFY THIS!
    // !!! ================================================================= !!!
    // !!! CREATE THE 'BookedAbsencesLog' SHEET AND UPDATE THIS GID          !!!
    const bookedAbsencesSheetId = 973349179; // <-- !!! USER MUST UPDATE THIS !!!
    // !!! ================================================================= !!!

    if (!studentName) {
        console.error('API ProcessReplacementBooking: Student name is required.');
        return res.status(400).json({ message: 'Student name is required.' });
    }

    console.log(`API ProcessReplacementBooking: Start for ${studentName}. Added: ${addedReplacements.length}, Removed: ${removedReplacements.length}`);

    try {
        await authClient.authorize();
        console.log("API ProcessReplacementBooking: Google API client authorized.");

        // --- 1. Find student row indices ---
        const studentRowIndexMain = await findStudentRowIndex(studentName, spreadsheetId, mainSheetName);
        const studentRowIndexAbsence = await findStudentRowIndex(studentName, spreadsheetId, absenceSheetName);

        if (studentRowIndexMain === null) {
            console.error(`API ProcessReplacementBooking: Student ${studentName} not found in ${mainSheetName}`);
            return res.status(404).json({ message: `生徒 ${studentName} が ${mainSheetName} に見つかりません。` });
        }
        console.log(`API ProcessReplacementBooking: Found ${studentName} in ${mainSheetName} at row ${studentRowIndexMain}`);
        if (studentRowIndexAbsence !== null) {
             console.log(`API ProcessReplacementBooking: Found ${studentName} in ${absenceSheetName} at row ${studentRowIndexAbsence}`);
        } else {
             console.log(`API ProcessReplacementBooking: Student ${studentName} not found in ${absenceSheetName} (may have no absence history).`);
        }


        // --- 2. Fetch current data ---
        const rangesToGet = [ `${mainSheetName}!${studentRowIndexMain}:${studentRowIndexMain}` ]; // Sheet1 row
        if (studentRowIndexAbsence !== null) {
            rangesToGet.push(`${absenceSheetName}!${studentRowIndexAbsence}:${studentRowIndexAbsence}`); // Absence row
        }
        // Fetch the *entire* log sheet to find entries
        rangesToGet.push(`${bookedAbsencesSheetName}!A:C`); // Fetch all log data
        
        const batchGetResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId, ranges: rangesToGet, valueRenderOption: 'FORMATTED_VALUE'
        });
        console.log("API ProcessReplacementBooking: Fetched current row data and booked absences log.");

        const mainSheetRowData = batchGetResponse.data.valueRanges[0]?.values?.[0] || [];
        let absenceSheetRowData = []; // Make this 'let' to update local copy
        let bookedAbsencesLogData = []; // To store {student, absenceTag, bookedClass, logRowIndex}
        let logRangeIndex = 1; // Index in batchGetResponse for the log data
        
        if (studentRowIndexAbsence !== null) {
            absenceSheetRowData = batchGetResponse.data.valueRanges[1]?.values?.[0] || [];
            logRangeIndex = 2; // Log data is at index 2 if absence sheet was present
        }
        
        // Parse the log data into a structured array
        const logValues = batchGetResponse.data.valueRanges[logRangeIndex]?.values || [];
        if (logValues.length > 0) {
             // Start from 1 to skip header, assuming header exists
            for (let i = 1; i < logValues.length; i++) {
                const row = logValues[i];
                if (row[0] && row[1] && row[2]) { // Ensure row has all 3 values
                    bookedAbsencesLogData.push({
                        student: row[0],
                        absenceTag: row[1],
                        bookedClass: row[2],
                        logRowIndex: i + 1 // 1-based index of the row in the log sheet
                    });
                }
            }
        }
        console.log(`API ProcessReplacementBooking: Parsed ${bookedAbsencesLogData.length} entries from ${bookedAbsencesSheetName}`);
        
        let currentAbsenceCount = parseInt(mainSheetRowData[2], 10);
        if (isNaN(currentAbsenceCount)) {
            console.warn(`API ProcessReplacementBooking: Count for ${studentName} is NaN (${mainSheetRowData[2]}). Assuming 0.`);
            currentAbsenceCount = 0;
        }
        console.log(`API ProcessReplacementBooking: Initial state for ${studentName}: Count=${currentAbsenceCount}`);


        // --- 3. Prepare batch update requests ---
        const requests = [];
        let netCountChange = 0;
        // The 'absenceColumnsToClear' Set is no longer needed;
        // requests are generated immediately.

// --- 3a. Process Removals (Clear slot in Sheet1 G:L, Increment Count, Move Tag from Log to Absence) ---
        let effectiveRemovals = 0;
        console.log("API ProcessReplacementBooking: Processing removals...");
        const slotsToCheck = mainSheetRowData.slice(6, 12); // G:L
        console.log(`API ProcessReplacementBooking: Current slots in Sheet G:L for ${studentName}:`, JSON.stringify(slotsToCheck));

        for (const removal of removedReplacements) {
            const classSlotToRemove = removal.name; // e.g., "2024/11/15 (Fri) 16:00"
            let colIndexInMainSheet = -1; // 0-based index in Sheet1 G:L

            console.log(`API ProcessReplacementBooking: Attempting to find removal slot: [${classSlotToRemove}]`);

            // 1. Find the booking in Sheet1 (G:L)
            for (let k = 6; k < 12; k++) { // G:L are indices 6-11
                const sheetCellValue = mainSheetRowData[k];
                if (sheetCellValue && typeof sheetCellValue === 'string' && typeof classSlotToRemove === 'string' &&
                    sheetCellValue.trim() === classSlotToRemove.trim()) {
                    colIndexInMainSheet = k;
                    console.log(`API ProcessReplacementBooking: Found match for [${classSlotToRemove}] in ${mainSheetName} at column index ${k}`);
                    break;
                }
            }

            if (colIndexInMainSheet !== -1) {
                // 2. Add request to clear the booking from Sheet1 G:L
                console.log(`API ProcessReplacementBooking: Adding request to clear ${mainSheetName} cell at Col ${colIndexInMainSheet + 1}`);
                requests.push({
                    updateCells: {
                        range: {
                            sheetId: mainSheetId,
                            startRowIndex: studentRowIndexMain - 1, // 0-based
                            endRowIndex: studentRowIndexMain,
                            startColumnIndex: colIndexInMainSheet,
                            endColumnIndex: colIndexInMainSheet + 1,
                        },
                        rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }],
                        fields: "userEnteredValue",
                    },
                });
                
                // 3. Increment count
                netCountChange += 1;
                effectiveRemovals++;
                mainSheetRowData[colIndexInMainSheet] = ""; // Update local copy for subsequent additions

                // 4. Find the corresponding entry in BookedAbsencesLog
                const logEntryIndex = bookedAbsencesLogData.findIndex(
                    entry => entry.student === studentName && entry.bookedClass.trim() === classSlotToRemove.trim()
                );

                if (logEntryIndex !== -1) {
                    const logEntry = bookedAbsencesLogData[logEntryIndex];
                    const absenceTagToRestore = logEntry.absenceTag;
                    const logRowToClear = logEntry.logRowIndex - 1; // -1 for 0-based API index
                    console.log(`API ProcessReplacementBooking: Found matching log entry for "${classSlotToRemove}" at log row ${logEntry.logRowIndex}. Tag to restore: "${absenceTagToRestore}"`);

                    // 5. Add request to CLEAR the row in BookedAbsencesLog (Cols A, B, C)
                    // We clear instead of delete to avoid shifting rows during a batch update
                    requests.push({
                        updateCells: {
                            range: {
                                sheetId: bookedAbsencesSheetId,
                                startRowIndex: logRowToClear,
                                endRowIndex: logRowToClear + 1,
                                startColumnIndex: 0, // Column A
                                endColumnIndex: 3,   // Column C
                            },
                            rows: [{ values: [
                                { userEnteredValue: { stringValue: "" } }, // Col A
                                { userEnteredValue: { stringValue: "" } }, // Col B
                                { userEnteredValue: { stringValue: "" } }  // Col C
                            ]}],
                            fields: "userEnteredValue",
                        }
                    });
                    // Remove from local log data to prevent re-use
                    bookedAbsencesLogData.splice(logEntryIndex, 1);

                    // 6. Add request to restore the absenceTag to the 'absence' sheet
                    if (studentRowIndexAbsence !== null) {
                        let restored = false;
                        // Find first empty cell in 'absence' row (starting from Col B, index 1)
                        for (let j = 1; j < 200; j++) { // Search up to ~200 columns
                            if (absenceSheetRowData[j] === undefined || absenceSheetRowData[j] === "") {
                                console.log(`API ProcessReplacementBooking: Restoring tag "${absenceTagToRestore}" to ${absenceSheetName} at row ${studentRowIndexAbsence}, col index ${j}`);
                                requests.push({
                                    updateCells: {
                                        range: {
                                            sheetId: absenceSheetId,
                                            startRowIndex: studentRowIndexAbsence - 1,
                                            endRowIndex: studentRowIndexAbsence,
                                            startColumnIndex: j,
                                            endColumnIndex: j + 1,
                                        },
                                        rows: [{ values: [{ userEnteredValue: { stringValue: absenceTagToRestore } }] }],
                                        fields: "userEnteredValue",
                                    }
                                });
                                absenceSheetRowData[j] = absenceTagToRestore; // Update local copy
                                restored = true;
                                break;
                            }
                        }
                        if (!restored) {
                            console.error(`API ProcessReplacementBooking: CRITICAL! Could not find an empty column in ${absenceSheetName} for ${studentName} to restore tag "${absenceTagToRestore}".`);
                        }
                    } else {
                         console.warn(`API ProcessReplacementBooking: Cannot restore tag "${absenceTagToRestore}" because ${studentName} was not found in ${absenceSheetName} (row index is null).`);
                    }
                } else {
                    console.error(`API ProcessReplacementBooking: CRITICAL DATA MISMATCH! Could not find booking for "${classSlotToRemove}" in ${bookedAbsencesSheetName} for student ${studentName}. Count was incremented but absence tag was not restored.`);
                }
            } else {
                console.warn(`API ProcessReplacementBooking: Match NOT found in ${mainSheetName} for removal slot [${classSlotToRemove}].`);
                console.warn(`API ProcessReplacementBooking: Searched within: ${JSON.stringify(slotsToCheck)}`);
            }
        }
        console.log(`API ProcessReplacementBooking: Removals processed. Found: ${effectiveRemovals}. Net count change: ${netCountChange}`);
		
// --- 3b. Process Additions (Check count, Move Tag from Absence to Log, Add to Sheet1 G:L) ---
        let effectiveAdditions = 0;
        console.log("API ProcessReplacementBooking: Processing additions...");
        for (const addition of addedReplacements) {
             const classSlotToAdd = addition.name; // e.g., "2024/11/15 (Fri) 16:00"
             let countBeforeThisAdd = currentAbsenceCount + netCountChange;
             console.log(`API ProcessReplacementBooking: Checking add "${classSlotToAdd}". Count before: ${countBeforeThisAdd}`);

             if (countBeforeThisAdd > 0) {
                 // 1. Find oldest absence tag
                 let oldestAbsenceDate = null;
                 let oldestAbsenceColIndex = -1; // 0-based
                 let oldestAbsenceTag = "";
                 
                 if (studentRowIndexAbsence !== null) {
                    for (let j = 1; j < absenceSheetRowData.length; j++) { // Start from Col B (index 1)
                        const cellValue = absenceSheetRowData[j];
                        if (!cellValue || typeof cellValue !== 'string' || !cellValue.includes(" - ")) continue;
                        
                        const parts = cellValue.split(" - ");
                        const dateString = parts[parts.length - 1].trim();
                        // Handle both YYYY-MM-DD and YYYY/MM/DD
                        const absenceDate = new Date(dateString.replace(/\//g, '-')); 
                        
                        if (!isNaN(absenceDate.getTime())) {
                            if (oldestAbsenceDate === null || absenceDate < oldestAbsenceDate) {
                                oldestAbsenceDate = absenceDate; 
                                oldestAbsenceColIndex = j;
                                oldestAbsenceTag = cellValue;
                            }
                        }
                    }
                 }

                 // 2. Find empty booking slot in Sheet1 G:L
                 let emptyColIndexInMainSheet = -1;
                 for(let k = 6; k < 12; k++) { // G:L are indices 6-11
                     if (mainSheetRowData[k] === undefined || mainSheetRowData[k] === "") { 
                         emptyColIndexInMainSheet = k; 
                         mainSheetRowData[k] = classSlotToAdd; // Reserve locally
                         break; 
                     } 
                 }

                 // 3. Decision logic
                 if (oldestAbsenceColIndex !== -1 && emptyColIndexInMainSheet !== -1) {
                     // Found both an absence to consume AND an empty slot for the booking
                     console.log(`API ProcessReplacementBooking: Pairing add "${classSlotToAdd}" (${mainSheetName} Col Index ${emptyColIndexInMainSheet}) with oldest absence "${oldestAbsenceTag}" (${absenceSheetName} Col Index ${oldestAbsenceColIndex})`);
                     
                     // 4. Add request to write the new booking into Sheet1 G:L
                     requests.push({
                        updateCells: {
                            range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: emptyColIndexInMainSheet, endColumnIndex: emptyColIndexInMainSheet + 1 },
                            rows: [{ values: [{ userEnteredValue: { stringValue: classSlotToAdd } }] }],
                            fields: "userEnteredValue"
                        }
                     });

                     // 5. Add request to CLEAR the consumed absence from 'absence' sheet
                     requests.push({
                         updateCells: {
                             range: {
                                 sheetId: absenceSheetId,
                                 startRowIndex: studentRowIndexAbsence - 1,
                                 endRowIndex: studentRowIndexAbsence,
                                 startColumnIndex: oldestAbsenceColIndex,
                                 endColumnIndex: oldestAbsenceColIndex + 1,
                             },
                             rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }],
                             fields: "userEnteredValue",
                         }
                     });
                     absenceSheetRowData[oldestAbsenceColIndex] = ""; // Update local copy
                     
                     // 6. Add request to APPEND a row to BookedAbsencesLog
                     requests.push({
                         appendCells: {
                             sheetId: bookedAbsencesSheetId,
                             rows: [{ values: [
                                 { userEnteredValue: { stringValue: studentName } },        // Col A
                                 { userEnteredValue: { stringValue: oldestAbsenceTag } },  // Col B
                                 { userEnteredValue: { stringValue: classSlotToAdd } }    // Col C
                             ] }],
                             fields: "userEnteredValue"
                         }
                     });
                     
                     // 7. Decrement count
                     netCountChange -= 1; 
                     effectiveAdditions++;
                     
                 } else if (emptyColIndexInMainSheet === -1) {
                     console.error(`API ProcessReplacementBooking: No empty slot (G:L) found for student ${studentName} to book "${classSlotToAdd}". Skipping this booking.`);
                 } else { // oldestAbsenceColIndex === -1
                     console.warn(`API ProcessReplacementBooking: Student ${studentName} has an available slot in G:L for "${classSlotToAdd}", but no specific usable absence record was found in the 'absence' sheet. Booking cannot be completed.`);
                 }
             } else { // countBeforeThisAdd <= 0
                 console.warn(`API ProcessReplacementBooking: Cannot add "${classSlotToAdd}", count is ${countBeforeThisAdd}.`);
             }
        } // End loop additions
        console.log(`API ProcessReplacementBooking: Additions processed. Net count change: ${netCountChange}`);


        // --- 3d. Add request to update final count ---
        const finalAbsenceCount = Math.max(0, currentAbsenceCount + netCountChange);
        console.log(`API ProcessReplacementBooking: Final count calculation: Initial=${currentAbsenceCount}, NetChange=${netCountChange}, Final=${finalAbsenceCount}`);
        if (finalAbsenceCount !== currentAbsenceCount) {
            requests.push({ updateCells: { range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: 2, endColumnIndex: 3 }, rows: [{ values: [{ userEnteredValue: { numberValue: finalAbsenceCount } }] }], fields: "userEnteredValue" } });
            console.log("API ProcessReplacementBooking: Added request to update absence count.");
        } else {
             console.log("API ProcessReplacementBooking: Absence count unchanged.");
        }

        // --- 4. Execute Batch Update ---
        if (requests.length > 0) {
            console.log(`API ProcessReplacementBooking: Executing batch update with ${requests.length} requests.`);
            await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
            console.log("API ProcessReplacementBooking: Batch update successful.");
        } else {
            console.log("API ProcessReplacementBooking: No sheet changes needed.");
        }

        // --- 5. Return Success ---
        console.log("API ProcessReplacementBooking: Processing complete.");
        return res.status(200).json({
             message: '振り替えレッスンの予約処理が正常に完了しました。',
             finalCount: finalAbsenceCount, addedCount: effectiveAdditions, removedCount: effectiveRemovals
        });

    } catch (error) {
        console.error(`API ProcessReplacementBooking: Error processing request for ${studentName}:`, error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Internal Server Error';
         if (!res.headersSent) {
            return res.status(500).json({ message: `処理エラー: ${errorMessage}` });
        }
         console.error("API ProcessReplacementBooking: Headers already sent.");
    }
};