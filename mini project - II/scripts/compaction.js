const db = require('../src/db');
const transactionManager = require('../src/services/transactionManager');
const VersionedDocument = require('../src/models/versionedDocument');

async function run() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mvcc_snapshot';
  await db.connect(MONGO_URI);
  const minActiveSnapshot = await transactionManager.getOldestActiveSnapshotVersion();
  console.log('Oldest active snapshot version:', minActiveSnapshot);

  // safe to delete committed versions with version < minActiveSnapshot
  const res = await VersionedDocument.deleteMany({ committed: true, version: { $lt: minActiveSnapshot } });
  console.log('Compaction removed documents count:', res.deletedCount);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(2); });
