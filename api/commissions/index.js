import app from '../../services/commissions-service/src/index.js';

export default (req, res) => {
    // Strip the /api/commissions prefix so the express app ignores it
    req.url = req.url.replace(/^\/api\/commissions/, '') || '/';
    return app(req, res);
};
