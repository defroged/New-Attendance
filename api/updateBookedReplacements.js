const updateBookedReplacements = require('../sheetHandler/updateBookedReplacements');

module.exports = async (req, res) => {
  try {
    const result = await updateBookedReplacements(req, res);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateBookedReplacements route:', error);
    res.status(500).send('Internal Server Error');
  }
};