const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction');
const VersionedDocument = require('../models/versionedDocument');
const db = require('../db');

async function beginTransaction() {
  const snapshotVersion = await db.getGlobalVersion();
  const transactionId = uuidv4();
  await new Transaction({ transactionId, snapshotVersion, status: 'active' }).save();
  return { transactionId, snapshotVersion };
}

async function commitTransaction(transactionId) {
  const tx = await Transaction.findOne({ transactionId }).exec();
  if (!tx || tx.status !== 'active') throw new Error('Transaction not active or not found');

  // allocate commit version
  const commitVersion = await db.incrementGlobalVersion();

  // mark all versioned documents belonging to transaction as committed and set version
  await VersionedDocument.updateMany(
    { transactionId },
    { $set: { committed: true, version: commitVersion }, $unset: { transactionId: 1 } }
  ).exec();

  tx.status = 'committed';
  await tx.save();

  return commitVersion;
}

async function rollbackTransaction(transactionId) {
  const tx = await Transaction.findOne({ transactionId }).exec();
  if (!tx || tx.status !== 'active') throw new Error('Transaction not active or not found');

  // remove uncommitted versions belonging to transaction
  await VersionedDocument.deleteMany({ transactionId }).exec();

  tx.status = 'rolled_back';
  await tx.save();
  return true;
}

async function getOldestActiveSnapshotVersion() {
  const active = await Transaction.find({ status: 'active' }).sort({ snapshotVersion: 1 }).limit(1).exec();
  if (!active || active.length === 0) return await db.getGlobalVersion();
  return active[0].snapshotVersion;
}

module.exports = { beginTransaction, commitTransaction, rollbackTransaction, getOldestActiveSnapshotVersion };
