# 📦 MongoDB Attachment Extractor

This Node.js script connects to multiple MongoDB databases and extracts all unique file `sourcePath` values from:

- Projects (`projects` collection)
- Survey Submissions (`surveySubmissions`)
- Observation Submissions (`observationSubmissions`)

It recursively scans nested structures like tasks, evidences, and submissions to ensure **no attachment is missed**.

---

## 🚀 Features

- 🔗 Connects to multiple MongoDB databases
- 📂 Extracts attachments from:
  - Project-level attachments
  - Nested task attachments (recursive)
  - Survey submissions (answers + evidences)
  - Observation submissions (answers + evidences)
- 🔍 Handles deeply nested JSON structures
- ♻️ Removes duplicate file paths
- 📊 Outputs total unique paths

---

## 🏗️ ML-PROJECT-SERVICE
├── extract-attachment-paths.js
└── README.md



---

## ⚙️ Configuration

Update the following variables inside `extract-attachment-paths.js`:

```
    const MONGO_URI = 'mongodb://localhost:27017';

    const DB1 = 'elevate-project';
    const COLLECTION1 = 'projects';

    const DB2 = 'elevate-samiksha';
    const COLLECTION2 = 'surveySubmissions';
    const COLLECTION3 = 'observationSubmissions';

    const programIds = [
        "YOUR_PROGRAM_ID_HERE"
    ];
```


---

## 📥 Installation

Install dependency:

```bash
npm install mongodb
```

---

## ▶️ Usage

Run the script:

```bash
node extract-attachment-paths.js
```

---

## 📤 Output Example

```bash
✅ Connected

📊 BEFORE UNIQUE: 9

📦 FINAL PATHS:
[
  'project/.../file1.jpeg',
  'project/.../file2.jpeg',
  'project/.../file3.mp4',
  'survey/.../file4.jpg',
  '60084870a9f3e126788113e8/...png'
]

✅ Total Unique Paths: 9

🔌 Closed
```
---