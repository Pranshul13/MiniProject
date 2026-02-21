const mongoose = require('mongoose');

const SystemMetadata = mongoose.model(
  'SystemMetadata',
  new mongoose.Schema({ key: { type: String, unique: true }, value: Number })
);

async function connect(uri, opts = {}) {
  await mongoose.connect(uri, { ...(opts || {}), autoIndex: true });
}

async function initGlobalVersion() {
  // ensure a single global_version entry exists
  const existing = await SystemMetadata.findOne({ key: 'global_version' }).exec();
  if (!existing) {
    await new SystemMetadata({ key: 'global_version', value: 0 }).save();
  }
}

async function incrementGlobalVersion() {
  // atomically increment and return new value
  const updated = await SystemMetadata.findOneAndUpdate(
    { key: 'global_version' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  ).exec();
  return updated.value;
}

async function getGlobalVersion() {
  const m = await SystemMetadata.findOne({ key: 'global_version' }).exec();
  return m ? m.value : 0;
}

module.exports = { connect, initGlobalVersion, incrementGlobalVersion, getGlobalVersion, SystemMetadata };
