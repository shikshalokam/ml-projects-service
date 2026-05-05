#  Clean Admin-Teacher Profile Types

## 📌 Overview

This script scans and optionally cleans invalid `profileUserTypes` entries across MongoDB collections:

- projects
- surveySubmissions
- observationSubmissions

---

## 🎯 Purpose

Find entries inside:

`userProfile.profileUserTypes`

Where:
- `subType` starts with `"teacher"` (case-insensitive)
- AND `type === "administrator"`

---

## Run Modes
 
### 1. Scan Only (default)
 
Finds all matching docs and writes their IDs + matched entries to `output/<collection>/found/`. **Does NOT modify the database.**
 
```bash
node clean-admin-teacher-profile-types.js
```
 

### 2. Delete Mode
 
Removes the matched `profileUserTypes` entries from the database and writes the deleted records to `output/<collection>/deleted/`.
 
```bash
node clean-admin-teacher-profile-types.js --deleteType
```
 

 
---
 
### 📅 Filters Applied

Only documents where:
```bash
createdAt >= 2025-05-01
```
---

### 📂 Folder Structure

```bash
clean-admin-teacher-profile-types/
├── clean-admin-teacher-profile-types.js
└── output/
    ├── projects/
    │   ├── found/
    │   │   ├── batch1.json
    │   └── deleted/
    │       └── batch1.json
    ├── surveySubmissions/
    │   ├── found/
    │   └── deleted/
    └── observationSubmissions/
        ├── found/
        └── deleted/

```
---

### 📄 Output Format

Each batch file:
```bash
{
  "records": [
    {
      "docId": "DOCUMENT_ID",
      "matchedTypes": [
        {
          "subType": "teacher_example",
          "type": "administrator"
        }
      ]
    }
  ],
  "count": 1
}
```
---

 
| Folder | Contents |
|---|---|
| `found/` | All docs that have matching entries (scan result) |
| `deleted/` | Docs whose entries were actually removed from DB (`--deleteType` only) |
 
---
 
## Important Notes
 
### Idempotency
Once a document is processed in `--deleteType` mode, it is flagged with:
```
profileUserTypesCleanedForDataCleanUp: true
```
Re-running the script will **skip already-processed documents**, making it safe to run multiple times.
 
### createdAt Storage Type Difference
| Collection | `createdAt` stored as |
|---|---|
| `projects` | **BSON ISODate** — `ISODate("2021-01-20...")` |
| `surveySubmissions` | **BSON ISODate** — `ISODate("2021-01-20...")` |
| `observationSubmissions` | **BSON ISODate** — `ISODate("2021-01-20...")` |
 
 

---
 
## Example Console Output
 
```bash
🌐 Mongo URL: mongodb://localhost:27017/testdb

🚀 Mode: --deleteType (WILL MODIFY DB)
📅 Filtering docs created on or after: 2025-05-01T00:00:00.000Z
🎯 Target: profileUserTypes entries where subType starts with 'teacher' AND type === 'administrator'

(node:34034) [MONGODB DRIVER] Warning: Current Server Discovery and Monitoring engine is deprecated, and will be removed in a future version. To use the new Server Discover and Monitoring engine, pass option { useUnifiedTopology: true } to the MongoClient constructor.
(Use `node --trace-warnings ...` to show where the warning was created)
✅ Connected to MongoDB


✅ [surveySubmissions] Done
   Total docs scanned : 0
   Docs with matches  : 0
   Found  output      : { totalFiles: 0, totalRecords: 0 }
   Deleted output     : { totalFiles: 0, totalRecords: 0 }
📄 [projects] 682606274836050014075f0b → 14 admin-teacher entries found
💾 [projects] Flushed 1 bulk ops
📁 Written: /home/user4/Workspace/fork/ml-projects-service/migrations/clean-admin-teacher-profile-types/output/projects/found/batch1.json  (1 records, total so far: 1)
📁 Written: /home/user4/Workspace/fork/ml-projects-service/migrations/clean-admin-teacher-profile-types/output/projects/deleted/batch1.json  (1 records, total so far: 1)

✅ [projects] Done
   Total docs scanned : 1
   Docs with matches  : 1
   Found  output      : { totalFiles: 1, totalRecords: 1 }
   Deleted output     : { totalFiles: 1, totalRecords: 1 }
📄 [observationSubmissions] 69f19614aa4be39a89f19ba1 → 14 admin-teacher entries found
📄 [observationSubmissions] 69f19614aa4be39a89f19ba2 → 14 admin-teacher entries found
💾 [observationSubmissions] Flushed 2 bulk ops
📁 Written: /home/user4/Workspace/fork/ml-projects-service/migrations/clean-admin-teacher-profile-types/output/observationSubmissions/found/batch1.json  (2 records, total so far: 2)
📁 Written: /home/user4/Workspace/fork/ml-projects-service/migrations/clean-admin-teacher-profile-types/output/observationSubmissions/deleted/batch1.json  (2 records, total so far: 2)

✅ [observationSubmissions] Done
   Total docs scanned : 2
   Docs with matches  : 2
   Found  output      : { totalFiles: 1, totalRecords: 2 }
   Deleted output     : { totalFiles: 1, totalRecords: 2 }

🎉 ALL DONE
📂 Output files are in: /home/user4/Workspace/fork/ml-projects-service/migrations/clean-admin-teacher-profile-types/output
🔌 MongoDB connection closed
```
 
---