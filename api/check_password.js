module.exports = async (req, res) => {
    const correctPassword = process.env.PROTECTED_PAGE_PASSWORD || 'defaultPassword';
    res.status(200).send(correctPassword);
};