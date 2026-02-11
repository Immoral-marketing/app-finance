import app from '../../services/payroll-service/src/index.js';

export default (req, res) => {
    // Strip the /api/payroll prefix so the express app ignores it
    req.url = req.url.replace(/^\/api\/payroll/, '') || '/';
    return app(req, res);
};
