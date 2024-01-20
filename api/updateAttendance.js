const sheetHandler = require('./sheetHandler');

module.exports = async (req, res) => {
  try {
    const { spreadsheetId, range, data } = req.body; // Extract properties from req.body
    const result = await sheetHandler.updateAttendance(spreadsheetId, range, data); // Pass arguments correctly
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateAttendance route:', error);
    res.status(500).send('Internal Server Error');
  }
};