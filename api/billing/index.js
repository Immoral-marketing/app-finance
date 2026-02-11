import app from '../../services/billing-service/src/index.js';

export default (req, res) => {
    // Strip the /api/billing prefix so the express app ignores it
    req.url = req.url.replace(/^\/api\/billing/, '') || '/';
    return app(req, res);
};
