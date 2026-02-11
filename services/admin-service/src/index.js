import express from 'express'; // Server restart trigger
import cors from 'cors';
import dotenv from 'dotenv';
import billingRoutes from './routes/billing.js';
import expenseRoutes from './routes/expenses.js';
import periodsRoutes from './routes/periods.js';
import mediaRoutes from './routes/media.js';
import plRoutes from './routes/pl.js';
import feeRoutes from './routes/fees.js';
import clientRoutes from './routes/clients.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Routes
app.use('/billing', billingRoutes);
app.use('/expenses', expenseRoutes);
app.use('/periods', periodsRoutes);
app.use('/media', mediaRoutes);
app.use('/pl', plRoutes);
app.use('/fees', feeRoutes);
app.use('/clients', clientRoutes);
app.use('/payments', paymentRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/settings', settingsRoutes);
app.use('/users', usersRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'admin-service' });
});

app.listen(port, () => {
    console.log(`Admin Service running on port ${port} - Restarted at ${new Date().toISOString()} [RESTARTED]`);
});
