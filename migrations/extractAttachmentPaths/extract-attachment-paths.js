const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';

const DB1 = 'elevate-project';
const COLLECTION1 = 'projects';

const DB2 = 'elevate-samiksha';
const COLLECTION2 = 'surveySubmissions';
const COLLECTION3 = 'observationSubmissions';

const programIds = ["600ab53cc7de076e6f993724"];

// 🔁 Extract from tasks
function extractAttachmentsFromTasks(tasks = []) {
    let paths = [];

    tasks.forEach(task => {
        if (task.attachments) {
            task.attachments.forEach(att => {
                if (att?.sourcePath) paths.push(att.sourcePath);
            });
        }

        if (task.children?.length) {
            paths = paths.concat(extractAttachmentsFromTasks(task.children));
        }
    });

    return paths;
}

// 🔥 SAFE FILE EXTRACTOR
function extractFilesFromAnswers(answers = {}) {
    let paths = [];

    Object.values(answers).forEach(ans => {
        if (!ans) return;

        const files = ans.fileName;

        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file?.sourcePath) paths.push(file.sourcePath);
            });
        } else if (files?.sourcePath) {
            // handle object case
            paths.push(files.sourcePath);
        }
    });

    return paths;
}

// 🔥 COMMON extractor (FIXED)
function extractSubmissionPaths(doc) {
    let paths = [];

    // 1️⃣ Root answers
    if (doc.answers) {
        paths = paths.concat(extractFilesFromAnswers(doc.answers));
    }

    // 2️⃣ evidences → submissions → answers
    if (doc.evidences) {
        Object.values(doc.evidences).forEach(ev => {
            ev?.submissions?.forEach(sub => {
                if (sub.answers) {
                    paths = paths.concat(extractFilesFromAnswers(sub.answers));
                }
            });
        });
    }

    // 3️⃣ EXTRA SAFETY: evidencesStatus (for observation edge cases)
    if (doc.evidencesStatus) {
        doc.evidencesStatus.forEach(ev => {
            ev?.submissions?.forEach(sub => {
                if (sub.answers) {
                    paths = paths.concat(extractFilesFromAnswers(sub.answers));
                }
            });
        });
    }

    return paths;
}

async function main() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log("✅ Connected");

        const objectIds = programIds.map(id => new ObjectId(id));

        let allPaths = [];

        // =============================
        // 🔹 PROJECTS
        const col1 = client.db(DB1).collection(COLLECTION1);

        const cursor1 = col1.find(
            { programId: { $in: objectIds } },
            { projection: { attachments: 1, tasks: 1 } }
        );

        while (await cursor1.hasNext()) {
            const doc = await cursor1.next();

            doc.attachments?.forEach(att => {
                if (att?.sourcePath) allPaths.push(att.sourcePath);
            });

            if (doc.tasks) {
                allPaths = allPaths.concat(extractAttachmentsFromTasks(doc.tasks));
            }
        }

        // =============================
        // 🔹 SAMIKSHA DB
        const db2 = client.db(DB2);

        // Survey
        const cursor2 = db2.collection(COLLECTION2).find(
            { programId: { $in: objectIds } },
            { projection: { answers: 1, evidences: 1, evidencesStatus: 1 } }
        );

        while (await cursor2.hasNext()) {
            const doc = await cursor2.next();
            allPaths = allPaths.concat(extractSubmissionPaths(doc));
        }

        // Observation
        const cursor3 = db2.collection(COLLECTION3).find(
            { programId: { $in: objectIds } },
            { projection: { answers: 1, evidences: 1, evidencesStatus: 1 } }
        );

        while (await cursor3.hasNext()) {
            const doc = await cursor3.next();
            allPaths = allPaths.concat(extractSubmissionPaths(doc));
        }

        // =============================
        console.log("📊 BEFORE UNIQUE:", allPaths.length);

        const uniquePaths = [...new Set(allPaths)];

        console.log("📦 FINAL PATHS:");
        console.log(uniquePaths);

        console.log(`✅ Total Unique Paths: ${uniquePaths.length}`);

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
        console.log("🔌 Closed");
    }
}

main();