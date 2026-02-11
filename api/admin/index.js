import app from '../../services/admin-service/src/index.js';

export default (req, res) => {
    // Strip the /api/admin prefix so the express app ignores it
    req.url = req.url.replace(/^\/api\/admin/, '') || '/';
    return app(req, res);
};
