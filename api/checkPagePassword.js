export default (req, res) => {
  const { password } = req.body;

  if (password === process.env.PROTECTED_PAGE_PASSWORD) {
    res.status(200).json({ result: "correct" });
  } else {
    res.status(401).json({ result: "incorrect" });
  }
};