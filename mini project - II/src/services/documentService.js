const VersionedDocument = require('../models/versionedDocument');
const db = require('../db');
const transactionManager = require('./transactionManager');

async function readDocument(entityId, options = {}) {
  // options: { transactionId, snapshotVersion }
  if (options.transactionId) {
    // Transactional read: include own uncommitted writes plus committed versions <= snapshot
    const tx = await require('../models/transaction').findOne({ transactionId: options.transactionId }).exec();
    if (!tx) throw new Error('Transaction not found');
    const snapshotVersion = tx.snapshotVersion;
    // find own uncommitted first
    const own = await VersionedDocument.findOne({ entityId, transactionId: options.transactionId }).sort({ createdAt: -1 }).exec();
    if (own) return own.isDeleted ? null : own;
    // otherwise latest committed <= snapshotVersion
    const committed = await VersionedDocument.find({ entityId, committed: true, version: { $lte: snapshotVersion } })
      .sort({ version: -1 })
      .limit(1)
      .exec();
    return committed && committed.length ? (committed[0].isDeleted ? null : committed[0]) : null;
  }

  // non-transactional read: snapshot is latest global version
  const snapshot = options.snapshotVersion !== undefined ? options.snapshotVersion : await db.getGlobalVersion();
  const committed = await VersionedDocument.find({ entityId, committed: true, version: { $lte: snapshot } })
    .sort({ version: -1 })
    .limit(1)
    .exec();
  return committed && committed.length ? (committed[0].isDeleted ? null : committed[0]) : null;
}

async function writeDocument(entityId, data, options = {}) {
  // options: { transactionId, isDeleted }
  if (options.transactionId) {
    // create an uncommitted version tied to transaction
    const doc = new VersionedDocument({ entityId, data, transactionId: options.transactionId, committed: false, isDeleted: !!options.isDeleted });
    await doc.save();
    return doc;
  }

  // non-transactional immediate commit: allocate version and save committed
  const commitVersion = await db.incrementGlobalVersion();
  const doc = new VersionedDocument({ entityId, data, committed: true, version: commitVersion, isDeleted: !!options.isDeleted });
  await doc.save();
  return doc;
}

module.exports = { readDocument, writeDocument };
