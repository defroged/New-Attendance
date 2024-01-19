const sheetHandler = require('./sheetHandler');

module.exports = async (req, res) => {
  try {
    const result = await sheetHandler.updateAttendance(req, res);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateAttendance route:', error);
    res.status(500).send('Internal Server Error');
  }
};