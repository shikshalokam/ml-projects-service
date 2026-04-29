/**
 * npm install mongodb dotenv
 *
 * Optimizations:
 *  - bulkWrite in batches (BATCH_SIZE) instead of per-doc updateOne
 *  - All 3 collections processed in parallel (Promise.all)
 *  - Paths written to output/<collection>/batch1.json, batch2.json... (25k each)
 *  - --deletePaths: sets evidencesRemovedForDatacleanUp=true on updated docs
 *  - --deletePaths: deleted paths also split into 25k batch files
 *  - BatchWriter class flushes to disk incrementally — safe for 6L+ docs
 */

const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../../") + "/.env",
});

// ==============================
const MONGO_URL = process.env.MONGO_URL;
console.log("🌐 Mongo URL:", MONGO_URL);

const COLLECTION1 = "projects";
const COLLECTION2 = "surveySubmissions";
const COLLECTION3 = "observationSubmissions";

const SHOULD_DELETE = process.argv.includes("--deletePaths");
const BATCH_SIZE = 500;       // Mongo bulkWrite batch size
const PATHS_PER_FILE = 25000; // Paths per output JSON file

const OUTPUT_DIR = path.join(__dirname, "output");

// ==============================
const programIds = JSON.parse(
  fs.readFileSync(path.join(__dirname, "programIds.json"), "utf-8")
).map((id) => new ObjectId(id));

// ==============================
// 📦 BATCH WRITER
// Accumulates paths and flushes to disk every PATHS_PER_FILE entries.
// Keeps memory low regardless of total volume.
// ==============================

class BatchWriter {
  constructor(subFolder) {
    this.dir = path.join(OUTPUT_DIR, subFolder);
    this.buffer = [];
    this.batchNum = 1;
    this.totalCount = 0;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  add(paths) {
    if (!paths.length) return;
    this.buffer.push(...paths);
    this.totalCount += paths.length;

    // Flush complete chunks immediately
    while (this.buffer.length >= PATHS_PER_FILE) {
      const chunk = this.buffer.splice(0, PATHS_PER_FILE);
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
    JSON.stringify({ paths: chunk, count: chunk.length }, null, 2)
  );
  console.log(
    `📁 Written: ${filePath}  (${chunk.length} paths, total so far: ${this.totalCount})`
  );
  this.batchNum++;
}

  summary() {
    return {
      totalFiles: this.batchNum - 1,
      totalPaths: this.totalCount,
    };
  }
}

// ==============================
// PATH COLLECTORS
// ==============================

function collectProjectPaths(doc) {
  const paths = [];

  doc.attachments?.forEach((att) => {
    if (att?.sourcePath) paths.push(att.sourcePath);
  });

  function walkTasks(tasks = []) {
    for (const task of tasks) {
      task?.attachments?.forEach((att) => {
        if (att?.sourcePath) paths.push(att.sourcePath);
      });
      if (task?.children?.length) walkTasks(task.children);
    }
  }

  if (doc.tasks) walkTasks(doc.tasks);
  return paths;
}

function extractFilesFromAnswers(answers = {}) {
  const paths = [];
  for (const ans of Object.values(answers)) {
    if (!ans) continue;
    if (Array.isArray(ans.fileName)) {
      ans.fileName.forEach((f) => {
        if (f?.sourcePath) paths.push(f.sourcePath);
      });
    }
  }
  return paths;
}

function extractSubmissionPaths(doc) {
  const paths = [];

  if (doc.answers) paths.push(...extractFilesFromAnswers(doc.answers));

  if (doc.evidences) {
    for (const ev of Object.values(doc.evidences)) {
      ev?.submissions?.forEach((sub) => {
        if (sub?.answers) paths.push(...extractFilesFromAnswers(sub.answers));
      });
    }
  }

  if (doc.evidencesStatus) {
    for (const ev of doc.evidencesStatus) {
      ev?.submissions?.forEach((sub) => {
        if (sub?.answers) paths.push(...extractFilesFromAnswers(sub.answers));
      });
    }
  }

  return paths;
}

// ==============================
// CLEANERS
// ==============================

function cleanAnswers(answers = {}) {
  for (const ans of Object.values(answers)) {
    if (ans?.fileName) ans.fileName = [];
  }
}

function cleanTasks(tasks = []) {
  for (const task of tasks) {
    if (task?.attachments) task.attachments = [];
    if (task?.children) cleanTasks(task.children);
  }
}

// ==============================
// BULK WRITE FLUSH
// ==============================

async function flushBulkWrites(collection, ops, label) {
  if (!ops.length) return;
  await collection.bulkWrite(ops, { ordered: false });
  console.log(`💾 [${label}] Flushed ${ops.length} bulk ops`);
  ops.length = 0; // clear in-place
}

// ==============================
// PROCESS PROJECTS
// ==============================

async function processProjects(db) {
  const label = COLLECTION1;
  const col = db.collection(COLLECTION1);

  // Two separate writers: one for all found paths, one for deleted paths
  const foundWriter = new BatchWriter(`${COLLECTION1}/found`);
  const deletedWriter = SHOULD_DELETE
    ? new BatchWriter(`${COLLECTION1}/deleted`)
    : null;

  const bulkOps = [];
  let processed = 0;

  const cursor = col.find(
    { programId: { $in: programIds } },
    { projection: { attachments: 1, tasks: 1 } }
  );

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const paths = collectProjectPaths(doc);

    if (paths.length > 0) {
      foundWriter.add(paths);
      console.log(`📄 [${label}] ${doc._id} → ${paths.length} files`);
    }

    if (SHOULD_DELETE && paths.length > 0) {
      doc.attachments = [];
      if (doc.tasks) cleanTasks(doc.tasks);

      deletedWriter.add(paths);

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              attachments: doc.attachments,
              tasks: doc.tasks,
              evidencesRemovedForDatacleanUp: true, // 🔑 flag
            },
          },
        },
      });

      if (bulkOps.length >= BATCH_SIZE) {
        await flushBulkWrites(col, bulkOps, label);
      }
    }

    processed++;
    if (processed % 1000 === 0) console.log(`⏳ [${label}] ${processed} docs processed`);
  }

  await flushBulkWrites(col, bulkOps, label);

  foundWriter.flush();
  if (deletedWriter) deletedWriter.flush();

  console.log(`✅ [${label}] Done — ${processed} docs`);
  console.log(`   Found paths:`, foundWriter.summary());
  if (deletedWriter) console.log(`   Deleted paths:`, deletedWriter.summary());
}

// ==============================
// PROCESS SURVEY / OBSERVATION
// ==============================

async function processSubmissions(db, collectionName, subFolder) {
  const label = collectionName;
  const col = db.collection(collectionName);

  const foundWriter = new BatchWriter(`${subFolder}/found`);
  const deletedWriter = SHOULD_DELETE
    ? new BatchWriter(`${subFolder}/deleted`)
    : null;

  const bulkOps = [];
  let processed = 0;

  const cursor = col.find(
    { programId: { $in: programIds } },
    { projection: { answers: 1, evidences: 1, evidencesStatus: 1 } }
  );

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const paths = extractSubmissionPaths(doc);

    if (paths.length > 0) {
      foundWriter.add(paths);
      console.log(`📄 [${label}] ${doc._id} → ${paths.length} files`);
    }

    if (SHOULD_DELETE && paths.length > 0) {
      cleanAnswers(doc.answers);

      if (doc.evidences) {
        for (const ev of Object.values(doc.evidences)) {
          ev?.submissions?.forEach((sub) => cleanAnswers(sub.answers));
        }
      }

      if (doc.evidencesStatus) {
        doc.evidencesStatus.forEach((ev) =>
          ev?.submissions?.forEach((sub) => cleanAnswers(sub.answers))
        );
      }

      deletedWriter.add(paths);

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              answers: doc.answers,
              evidences: doc.evidences,
              evidencesStatus: doc.evidencesStatus,
              evidencesRemovedForDatacleanUp: true, // 🔑 flag
            },
          },
        },
      });

      if (bulkOps.length >= BATCH_SIZE) {
        await flushBulkWrites(col, bulkOps, label);
      }
    }

    processed++;
    if (processed % 1000 === 0) console.log(`⏳ [${label}] ${processed} docs processed`);
  }

  await flushBulkWrites(col, bulkOps, label);

  foundWriter.flush();
  if (deletedWriter) deletedWriter.flush();

  console.log(`✅ [${label}] Done — ${processed} docs`);
  console.log(`   Found paths:`, foundWriter.summary());
  if (deletedWriter) console.log(`   Deleted paths:`, deletedWriter.summary());
}

// ==============================
// MAIN
// ==============================

async function main() {
  const client = new MongoClient(MONGO_URL, {
    maxPoolSize: 10,
  });

  try {
    await client.connect();
    console.log("✅ Connected");

    // Ensure base output dir exists
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const db = client.db();

    // 🔀 Run all 3 collections in PARALLEL
    await Promise.all([
      processProjects(db),
      processSubmissions(db, COLLECTION2, "surveySubmissions"),
      processSubmissions(db, COLLECTION3, "observationSubmissions"),
    ]);

    console.log("🎉 DONE");
    console.log(`📂 All output files are in: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
    console.log("🔌 Closed");
  }
}

main();