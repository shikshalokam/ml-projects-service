'use strict';

/**
 * name : normaliseRolesAcrossCollections.js
 * Description : Normalise userRoles and userRoleInformation.roles to lowercase
 * across multiple collections in batches.
 *
 * Collections handled:
 * - projects
 * - programs
 * - surveys
 * - observations
 * - surveySubmissions
 * - observationSubmissions
 *
 * Handles:
 * - string roles
 * - CSV roles
 * - array roles
 * - array of objects with { code }
 *
 * Ensures:
 * - Document IDs are captured in output report
 * - Batch processing
 * - Read / Write modes
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URL;

const COLLECTIONS = [
  'projects',
  'programs',
  'surveys',
  'observations',
  'surveySubmissions',
  'observationSubmissions'
];

const BATCH_SIZE = 100;
const OUTPUT_DIR = path.join(__dirname, 'output');

const READ_MODE = 'read';
const WRITE_MODE = 'write';

if (!MONGO_URI) {
  console.error('MONGODB_URL is not set in .env');
  process.exit(1);
}

/**
 * Normalize a single role string
 */
function normalizeString(value) {
  if (typeof value !== 'string') return value;

  return value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .join(',');
}

/**
 * Normalize roles of any type
 */
function normalizeRoles(value) {
  if (!value) return value;

  // STRING or CSV
  if (typeof value === 'string') {
    return normalizeString(value);
  }

  // ARRAY
  if (Array.isArray(value)) {
    let hasChanges = false;

    const normalized = value.map(item => {
      if (typeof item === 'string') {
        const norm = normalizeString(item);
        if (norm !== item) hasChanges = true;
        return norm;
      }

      if (item && typeof item === 'object') {
        if (typeof item.code === 'string') {
          const norm = normalizeString(item.code);
          if (norm !== item.code) {
            hasChanges = true;
            return {
              ...item,
              code: norm
            };
          }
        }
      }

      return item;
    });

    return hasChanges ? normalized : value;
  }

  return value;
}

function getArgValue(argName) {
  const arg = process.argv.find(item => item.startsWith(`--${argName}=`));
  return arg ? arg.split('=')[1] : '';
}

function parseDateArg(dateInput, boundary = 'start') {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput);

  const parsedDate = isDateOnly
    ? new Date(
        boundary === 'start'
          ? `${dateInput}T00:00:00.000Z`
          : `${dateInput}T23:59:59.999Z`
      )
    : new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }

  return parsedDate;
}

function parseExecutionMode(modeInput = '') {
  const mode = (modeInput || READ_MODE).trim().toLowerCase();

  if (![READ_MODE, WRITE_MODE].includes(mode)) {
    throw new Error(`Invalid mode: ${modeInput}`);
  }

  return mode;
}

/**
 * Build update payload
 */
function buildUpdatePayload(doc) {
  const payload = {};

  if (typeof doc.userRoles !== 'undefined') {
    const normalized = normalizeRoles(doc.userRoles);

    if (JSON.stringify(normalized) !== JSON.stringify(doc.userRoles)) {
      payload.userRoles = normalized;
    }
  }

  if (
    doc.userRoleInformation &&
    typeof doc.userRoleInformation === 'object' &&
    typeof doc.userRoleInformation.roles !== 'undefined'
  ) {
    const normalized = normalizeRoles(
      doc.userRoleInformation.roles
    );

    if (
      JSON.stringify(normalized) !==
      JSON.stringify(doc.userRoleInformation.roles)
    ) {
      payload['userRoleInformation.roles'] = normalized;
    }
  }

  return payload;
}

async function migrateCollection(
  collection,
  collectionName,
  fromDate,
  toDate,
  executionMode
) {
  let lastProcessedId = null;

  let scannedCount = 0;
  let matchedForUpdateCount = 0;
  let modifiedCount = 0;

  let batchNumber = 0;

  const batchStats = [];

  const wouldModifyIdsSet = new Set();
  const modifiedIdsSet = new Set();

  while (true) {
    const query = {
      ...(lastProcessedId
        ? { _id: { $gt: lastProcessedId } }
        : {}),

      createdAt: {
        $gte: fromDate,
        $lte: toDate
      },

      $or: [
        { userRoles: { $exists: true } },
        { 'userRoleInformation.roles': { $exists: true } }
      ]
    };

    const docs = await collection
      .find(query, {
        projection: {
          _id: 1,
          userRoles: 1,
          userRoleInformation: 1
        }
      })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (!docs.length) break;

    batchNumber += 1;

    scannedCount += docs.length;

    lastProcessedId = docs[docs.length - 1]._id;

    const bulkOperations = [];
    const batchTargets = [];

    for (const doc of docs) {
      const updatePayload = buildUpdatePayload(doc);

      if (Object.keys(updatePayload).length > 0) {
        const idString = doc._id.toString();

        wouldModifyIdsSet.add(idString);

        batchTargets.push({
          id: doc._id,
          idString
        });

        bulkOperations.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: updatePayload }
          }
        });
      }
    }

    matchedForUpdateCount += bulkOperations.length;

    let modifiedSuccessfullyInBatch = 0;

    if (executionMode === WRITE_MODE && bulkOperations.length > 0) {
      await collection.bulkWrite(bulkOperations, {
        ordered: false
      });

      const updatedDocs = await collection
        .find(
          {
            _id: {
              $in: batchTargets.map(t => t.id)
            }
          },
          {
            projection: {
              _id: 1,
              userRoles: 1,
              userRoleInformation: 1
            }
          }
        )
        .toArray();

      const updatedMap = updatedDocs.reduce(
        (acc, doc) => {
          acc[doc._id.toString()] = doc;
          return acc;
        },
        {}
      );

      for (const target of batchTargets) {
        const updatedDoc = updatedMap[target.idString];

        if (!updatedDoc) continue;

        const pending = buildUpdatePayload(updatedDoc);

        if (Object.keys(pending).length === 0) {
          modifiedIdsSet.add(target.idString);
          modifiedSuccessfullyInBatch += 1;
        }
      }
    }

    modifiedCount += modifiedSuccessfullyInBatch;

    batchStats.push({
      batchNumber,
      scannedInBatch: docs.length,
      matchedForUpdateInBatch: bulkOperations.length,
      modifiedSuccessfullyInBatch,
      cumulativeModifiedCount: modifiedCount
    });
  }

  return {
    collection: collectionName,

    totals: {
      scannedCount,
      matchedForUpdateCount,
      modifiedCount
    },

    wouldModifyDocumentIds: Array.from(
      wouldModifyIdsSet
    ),

    modifiedDocumentIds: Array.from(
      modifiedIdsSet
    ),

    batches: batchStats
  };
}

async function runMigration() {
  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  let fromDate = null;
  let toDate = null;
  let executionMode = READ_MODE;

  const reports = {};

  let migrationError = null;

  try {
    const fromDateInput = getArgValue('fromDate');
    const toDateInput = getArgValue('toDate');
    const modeInput = getArgValue('mode');

    if (!fromDateInput || !toDateInput) {
      throw new Error(
        'Both --fromDate and --toDate are mandatory.'
      );
    }

    fromDate = parseDateArg(fromDateInput, 'start');
    toDate = parseDateArg(toDateInput, 'end');

    executionMode = parseExecutionMode(modeInput);

    if (fromDate > toDate) {
      throw new Error(
        'fromDate cannot be greater than toDate'
      );
    }

    await client.connect();

    console.log('Connected to MongoDB');

    const db = client.db();

    for (const collectionName of COLLECTIONS) {
      console.log(
        `Processing collection: ${collectionName}`
      );

      const collection = db.collection(
        collectionName
      );

      reports[collectionName] =
        await migrateCollection(
          collection,
          collectionName,
          fromDate,
          toDate,
          executionMode
        );
    }

    console.log('Migration completed');
  } catch (error) {
    migrationError = {
      message: error.message,
      stack: error.stack
    };

    console.error('Migration failed', error);

    process.exitCode = 1;
  } finally {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, {
        recursive: true
      });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const outputFilePath = path.join(
      OUTPUT_DIR,
      `${timestamp}.js`
    );

    const payload = {
      mode: executionMode,
      batchSize: BATCH_SIZE,
      fromDate: fromDate
        ? fromDate.toISOString()
        : null,
      toDate: toDate
        ? toDate.toISOString()
        : null,
      reports,
      status: migrationError
        ? 'failed'
        : 'completed',
      error: migrationError
    };

    fs.writeFileSync(
      outputFilePath,
      `module.exports = ${JSON.stringify(
        payload,
        null,
        2
      )};\n`,
      'utf8'
    );

    await client.close();

    console.log(
      `Output written to: ${outputFilePath}`
    );
  }
}

runMigration();
