const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://project_pulse:G9fNUmrMbKyp9xSD@cluster1.khmigmu.mongodb.net/?appName=Cluster1';

let cached = global.__projectPulseMongo;

if (!cached) {
  cached = global.__projectPulseMongo = { conn: null, promise: null };
}

async function connect() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Using Atlas placeholder URL. Set it in your environment to connect to your MongoDB Atlas cluster.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = new MongoClient(MONGODB_URI).connect().then((client) => {
      const db = client.db(process.env.MONGODB_DB || 'projectpulse');
      cached.conn = { client, db };
      return cached.conn;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

async function getCollection(collectionName) {
  const connection = await connect();
  return connection.db.collection(collectionName);
}

function normalizeObjectId(value) {
  if (!value) return value;
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value)) {
    return new ObjectId(value);
  }
  return value;
}

module.exports = {
  connect,
  getCollection,
  ObjectId,
  normalizeObjectId,
};
