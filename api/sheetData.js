const { fetchSheetData } = require('./sheetHandler');

module.exports = async (req, res) => {
try {
  const result = await fetchSheetData(req, res);
  res.status(200).json(result);
} catch (error) {
  console.error('Error in classDetails route:', error);
  res.status(500).send('Internal Server Error');
}
};