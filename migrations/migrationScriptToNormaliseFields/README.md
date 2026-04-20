# Role Normalisation Migration Script

## Purpose

This script normalises the following fields to lowercase across multiple MongoDB collections:

* `userRoles`
* `userRoleInformation.roles`

Supported formats:

* String
* CSV string
* Array of strings
* Array of objects with `{ code }`

Collections processed:

* projects
* programs
* surveys
* observations
* surveySubmissions
* observationSubmissions

---

## Prerequisites

1. Node.js installed
2. MongoDB connection string available in `.env`

Example `.env`:

```
MONGODB_URL=mongodb://localhost:27017/your-db
```

---

## Script Location

```
migrations/migrationScriptToNormaliseFields/
```

---

## Execution Modes

### 1) Read Mode (Dry Run)

No data is modified. The script only reports which documents would be updated.

```
node normaliseFieldsInDB.js \
--fromDate=2026-01-01 \
--toDate=2026-01-31
```

---

### 2) Write Mode (Actual Update)

Updates the database.

```
node normaliseFieldsInDB.js \
--fromDate=2026-01-01 \
--toDate=2026-01-31 \
--mode=write
```

---

## Parameters

| Parameter    | Required | Description                 |
| ------------ | -------- | --------------------------- |
| `--fromDate` | Yes      | Start date (inclusive)      |
| `--toDate`   | Yes      | End date (inclusive)        |
| `--mode`     | No       | `read` (default) or `write` |

Supported date formats:

```
YYYY-MM-DD
YYYY-MM-DDTHH:mm:ss
```

---

## Output

After execution, a report file is created:

```
output/<timestamp>.js
```

The report contains:

* Documents scanned
* Documents matched for update
* Documents successfully modified
* List of document IDs
* Batch statistics
* Execution status

---

## Recommended Execution Flow

1. Run in **read mode** first
2. Review output file
3. Run in **write mode**
4. Validate results
