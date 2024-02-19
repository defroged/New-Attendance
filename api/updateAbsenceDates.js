const sheetHandler = require("./sheetHandler");

module.exports = async (req, res) => {
  try {
    const { spreadsheetId, sheetName, data } = req.body;
    const result = await sheetHandler.updateAbsenceDates(spreadsheetId, sheetName, data);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in updateAbsenceDates route:", error);
    res.status(500).json({ message: error.message });
  }
};