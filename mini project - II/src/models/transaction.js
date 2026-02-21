const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true },
  snapshotVersion: { type: Number },
  status: { type: String, enum: ['active', 'committed', 'rolled_back'], default: 'active' },
  startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
