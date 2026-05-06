# 📦 MongoDB Attachment Extractor

A high-performance Node.js script that connects to MongoDB and extracts all file `sourcePath` values from attachments across three collections. Supports optional deletion/cleanup with bulk writes, parallel processing, and incremental disk flushing — safe for 600k+ documents.

---

## 🚀 Features

- 🔗 Single MongoDB connection with connection pooling (`maxPoolSize: 30`)
- 📂 Extracts `sourcePath` from:
  - Project-level attachments
  - Nested task attachments (recursive children)
  - Survey submission answers & evidences
  - Observation submission answers & evidences & evidencesStatus
- 🔀 All 3 collections processed **in parallel** via `Promise.all`
- 📁 Output split into `25,000-path` batch JSON files to keep memory low
- 🧹 `--deletePaths` mode: clears attachment fields and flags cleaned docs with `evidencesRemovedForDatacleanUp: true`
- ⚡ `bulkWrite` in batches of 500 for high-throughput DB updates
- 🛡️ Skips already-cleaned documents (`evidencesRemovedForDatacleanUp` must not exist)

---

## 🏗️ Project Structure
ml-project-service/
├── extract-attachment-paths.js
├── input.json
├── .env
├── output/
│   ├── projects/
│   │   ├── found/
│   │   │   ├── batch1.json
│   │   │   └── batch2.json
│   │   └── deleted/
│   │       └── batch1.json
│   ├── surveySubmissions/
│   │   ├── found/
│   │   └── deleted/
│   └── observationSubmissions/
│       ├── found/
│       └── deleted/
└── README.md

---

## ⚙️ Configuration

### `.env`

```env
MONGODB_URL=mongodb://localhost:27017/your-database
```

### `input.json`

Provide an array of `programId` strings to scope which documents are processed:

```json
{
  "programIds": [
    "64a1f3c2e4b0a12345678901",
    "64a1f3c2e4b0a12345678902"
  ]
}
```

### Script-level constants (inside `extract-attachment-paths.js`)

| Constant | Default | Description |
|---|---|---|
| `BATCH_SIZE` | `500` | Number of Mongo `bulkWrite` ops per flush |
| `PATHS_PER_FILE` | `25000` | Max paths per output JSON batch file |
| `COLLECTION1` | `projects` | First collection name |
| `COLLECTION2` | `surveySubmissions` | Second collection name |
| `COLLECTION3` | `observationSubmissions` | Third collection name |

---

## 📥 Installation

```bash
npm install mongodb dotenv
```

---

## ▶️ Usage

### Extract paths only (read-only, no DB changes)

```bash
node extract-attachment-paths.js
```

### Extract paths **and** delete/clean attachment data from DB

```bash
node extract-attachment-paths.js --deletePaths
```

> ⚠️ `--deletePaths` is **destructive**. It clears all `attachments`, `answers.fileName`, `evidences`, and `evidencesStatus` fields on matched documents and sets `evidencesRemovedForDatacleanUp: true` to prevent reprocessing.

---

## 📤 Output

Each batch file is written to `output/<collection>/found/` (and `deleted/` when using `--deletePaths`):

```json
{
  "paths": [
    "project/64a1f3.../file1.jpeg",
    "survey/64b2e1.../file2.mp4"
  ],
  "count": 2
}
```

### Console output example

```bash
🌐 Mongo URL: mongodb://localhost:27017/elevate
✅ Connected
📄 [projects] 64a1f3c2e4b0a12345678901 → 4 files
📁 Written: output/projects/found/batch1.json  (25000 paths, total so far: 25000)
⏳ [surveySubmissions] 1000 docs processed
💾 [projects] Flushed 500 bulk ops
✅ [projects] Done — 3200 docs
   Found paths: { totalFiles: 2, totalPaths: 31500 }
   Deleted paths: { totalFiles: 2, totalPaths: 31500 }
🎉 DONE
📂 All output files are in: /path/to/output
🔌 Closed
```

---

## 🔍 What Gets Extracted

| Collection | Source Fields |
|---|---|
| `projects` | `attachments[].sourcePath`, `tasks[].attachments[].sourcePath` (recursive) |
| `surveySubmissions` | `answers[].fileName[].sourcePath`, `evidences[].submissions[].answers[].fileName[].sourcePath`, `evidencesStatus[].submissions[].answers[].fileName[].sourcePath` |
| `observationSubmissions` | Same as `surveySubmissions` |

---

