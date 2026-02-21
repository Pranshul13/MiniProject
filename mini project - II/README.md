# MVCC Snapshot Handler

Simple application-layer MVCC implementation (Node.js + Express + MongoDB) providing snapshot isolation and versioned documents.

Features:
- Versioned writes (no in-place updates)
- Snapshot-based reads
- BEGIN / COMMIT / ROLLBACK transaction lifecycle
- Compaction script to remove versions not visible to active transactions

See `src` for implementation and `test` for unit tests simulating concurrency scenarios.
