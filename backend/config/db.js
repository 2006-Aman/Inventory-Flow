const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_flow_db';
        const conn = await mongoose.connect(mongoUri, {
            // Mongoose 6+ has modern defaults
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
