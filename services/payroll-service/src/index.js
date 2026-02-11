import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import employeesRoutes from './routes/employees.js';
import payrollRoutes from './routes/payroll.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

// ================================================
// MIDDLEWARE
// ================================================

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================================
// ROUTES
// ================================================

app.get('/health', (req, res) => {
    res.json({
        service: 'payroll-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('/employees', employeesRoutes);
app.use('/payroll', payrollRoutes);

app.get('/', (req, res) => {
    res.json({
        service: 'Immoral Payroll Service',
        version: '1.0.0',
        description: 'HR and payroll management with department splits',
        endpoints: {
            employees: {
                list: 'GET /employees',
                get: 'GET /employees/:id',
                create: 'POST /employees',
                updateSalary: 'PATCH /employees/:id/salary'
            },
            payroll: {
                create: 'POST /payroll',
                list: 'GET /payroll/:year/:month',
                update: 'PATCH /payroll/:id',
                setSplits: 'POST /payroll/:id/splits'
            }
        },
        note: 'Automatic department splitting with manual override capability'
    });
});

// ================================================
// ERROR HANDLING
// ================================================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ================================================
// START SERVER
// ================================================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  Immoral Payroll Service                         ║
║  Port: ${PORT}                                      ║
║  Environment: ${process.env.NODE_ENV || 'development'}                     ║
║  Supabase: ${process.env.SUPABASE_URL ? '✓ Connected' : '✗ Not configured'}       ║
╚══════════════════════════════════════════════════╝

💼 Modules:
  • Employee Management (CRUD + salary history)
  • Payroll Processing (auto department splits)
  • Manual split override (Excel-like flexibility)

🚀 Ready at http://localhost:${PORT}
  `);
});

export default app;
