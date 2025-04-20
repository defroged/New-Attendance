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
    // Get sheet IDs (These are critical for batchUpdate range operations)
    const mainSheetId = 0; // Often 0 for the first sheet, BUT VERIFY THIS!
    const absenceSheetId = 759358030; // You provided this earlier, VERIFY THIS!

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
        const batchGetResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId, ranges: rangesToGet, valueRenderOption: 'FORMATTED_VALUE'
        });
        console.log("API ProcessReplacementBooking: Fetched current row data.");

        const mainSheetRowData = batchGetResponse.data.valueRanges[0]?.values?.[0] || [];
        const absenceSheetRowData = (studentRowIndexAbsence !== null && batchGetResponse.data.valueRanges.length > 1)
                                    ? batchGetResponse.data.valueRanges[1]?.values?.[0] || [] : [];
        let currentAbsenceCount = parseInt(mainSheetRowData[2], 10);
        if (isNaN(currentAbsenceCount)) {
            console.warn(`API ProcessReplacementBooking: Count for ${studentName} is NaN (${mainSheetRowData[2]}). Assuming 0.`);
            currentAbsenceCount = 0;
        }
        console.log(`API ProcessReplacementBooking: Initial state for ${studentName}: Count=${currentAbsenceCount}`);


        // --- 3. Prepare batch update requests ---
        const requests = [];
        let netCountChange = 0;
        let absenceColumnsToClear = new Set(); // 0-based indices

        // --- 3a. Process Removals (Clear slot in Sheet1 G:L, Increment Count) ---
        let effectiveRemovals = 0;
        console.log("API ProcessReplacementBooking: Processing removals...");
        // Log the relevant part of the fetched row data BEFORE processing removals
        const slotsToCheck = mainSheetRowData.slice(6, 12); // Adjust range if needed (G:L)
        console.log(`API ProcessReplacementBooking: Current slots in Sheet G:L for ${studentName}:`, JSON.stringify(slotsToCheck));

        for (const removal of removedReplacements) {
            const slotNameToRemove = removal.name; // Name sent from frontend
             let colIndexToRemove = -1; // 0-based index

             // Log the string we are trying to find
             console.log(`API ProcessReplacementBooking: Attempting to find removal slot: [${slotNameToRemove}]`); // Brackets help see whitespace

             // Check columns G to L (indices 6 to 11) - Adjust range if necessary
             for (let k = 6; k < Math.min(12, mainSheetRowData.length); k++) {
                 const sheetCellValue = mainSheetRowData[k];
                 // Log the cell value being compared
                 // console.log(`API ProcessReplacementBooking: Comparing with cell[${k}] value: [${sheetCellValue}]`); // Verbose: Uncomment if needed

                 // Trim both strings before comparison to handle potential whitespace issues
                 if (sheetCellValue && typeof sheetCellValue === 'string' && typeof slotNameToRemove === 'string' &&
                     sheetCellValue.trim() === slotNameToRemove.trim())
                 {
                     colIndexToRemove = k;
                     console.log(`API ProcessReplacementBooking: Found match (using trim) for [${slotNameToRemove}] at column index ${k} (Sheet Col ${String.fromCharCode(65 + k)})`);
                     break;
                 }
             }

            if (colIndexToRemove !== -1) {
                console.log(`API ProcessReplacementBooking: Adding request to clear cell at Col ${colIndexToRemove + 1}`);
                requests.push({
                    updateCells: {
                        range: { // Range uses 0-based indices
                            sheetId: mainSheetId,
                            startRowIndex: studentRowIndexMain - 1, // API uses 0-based row index
                            endRowIndex: studentRowIndexMain,
                            startColumnIndex: colIndexToRemove,
                            endColumnIndex: colIndexToRemove + 1,
                        },
                        rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }], // Set empty string
                        fields: "userEnteredValue",
                    },
                });
                // Assumption: Removing a booked replacement INCREASES the available count
                netCountChange += 1;
                effectiveRemovals++;
                // Update local copy so subsequent additions see this slot as free
                mainSheetRowData[colIndexToRemove] = "";
            } else {
                 // Log clearly when no match is found
                 console.warn(`API ProcessReplacementBooking: Match NOT found for removal slot [${slotNameToRemove}].`);
                 // Log the data again for easier comparison in logs
                 console.warn(`API ProcessReplacementBooking: Searched within: ${JSON.stringify(slotsToCheck)}`);
            }
        }
        console.log(`API ProcessReplacementBooking: Removals processed. Found: ${effectiveRemovals}. Net count change: ${netCountChange}`);
		
        // --- 3b. Process Additions ---
        let effectiveAdditions = 0;
        console.log("API ProcessReplacementBooking: Processing additions...");
        for (const addition of addedReplacements) {
             const slotNameToAdd = addition.name;
             let countBeforeThisAdd = currentAbsenceCount + netCountChange;
             console.log(`API ProcessReplacementBooking: Checking add "${slotNameToAdd}". Count before: ${countBeforeThisAdd}`);

             if (countBeforeThisAdd > 0) {
                 // Find oldest absence
                 let oldestAbsenceDate = null;
                 let oldestAbsenceColIndex = -1;
                 if (studentRowIndexAbsence !== null) {
                    for (let j = 1; j < absenceSheetRowData.length; j++) {
                        if (absenceColumnsToClear.has(j)) continue; // Skip if already marked
                        const cellValue = absenceSheetRowData[j];
                        if (!cellValue || typeof cellValue !== 'string' || !cellValue.includes(" - ")) continue;
                        const parts = cellValue.split(" - ");
                        const dateString = parts[parts.length - 1].trim();
                        const absenceDate = new Date(dateString.replace(/\//g, '-'));
                        if (!isNaN(absenceDate.getTime())) {
                            if (oldestAbsenceDate === null || absenceDate < oldestAbsenceDate) {
                                oldestAbsenceDate = absenceDate; oldestAbsenceColIndex = j;
                            }
                        }
                    }
                 }
                 // Find empty slot G:L
                 let emptyColIndexToAdd = -1;
                 for(let k = 6; k < 12; k++) { if (mainSheetRowData[k] === undefined || mainSheetRowData[k] === "") { emptyColIndexToAdd = k; mainSheetRowData[k] = slotNameToAdd; break; } }

                 // Decision logic
                 if (oldestAbsenceColIndex !== -1 && emptyColIndexToAdd !== -1) { // Found both
                     console.log(`API ProcessReplacementBooking: Pairing add "${slotNameToAdd}" (Col ${emptyColIndexToAdd+1}) with oldest absence (Col ${oldestAbsenceColIndex+1})`);
                     absenceColumnsToClear.add(oldestAbsenceColIndex);
                     requests.push({ updateCells: { range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: emptyColIndexToAdd, endColumnIndex: emptyColIndexToAdd + 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: slotNameToAdd } }] }], fields: "userEnteredValue" } });
                     netCountChange -= 1; // Booking DECREASES available count
                     effectiveAdditions++;
                 } else if (emptyColIndexToAdd === -1) { // No slot
                      console.error(`API ProcessReplacementBooking: No empty slot (G:L) for "${slotNameToAdd}". Skipping.`);
                 } else { // Slot found, but no absence record (oldestAbsenceColIndex === -1)
                     console.warn(`API ProcessReplacementBooking: No absence record found for count>0 & slot found. Adding "${slotNameToAdd}" (Col ${emptyColIndexToAdd+1}) & decrementing count.`);
                     requests.push({ updateCells: { range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: emptyColIndexToAdd, endColumnIndex: emptyColIndexToAdd + 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: slotNameToAdd } }] }], fields: "userEnteredValue" } });
                     netCountChange -= 1; // Still decrement count if available
                     effectiveAdditions++;
                 }
             } else { // countBeforeThisAdd <= 0
                 console.warn(`API ProcessReplacementBooking: Cannot add "${slotNameToAdd}", count is ${countBeforeThisAdd}.`);
             }
        } // End loop additions
        console.log(`API ProcessReplacementBooking: Additions processed. Net count change: ${netCountChange}`);


        // --- 3c. Add requests to clear absence sheet cells ---
        if (studentRowIndexAbsence !== null && absenceColumnsToClear.size > 0) {
             console.log(`API ProcessReplacementBooking: Adding ${absenceColumnsToClear.size} requests to clear absence cells.`);
             absenceColumnsToClear.forEach(colIndex => {
                 requests.push({ updateCells: { range: { sheetId: absenceSheetId, startRowIndex: studentRowIndexAbsence - 1, endRowIndex: studentRowIndexAbsence, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }], fields: "userEnteredValue" } });
             });
        }

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