import express from 'express';
import './db/config';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import userRouter from './routes/userRouter';
import adminRouter from './routes/admin/adminAuthRouter';
import userProblemsRouter from './routes/userProblems';
import codeRunnerRoutes from './routes/codeRunnerRouter';

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))

app.use((req, res, next) => {
    if (req.is('application/json')) {
        express.json()(req, res, next);
    } else {
        next();
    }
});
app.use(cookieParser()); // we store JWT in cookies so we have to use this

app.use('/api/v1/user',userRouter);
app.use('/api/v1/user',userProblemsRouter);
app.use('/api/v1/admin',adminRouter);
app.use('/api/v1/user/code',codeRunnerRoutes);

app.listen(process.env.PORT, () => console.log('Server running on http://localhost:5000'));
