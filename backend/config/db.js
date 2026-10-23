const mongoose = require('mongoose');

let mongoMemoryServerInstance = null;
const connectDB = async () => {
    const specifiedUri = process.env.MONGO_URI;

    // 1. First attempt to connect to specified MONGO_URI
    try {
        const conn = await mongoose.connect(specifiedUri, {
            serverSelectionTimeoutMS: 10000, // 10s — enough time for Atlas cloud
            connectTimeoutMS: 10000
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
        return conn;
    } catch (primaryError) {
        console.warn(`⚠️ Direct connection to "${specifiedUri}" not available (${primaryError.message}).`);
        console.log('🔄 Initializing embedded MongoDB engine (MongoMemoryServer) for 100% operational persistence...');

        // 2. Fallback to embedded MongoDB instance
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            mongoMemoryServerInstance = await MongoMemoryServer.create({
                instance: {
                    dbName: 'inventory_flow_db'
                }
            });
            const memoryUri = mongoMemoryServerInstance.getUri();

            const conn = await mongoose.connect(memoryUri);
            console.log(`✅ Embedded MongoDB Running: ${memoryUri} / Database: inventory_flow_db`);
            return conn;
        } catch (memoryError) {
            console.error(`❌ Critical MongoDB Engine Failure: ${memoryError.message}`);
            process.exit(1);
        }
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        if (mongoMemoryServerInstance) {
            await mongoMemoryServerInstance.stop();
        }
    } catch (err) {
        console.error('Error disconnecting MongoDB:', err.message);
    }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
