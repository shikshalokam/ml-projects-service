/**
 * clean-admin-teacher-profile-types.js
 *
 * npm install mongodb dotenv
 *
 * Purpose:
 *   Across projects, surveySubmissions, observationSubmissions —
 *   find docs created on or after 2025-05-01 that contain entries in
 *   userProfile.profileUserTypes where:
 *       subType starts with "teacher"  (case-insensitive)
 *     AND
 *       type === "administrator"
 *
 * Two run modes:
 *   node clean-admin-teacher-profile-types.js
 *       → Scan-only. Writes found doc IDs + matched objects to output/<collection>/found/
 *
 *   node clean-admin-teacher-profile-types.js --deleteType
 *       → Removes the matched objects from the array, persists to DB,
 *         marks each doc with profileUserTypesCleanedForDataCleanUp=true,
 *         and writes deleted records to output/<collection>/deleted/
 *
 * Output format (per batch file):
 *   {
 *     "records": [
 *       { "docId": "...", "matchedTypes": [ { "subType": "...", "type": "administrator" }, ... ] }
 *     ],
 *     "count": N
 *   }
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../../") + "/.env",
});

// ─── Config ──────────────────────────────────────────────────────────────────

const MONGO_URL = process.env.MONGODB_URL;
console.log("🌐 Mongo URL:", MONGO_URL);

const COLLECTION1 = "projects";
const COLLECTION2 = "surveySubmissions";
const COLLECTION3 = "observationSubmissions";

const SHOULD_DELETE = process.argv.includes("--deleteType");

const BULK_BATCH_SIZE = 500;   // ops per bulkWrite call
const RECORDS_PER_FILE = 1000; // doc records per output JSON file

const START_DATE = new Date("2025-05-01T00:00:00.000Z");

const OUTPUT_DIR = path.join(__dirname, "output");

// ─── BatchWriter ─────────────────────────────────────────────────────────────
// Accumulates records { docId, matchedTypes } and flushes to disk in chunks.

class BatchWriter {
  constructor(subFolder) {
    this.dir = path.join(OUTPUT_DIR, subFolder);
    this.buffer = [];
    this.batchNum = 1;
    this.totalCount = 0;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /** @param {Array<{docId: string, matchedTypes: object[]}>} records */
  add(records) {
    if (!records.length) return;
    this.buffer.push(...records);
    this.totalCount += records.length;

    while (this.buffer.length >= RECORDS_PER_FILE) {
      const chunk = this.buffer.splice(0, RECORDS_PER_FILE);
      this._writeChunk(chunk);
    }
  }

  flush() {
    if (this.buffer.length > 0) {
      this._writeChunk(this.buffer.splice(0));
    }
  }

  _writeChunk(chunk) {
    const filePath = path.join(this.dir, `batch${this.batchNum}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ records: chunk, count: chunk.length }, null, 2)
    );
    console.log(
      `📁 Written: ${filePath}  (${chunk.length} records, total so far: ${this.totalCount})`
    );
    this.batchNum++;
  }

  summary() {
    return {
      totalFiles: this.batchNum - 1,
      totalRecords: this.totalCount,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the entries from profileUserTypes that should be removed:
 *   subType starts with "teacher" (case-insensitive) AND type === "administrator"
 *
 * @param {object[]} profileUserTypes
 * @returns {object[]} matched entries
 */
function findAdminTeacherEntries(profileUserTypes = []) {
  return profileUserTypes.filter(
    (entry) =>
      typeof entry?.subType === "string" &&
      entry.subType.toLowerCase().startsWith("teacher") &&
      entry?.type === "administrator"
  );
}

/**
 * Returns the profileUserTypes array with the matched entries removed.
 *
 * @param {object[]} profileUserTypes
 * @returns {object[]} cleaned array
 */
function removeAdminTeacherEntries(profileUserTypes = []) {
  return profileUserTypes.filter(
    (entry) =>
      !(
        typeof entry?.subType === "string" &&
        entry.subType.toLowerCase().startsWith("teacher") &&
        entry?.type === "administrator"
      )
  );
}

// ─── Bulk flush ───────────────────────────────────────────────────────────────

async function flushBulkWrites(collection, ops, label) {
  if (!ops.length) return;
  await collection.bulkWrite(ops, { ordered: false });
  console.log(`💾 [${label}] Flushed ${ops.length} bulk ops`);
  ops.length = 0;
}

// ─── Collection processor ────────────────────────────────────────────────────

async function processCollection(db, collectionName) {
  const label = collectionName;
  const col = db.collection(collectionName);

  const foundWriter = new BatchWriter(`${collectionName}/found`);
  const deletedWriter = SHOULD_DELETE
    ? new BatchWriter(`${collectionName}/deleted`)
    : null;

  const bulkOps = [];
  let processed = 0;
  let matched = 0;

  /**
   * Query:
   *   - createdAt >= 2025-05-01
   *   - profileUserTypesCleanedForDataCleanUp must NOT exist  (idempotent re-runs)
   *   - at least one entry in profileUserTypes with subType starting "teacher"
   *     AND type === "administrator"  (DB-side pre-filter to skip unrelated docs)
   */
  const query = {
    createdAt: { $gte: START_DATE },
    profileUserTypesCleanedForDataCleanUp: { $exists: false },
    "userProfile.profileUserTypes": {
      $elemMatch: {
        subType: { $regex: /^teacher/i },
        type: "administrator",
      },
    },
  };

  const projection = {
    "userProfile.profileUserTypes": 1,
  };

  const cursor = col.find(query, { projection });

  while (await cursor.hasNext()) {
    const doc = await cursor.next();

    const profileUserTypes = doc?.userProfile?.profileUserTypes ?? [];
    const matchedEntries = findAdminTeacherEntries(profileUserTypes);

    // Double-check in JS (defensive; DB regex already filtered)
    if (!matchedEntries.length) {
      processed++;
      continue;
    }

    matched++;
    const record = {
      docId: doc._id.toString(),
      matchedTypes: matchedEntries,
    };

    foundWriter.add([record]);
    console.log(
      `📄 [${label}] ${doc._id} → ${matchedEntries.length} admin-teacher entries found`
    );

    if (SHOULD_DELETE) {
      const cleanedTypes = removeAdminTeacherEntries(profileUserTypes);

      deletedWriter.add([record]);

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              "userProfile.profileUserTypes": cleanedTypes,
              profileUserTypesCleanedForDataCleanUp: true, // 🔑 idempotency flag
            },
          },
        },
      });

      if (bulkOps.length >= BULK_BATCH_SIZE) {
        await flushBulkWrites(col, bulkOps, label);
      }
    }

    processed++;
    if (processed % 1000 === 0) {
      console.log(`⏳ [${label}] ${processed} docs processed (${matched} matched)`);
    }
  }

  // Flush remaining bulk ops
  await flushBulkWrites(col, bulkOps, label);

  foundWriter.flush();
  if (deletedWriter) deletedWriter.flush();

  console.log(`\n✅ [${label}] Done`);
  console.log(`   Total docs scanned : ${processed}`);
  console.log(`   Docs with matches  : ${matched}`);
  console.log(`   Found  output      :`, foundWriter.summary());
  if (deletedWriter) {
    console.log(`   Deleted output     :`, deletedWriter.summary());
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 Mode:", SHOULD_DELETE ? "--deleteType (WILL MODIFY DB)" : "scan-only");
  console.log("📅 Filtering docs created on or after:", START_DATE.toISOString());
  console.log(
    "🎯 Target: profileUserTypes entries where subType starts with 'teacher' AND type === 'administrator'\n"
  );

  const client = new MongoClient(MONGO_URL, {
    maxPoolSize: 30,
    minPoolSize: 5,
    socketTimeoutMS: 0,          // never timeout socket
    connectTimeoutMS: 30_000,
    serverSelectionTimeoutMS: 30_000,
    retryWrites: true,
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const db = client.db();

    // All 3 collections processed in parallel
    await Promise.all([
      processCollection(db, COLLECTION1),
      processCollection(db, COLLECTION2),
      processCollection(db, COLLECTION3),
    ]);

    console.log("\n🎉 ALL DONE");
    console.log(`📂 Output files are in: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

main();