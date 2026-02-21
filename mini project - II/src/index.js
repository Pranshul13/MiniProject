const express = require('express');
const bodyParser = require('express').json;
const db = require('./db');
const transactionManager = require('./services/transactionManager');
const documentService = require('./services/documentService');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mvcc_snapshot';

async function start() {
  await db.connect(MONGO_URI);
  await db.initGlobalVersion();

  const app = express();
  app.use(bodyParser());

  app.post('/begin', async (req, res) => {
    try {
      const tx = await transactionManager.beginTransaction();
      res.json(tx);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/commit/:txId', async (req, res) => {
    try {
      const commitVersion = await transactionManager.commitTransaction(req.params.txId);
      res.json({ committed: true, commitVersion });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/rollback/:txId', async (req, res) => {
    try {
      await transactionManager.rollbackTransaction(req.params.txId);
      res.json({ rolled_back: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/entity/:id', async (req, res) => {
    try {
      const txId = req.query.txId;
      const doc = await documentService.readDocument(req.params.id, txId ? { transactionId: txId } : {});
      res.json({ data: doc ? doc.data : null, version: doc ? doc.version : null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/entity/:id', async (req, res) => {
    try {
      const txId = req.query.txId;
      const doc = await documentService.writeDocument(req.params.id, req.body, { transactionId: txId });
      res.json({ ok: true, id: doc._id, committed: doc.committed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/entity/:id', async (req, res) => {
    try {
      const txId = req.query.txId;
      const doc = await documentService.writeDocument(req.params.id, {}, { transactionId: txId, isDeleted: true });
      res.json({ ok: true, id: doc._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`MVCC Snapshot Handler listening on ${PORT}`));
}

if (require.main === module) start().catch(err => {
  console.error(err);
  process.exit(1);
});

module.exports = { start };
