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

async function updateAbsenceDates(spreadsheetId, sheetId, sheetName, absenceData) {
  const requests = [];
  for (const absenceEntry of absenceData) {
    const student = absenceEntry.student;
    const rowIndex = await findStudentRowIndex(student, spreadsheetId, sheetName);
    if (rowIndex === null) {
      console.warn(`Student not found: ${student}`);
      continue;
    }
    const rowResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${rowIndex}:${rowIndex}`,
    });
    const rowValues = rowResponse.data.values[0] || [];
    const emptyColumnIndex = rowValues.length;
    const classInfo = `${absenceEntry.eventName} - ${absenceEntry.date}`;
    requests.push({
      updateCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex - 1,
          endRowIndex: rowIndex,
          startColumnIndex: emptyColumnIndex, 
          endColumnIndex: emptyColumnIndex + 1,
        },
        rows: [
          {
            values: [
              {
                userEnteredValue: {
                  stringValue: classInfo,
                },
              },
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

// sheetHandler.js (Modified - Added processReplacementBookingHandler and updated exports)

// +++ NEW Endpoint Handler +++
async function processReplacementBookingHandler(req, res) {
    // Allow CORS for development/testing if needed - adjust origin for production
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific frontend domain like 'https://your-frontend-domain.com'
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST and OPTIONS
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        console.log("Responding to OPTIONS request for /api/processReplacementBooking");
        return res.status(200).end();
    }

    // Only allow POST method for actual processing
    if (req.method !== 'POST') {
         console.log(`Method Not Allowed: ${req.method}`);
         return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- Start actual POST processing ---
    const { studentName, addedReplacements = [], removedReplacements = [] } = req.body;
    const spreadsheetId = '1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U';
    const mainSheetName = 'Sheet1';
    const absenceSheetName = 'absence';
    // Get sheet IDs (These are critical for batchUpdate range operations)
    // Find these IDs from your Google Sheet URL (gid=...) or via API discovery
    const mainSheetId = 0; // Often 0 for the first sheet, BUT VERIFY THIS!
    const absenceSheetId = 759358030; // You provided this earlier, VERIFY THIS!

    if (!studentName) {
        console.error('processReplacementBookingHandler: Student name is required.');
        return res.status(400).json({ message: 'Student name is required.' });
    }

    console.log(`PROCESS_REPLACEMENT_BOOKING: Start for ${studentName}. Added: ${addedReplacements.length}, Removed: ${removedReplacements.length}`);

    try {
        // Ensure the Google API client is authorized
        // Depending on how authClient is managed (singleton?), this might be automatic
        // or you might need an explicit check/refresh mechanism if tokens expire.
        // For JWT, it should handle token refresh internally if set up correctly.
        await authClient.authorize(); // Good practice to ensure it's ready
        console.log("PROCESS_REPLACEMENT_BOOKING: Google API client authorized.");

        // --- 1. Find student row indices in both sheets ---
        // Make sure findStudentRowIndex handles sheets potentially being empty or student not found gracefully
        const studentRowIndexMain = await findStudentRowIndex(studentName, spreadsheetId, mainSheetName);
        const studentRowIndexAbsence = await findStudentRowIndex(studentName, spreadsheetId, absenceSheetName);

        if (studentRowIndexMain === null) {
            console.error(`PROCESS_REPLACEMENT_BOOKING: Student ${studentName} not found in ${mainSheetName}`);
            return res.status(404).json({ message: `生徒 ${studentName} が ${mainSheetName} に見つかりません。` }); // Student not found in Sheet1
        }
        console.log(`PROCESS_REPLACEMENT_BOOKING: Found ${studentName} in ${mainSheetName} at row ${studentRowIndexMain}`);
        if (studentRowIndexAbsence !== null) {
             console.log(`PROCESS_REPLACEMENT_BOOKING: Found ${studentName} in ${absenceSheetName} at row ${studentRowIndexAbsence}`);
        } else {
             console.log(`PROCESS_REPLACEMENT_BOOKING: Student ${studentName} not found in ${absenceSheetName} (may have no absence history).`);
        }

        // --- 2. Fetch current data using batchGet for efficiency ---
        const rangesToGet = [
            `${mainSheetName}!${studentRowIndexMain}:${studentRowIndexMain}`, // Get Sheet1 row (adjust range A:Z if needed)
        ];
        if (studentRowIndexAbsence !== null) {
            // Get a wide range to catch all possible absence entries
            rangesToGet.push(`${absenceSheetName}!${studentRowIndexAbsence}:${studentRowIndexAbsence}`);
        }

        const batchGetResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: rangesToGet,
            valueRenderOption: 'FORMATTED_VALUE', // Get dates/times as strings seen in sheet
            dateTimeRenderOption: 'FORMATTED_STRING' // Match display format
        });
        console.log("PROCESS_REPLACEMENT_BOOKING: Fetched current row data.");

        // Safely access fetched data
        const mainSheetRowData = batchGetResponse.data.valueRanges[0]?.values?.[0] || [];
        const absenceSheetRowData = (studentRowIndexAbsence !== null && batchGetResponse.data.valueRanges.length > 1)
                                    ? batchGetResponse.data.valueRanges[1]?.values?.[0] || [] : [];

        let currentAbsenceCount = parseInt(mainSheetRowData[2], 10); // Column C (index 2)
        if (isNaN(currentAbsenceCount)) {
            console.warn(`PROCESS_REPLACEMENT_BOOKING: Absence count for ${studentName} (${mainSheetRowData[2]}) is not a number. Assuming 0.`);
            currentAbsenceCount = 0;
        }
        console.log(`PROCESS_REPLACEMENT_BOOKING: Initial state for ${studentName}: Count=${currentAbsenceCount}`);

        // --- 3. Prepare batch update requests array ---
        const requests = []; // Holds all sheet modification requests
        let netCountChange = 0; // Tracks net change to apply to absence count
        let absenceColumnsToClear = new Set(); // Stores 0-based column indices in 'absence' sheet to clear

        // --- 3a. Process Removals (Clear slot in Sheet1 G:L, Increment Count) ---
        let effectiveRemovals = 0;
        console.log("PROCESS_REPLACEMENT_BOOKING: Processing removals...");
        for (const removal of removedReplacements) {
            const slotNameToRemove = removal.name;
             let colIndexToRemove = -1; // 0-based index
             // Check columns G to L (indices 6 to 11) - Adjust range if necessary
             for (let k = 6; k < Math.min(12, mainSheetRowData.length); k++) {
                 if (mainSheetRowData[k] === slotNameToRemove) {
                     colIndexToRemove = k;
                     break;
                 }
             }

            if (colIndexToRemove !== -1) {
                console.log(`PROCESS_REPLACEMENT_BOOKING: Marking slot for removal: "${slotNameToRemove}" at Col ${colIndexToRemove + 1}`);
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
                 console.warn(`PROCESS_REPLACEMENT_BOOKING: Could not find booked slot to remove: "${slotNameToRemove}"`);
            }
        }
        console.log(`PROCESS_REPLACEMENT_BOOKING: Removals processed. Net count change: ${netCountChange}`);

        // --- 3b. Process Additions (Find/Clear Oldest Absence, Add Slot G:L, Decrement Count) ---
        let effectiveAdditions = 0;
        console.log("PROCESS_REPLACEMENT_BOOKING: Processing additions...");
        for (const addition of addedReplacements) {
             const slotNameToAdd = addition.name;
             let countBeforeThisAdd = currentAbsenceCount + netCountChange; // Current calculated count

             console.log(`PROCESS_REPLACEMENT_BOOKING: Checking addition "${slotNameToAdd}". Count before add: ${countBeforeThisAdd}`);

             if (countBeforeThisAdd > 0) {
                 // --- Find oldest valid absence in the absence sheet data ---
                 let oldestAbsenceDate = null;
                 let oldestAbsenceColIndex = -1; // 0-based index

                 if (studentRowIndexAbsence !== null) {
                    // Iterate columns B onwards (index 1)
                    for (let j = 1; j < absenceSheetRowData.length; j++) {
                        // Skip if column already marked for clearing by a previous addition in this batch
                        if (absenceColumnsToClear.has(j)) {
                             continue;
                         }
                        const cellValue = absenceSheetRowData[j];
                        // Basic validation: exists, is string, contains separator
                        if (!cellValue || typeof cellValue !== 'string' || !cellValue.includes(" - ")) {
                             continue;
                         }
                         const parts = cellValue.split(" - ");
                         const dateString = parts[parts.length - 1].trim();
                         // Attempt to parse the date (handle YYYY-MM-DD or YYYY/MM/DD)
                         const absenceDate = new Date(dateString.replace(/\//g, '-'));

                         if (!isNaN(absenceDate.getTime())) { // Check if valid date
                             if (oldestAbsenceDate === null || absenceDate < oldestAbsenceDate) {
                                 oldestAbsenceDate = absenceDate;
                                 oldestAbsenceColIndex = j; // Store 0-based index
                             }
                         } else {
                              console.warn(`PROCESS_REPLACEMENT_BOOKING: Invalid date format in absence sheet: "${cellValue}" at Col ${j+1}`);
                         }
                    }
                 }
                 // --- End Find oldest absence ---

                 // --- Find empty slot in Sheet1 G:L to add the replacement ---
                 let emptyColIndexToAdd = -1; // 0-based index
                 // Check columns G to L (indices 6 to 11) - Adjust if necessary
                 for(let k = 6; k < 12; k++) {
                      // Check if the slot is empty or undefined in the current row data (already considering removals)
                      if (mainSheetRowData[k] === undefined || mainSheetRowData[k] === "") {
                          emptyColIndexToAdd = k;
                          mainSheetRowData[k] = slotNameToAdd; // Reserve the slot in local copy
                          break;
                      }
                 }

                 // --- Decision Logic ---
                 if (oldestAbsenceColIndex !== -1 && emptyColIndexToAdd !== -1) {
                     // **** HAPPY PATH: Found absence and slot ****
                     console.log(`PROCESS_REPLACEMENT_BOOKING: Pairing addition "${slotNameToAdd}" (Col ${emptyColIndexToAdd+1}) with oldest absence (Date: ${oldestAbsenceDate.toISOString().slice(0,10)}, Col Index: ${oldestAbsenceColIndex})`);
                     absenceColumnsToClear.add(oldestAbsenceColIndex); // Mark absence for clearing
                     requests.push({ // Add replacement to G:L slot
                        updateCells: {
                            range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: emptyColIndexToAdd, endColumnIndex: emptyColIndexToAdd + 1 },
                            rows: [{ values: [{ userEnteredValue: { stringValue: slotNameToAdd } }] }],
                            fields: "userEnteredValue",
                        },
                     });
                     netCountChange -= 1; // Decrement the count
                     effectiveAdditions++;
                 } else if (emptyColIndexToAdd === -1) {
                      // **** EDGE CASE: No empty G:L slot ****
                      console.error(`PROCESS_REPLACEMENT_BOOKING: Could not find an empty replacement slot (G:L) for ${studentName} to add "${slotNameToAdd}". Skipping this addition.`);
                      // IMPORTANT: Consider if you should still consume an absence count here or notify user
                 } else { // emptyColIndexToAdd !== -1 BUT oldestAbsenceColIndex === -1
                      // **** EDGE CASE: No absence record found, but count > 0 and slot found ****
                     console.warn(`PROCESS_REPLACEMENT_BOOKING: Could not find an oldest absence record for ${studentName} to clear for replacement '${slotNameToAdd}', but count (${countBeforeThisAdd}) was > 0 and slot found. Adding replacement & Decrementing count anyway.`);
                     requests.push({ // Add replacement to G:L slot
                        updateCells: {
                            range: { sheetId: mainSheetId, startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain, startColumnIndex: emptyColIndexToAdd, endColumnIndex: emptyColIndexToAdd + 1 },
                            rows: [{ values: [{ userEnteredValue: { stringValue: slotNameToAdd } }] }],
                            fields: "userEnteredValue",
                        },
                     });
                     netCountChange -= 1; // Decrement count based on availability, even without specific record
                     effectiveAdditions++;
                 }

             } else { // countBeforeThisAdd <= 0
                 // **** EDGE CASE: No available absence count ****
                 console.warn(`PROCESS_REPLACEMENT_BOOKING: Cannot add replacement '${slotNameToAdd}' for ${studentName} because available count is ${countBeforeThisAdd}.`);
                 // Decide if you want to add the slot anyway without changing count/absences, maybe log?
             }
        } // End loop through additions
        console.log(`PROCESS_REPLACEMENT_BOOKING: Additions processed. Net count change: ${netCountChange}`);


        // --- 3c. Add requests to clear identified oldest absences in the 'absence' sheet ---
        if (studentRowIndexAbsence !== null && absenceColumnsToClear.size > 0) {
            console.log(`PROCESS_REPLACEMENT_BOOKING: Preparing to clear ${absenceColumnsToClear.size} absence records.`);
            absenceColumnsToClear.forEach(colIndex => { // colIndex is 0-based
                console.log(`PROCESS_REPLACEMENT_BOOKING: Adding request to clear absence sheet: Row ${studentRowIndexAbsence}, Col ${colIndex + 1}`);
                 requests.push({
                    updateCells: {
                        range: {
                            sheetId: absenceSheetId, // Use correct Sheet GID
                            startRowIndex: studentRowIndexAbsence - 1, // API uses 0-based row index
                            endRowIndex: studentRowIndexAbsence,
                            startColumnIndex: colIndex, // Use 0-based column index
                            endColumnIndex: colIndex + 1,
                        },
                        rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }], // Set empty string
                        fields: "userEnteredValue",
                    },
                 });
            });
        }

        // --- 3d. Add request to update the final count in Sheet1 (Column C) ---
        const finalAbsenceCount = Math.max(0, currentAbsenceCount + netCountChange); // Ensure non-negative
        console.log(`PROCESS_REPLACEMENT_BOOKING: Final count calculation: Initial=${currentAbsenceCount}, NetChange=${netCountChange}, Final=${finalAbsenceCount}`);
        // Only add update request if the count actually changed
        if (finalAbsenceCount !== currentAbsenceCount) {
             requests.push({
                updateCells: {
                    range: {
                        sheetId: mainSheetId,
                        startRowIndex: studentRowIndexMain - 1, endRowIndex: studentRowIndexMain,
                        startColumnIndex: 2, endColumnIndex: 3, // Column C (index 2)
                    },
                    rows: [{ values: [{ userEnteredValue: { numberValue: finalAbsenceCount } }] }],
                    fields: "userEnteredValue",
                },
             });
             console.log("PROCESS_REPLACEMENT_BOOKING: Added request to update absence count.");
        } else {
            console.log("PROCESS_REPLACEMENT_BOOKING: Absence count did not change. No update request needed.");
        }

        // --- 4. Execute Batch Update if there are any requests ---
        if (requests.length > 0) {
            console.log(`PROCESS_REPLACEMENT_BOOKING: Executing batch update with ${requests.length} requests.`);
            // console.log("PROCESS_REPLACEMENT_BOOKING: Requests:", JSON.stringify(requests, null, 2)); // DEBUG: Log requests if needed
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests },
            });
            console.log("PROCESS_REPLACEMENT_BOOKING: Batch update successful.");
        } else {
            console.log("PROCESS_REPLACEMENT_BOOKING: No changes needed to be written to the sheet.");
        }

        // --- 5. Return Success Response to Frontend ---
        console.log("PROCESS_REPLACEMENT_BOOKING: Processing complete. Sending success response.");
        return res.status(200).json({
             message: '振り替えレッスンの予約処理が正常に完了しました。', // Replacement booking processed successfully.
             finalCount: finalAbsenceCount, // Send back the calculated final count
             addedCount: effectiveAdditions, // How many slots were effectively added
             removedCount: effectiveRemovals // How many slots were effectively removed
        });

    } catch (error) {
        console.error('PROCESS_REPLACEMENT_BOOKING: Error processing replacement booking:', error);
        // Log detailed error if available (e.g., from Google API)
        if (error.response?.data?.error) {
             console.error('PROCESS_REPLACEMENT_BOOKING: Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
        } else if (error.errors) { // Sometimes errors are in an array
            console.error('PROCESS_REPLACEMENT_BOOKING: Google API Errors Array:', JSON.stringify(error.errors, null, 2));
        }
        // Provide a generic but informative error message
        const errorMessage = error.response?.data?.error?.message || error.message || 'サーバー内部でエラーが発生しました。'; // An internal server error occurred.
        return res.status(500).json({ message: `処理エラー: ${errorMessage}` }); // Processing error:
    }
}
// --- End of NEW Endpoint Handler ---


module.exports = {
  fetchSheetData: async (req, res) => {
    const spreadsheetId = '1ax9LCCUn1sT6ogfZ4sv9Qj9Nx6tdAB-lQ3JYxdHIF7U';
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY; // Using API Key for public read? OK if sheet is public.
    const sheetName = req.query.sheetName || 'Sheet1';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

    // Set CORS headers for fetchSheetData
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Allow GET and OPTIONS
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight requests specifically for this endpoint
    if (req.method === 'OPTIONS') {
        console.log("Responding to OPTIONS request for /api/sheetData");
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
         console.log(`Method Not Allowed for fetchSheetData: ${req.method}`);
         return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
      console.log(`Workspaceing sheet data for: ${sheetName}`);
      const sheetResponse = await fetch(url);
      if (!sheetResponse.ok) {
        const errorText = await sheetResponse.text();
        console.error(`Failed to fetch Google Sheet data (${sheetResponse.status}): ${errorText}`);
        throw new Error(`Failed to fetch Google Sheet data: ${sheetResponse.statusText}`);
      }
      const sheetData = await sheetResponse.json();
      console.log(`Successfully fetched data for: ${sheetName}`);
      return res.status(200).json(sheetData); // Use return to avoid executing code after response sent
    } catch (error) {
      console.error('Error fetching Google Sheet data:', error);
      // Ensure response is sent only once
      if (!res.headersSent) {
         return res.status(500).json({ message: 'Internal Server Error fetching sheet data.'}); // Send JSON error
      }
    }
  },
  updateAttendance, // Keep this as it might be used by classDetails.js saveAttendance
  updateAbsenceDates, // Keep this for adding new absence records
  processReplacementBooking: processReplacementBookingHandler, // Add the new handler function
};

// Ensure the helper function is defined within the scope or imported correctly
// async function findStudentRowIndex(student, spreadsheetId, sheetName) { ... }
// It seems to be defined globally in your original snippet, which should be fine here too.