const mongoose = require('mongoose');

const VersionedDocumentSchema = new mongoose.Schema({
  entityId: { type: String, index: true },
  version: { type: Number, index: true, sparse: true },
  data: { type: mongoose.Schema.Types.Mixed },
  transactionId: { type: String, index: true, sparse: true },
  committed: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.models.VersionedDocument || mongoose.model('VersionedDocument', VersionedDocumentSchema);
