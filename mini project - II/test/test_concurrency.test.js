const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const db = require('../src/db');
const transactionManager = require('../src/services/transactionManager');
const documentService = require('../src/services/documentService');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await db.connect(uri);
  await db.initGlobalVersion();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('snapshot isolation: a transaction sees its snapshot even if others commit', async () => {
  // initial committed value
  await documentService.writeDocument('e1', { value: 'v0' });

  // T1 begins (snapshot sees v0)
  const t1 = await transactionManager.beginTransaction();

  // T2 begins and writes and commits
  const t2 = await transactionManager.beginTransaction();
  await documentService.writeDocument('e1', { value: 'v2' }, { transactionId: t2.transactionId });
  await transactionManager.commitTransaction(t2.transactionId);

  // T1 should still see v0
  const docT1 = await documentService.readDocument('e1', { transactionId: t1.transactionId });
  expect(docT1.data.value).toBe('v0');

  // New transaction T3 should see committed v2
  const t3 = await transactionManager.beginTransaction();
  const docT3 = await documentService.readDocument('e1', { transactionId: t3.transactionId });
  expect(docT3.data.value).toBe('v2');

  // commit T1's write and ensure commit increments global version
  await documentService.writeDocument('e1', { value: 't1-update' }, { transactionId: t1.transactionId });
  await transactionManager.commitTransaction(t1.transactionId);

  // After commit, a new transaction sees t1-update as latest
  const t4 = await transactionManager.beginTransaction();
  const docT4 = await documentService.readDocument('e1', { transactionId: t4.transactionId });
  expect(docT4.data.value).toBe('t1-update');
});
