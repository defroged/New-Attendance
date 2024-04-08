module.exports = async (req, res) => {
    const correctPassword = process.env.PROTECTED_PAGE_PASSWORD || 'defaultPassword';
    
    if (req.method === 'POST') {
        const enteredPassword = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => resolve(data));
        });

        if (enteredPassword === correctPassword) {
            res.status(200).send('OK');
        } else {
            res.status(401).send('Unauthorized');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};