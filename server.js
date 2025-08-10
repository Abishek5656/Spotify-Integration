import mongoose from 'mongoose'
import app from './src/app.js';
import { connectDB, PORT } from './src/config/db.js';

// Connect to DB first, then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
