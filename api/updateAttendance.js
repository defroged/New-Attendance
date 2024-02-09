const sheetHandler = require('./sheetHandler');

module.exports = async (req, res) => {
  try {
    const { spreadsheetId, range, data } = req.body; 
    const result = await sheetHandler.updateAttendance(spreadsheetId, range, data); 
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateAttendance route:', error);
    res.status(500).json({ message: error.message });
}
};