// Script to update user profiles in projects, surveySubmissions, and observationSubmissions collections based on userIds from input.js
// Variable declarations and dependencies
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const request = require('request');
const _ = require('lodash');
require('dotenv').config({ path: path.join(__dirname, '../../') + '/.env' });

const mongo_url = process.env.MONGODB_URL;
const userServiceUrl = process.env.USER_SERVICE_URL;
const inputFile = path.join(__dirname, 'input.js');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
const executionDate = Date.now(); // Milliseconds since epoch
const outputFile = path.join(outputDir, `output_${executionDate}.json`);
const batchSize = 25;


// Helper to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to fetch user profile using request and callback (private endpoint)
function profileReadPrivate(userId) {
  return new Promise(async (resolve, reject) => {
    try {
        console.log(`Fetching profile for userId: ${userId}`);
      //  <--- Important : This url endpoint is private do not use it for regular workflows --->
      let userReadEndpoint = '/private/user/v1/read';
      let url = userServiceUrl + userReadEndpoint + '/' + userId;
      const options = {
        headers: {
          'content-type': 'application/json'
        }
      };
      let result = { success: true };
      request.get(url, options, userReadCallback);
      function userReadCallback(err, data) {
        if (err) {
          result.success = false;
        } else {
          let response = JSON.parse(data.body);
          if (response.responseCode === 'OK') {
            result['data'] = response.result;
          } else {
            result.success = false;
          }
        }
        return resolve(result);
      }
      setTimeout(function () {
        return resolve((result = { success: false }));
      }, 5000);
    } catch (error) {
      return reject(error);
    }
  });
}

if (!mongo_url) {
  console.error('❌ MONGODB_URL not set');
  process.exit(1);
}

async function readInputUserIds() {
  if (!fs.existsSync(inputFile)) {
    console.error('❌ input.js not found');
    process.exit(1);
  }
  const userIds = require(inputFile);
  if (!Array.isArray(userIds)) {
    throw new Error('input.js must export an array of userIds');
  }
  return userIds;
}



async function main() {
  let connection;
  try {
    // Establish MongoDB connection
    connection = await MongoClient.connect(mongo_url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const db_name = mongo_url.split('/').pop();
    const db = connection.db(db_name);
    // Read userIds from input.js
    const userIds = await readInputUserIds();
    const chunks = _.chunk(userIds, batchSize);
    
    // Initialize logs and tracking variables
    let outputLog = [];
    let eligibleUserIds = [];
    let updatedUserIds = [];
    let updatedProjectIds = [];
    // Use a specific ISO date for filtering (e.g., 2025-08-24T00:00:00.000Z)
    const creationBoundary = '2025-08-24T00:00:00.000Z';

    for (const chunk of chunks) {
      for (const userId of chunk) {
        let logEntry = { userId, status: 'pending', error: null };
        try {
          // Fetch user profile (internal API call)
            let profile = await profileReadPrivate(userId);
            await delay(1000); // 1 second delay between API calls
            console.log(`Profile fetch result for userId ${userId}:`, profile);
            if (!(profile.success && profile.data && profile.data.response)) {
              logEntry.status = 'failed';
              logEntry.error = 'No profile data';
              outputLog.push(logEntry);
              continue;
            }
            let profileData = profile.data.response;
          
          // Check if userLocations has a school
          const hasSchool = Array.isArray(profileData.userLocations) && profileData.userLocations.some(loc => loc.type && loc.type.toLowerCase() === 'school');
          console.log(`UserId ${userId} has school in userLocations:`, hasSchool);
          if (!hasSchool) {
            logEntry.status = 'skipped';
            logEntry.error = 'No school in userLocations';
            outputLog.push(logEntry);
            continue;
          }
          eligibleUserIds.push(userId);
          // Update projects (last 6 months only)
          const projectUpdate = await db.collection('projects').updateMany(
            {
                userId,
                createdAt: { $gte: new Date(creationBoundary) }
            },
            { $set: { userProfile: profileData } }
          );
          // Update surveySubmissions (last 6 months only)
          const surveyUpdate = await db.collection('surveySubmissions').updateMany(
            {
              createdBy: userId,
                createdAt: { $gte: new Date(creationBoundary) }
            },
            { $set: { userProfile: profileData } }
          );
          // Update observationSubmissions (last 6 months only)
          const obsUpdate = await db.collection('observationSubmissions').updateMany(
            {
              createdBy: userId,
              createdAt: { $gte: new Date(creationBoundary) }
            },
            { $set: { userProfile: profileData } }
          );
          logEntry.status = 'success';
          logEntry.projectUpdate = projectUpdate.modifiedCount;
          logEntry.surveyUpdate = surveyUpdate.modifiedCount;
          logEntry.observationUpdate = obsUpdate.modifiedCount;
          updatedUserIds.push(userId);
        } catch (err) {
          logEntry.status = 'failed';
          logEntry.error = err.message || err;
        }
        outputLog.push(logEntry);
      }
    }
    
    // Write output log and update input.js after all chunks are processed
    const summary = {
      date: executionDate,
      eligibleUserIds,
      eligibleUserCount: eligibleUserIds.length,
      updatedUserIds,
      updatedUserCount: updatedUserIds.length,
      updatedProjectIds,
      updatedProjectCount: updatedProjectIds.length,
      details: outputLog
    };
    fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2), 'utf8');
    // Remove successfully updated userIds from input.js
    if (updatedUserIds.length > 0) {
      const remainingUserIds = userIds.filter(id => !updatedUserIds.includes(id));
      fs.writeFileSync(inputFile, `module.exports = ${JSON.stringify(remainingUserIds, null, 2)}`, 'utf8');
    }

    await connection.close();
  } catch (err) {
    console.error('❌ Fatal error:', err);
    if (connection) await connection.close();
    process.exit(1);
  }
}

main();
