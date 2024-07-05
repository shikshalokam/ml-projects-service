/**
 * name : deleteDuplicateRecords.js
 * author : Saish Borkar
 * created-date : 1 Jul 2024
 * Description : Delete duplicate records having same userId and solutionId to enforce compound key 
 *               and data integrity
 */

const path = require("path");
let rootPath = path.join(__dirname, "../../");
require("dotenv").config({ path: rootPath + "/.env" });
const {validate : uuidValidate,v4 : uuidV4} = require('uuid');
let _ = require("lodash");
let mongoUrl = process.env.MONGODB_URL;
let dbName = mongoUrl.split("/").pop();
let url = mongoUrl.split(dbName)[0];
var MongoClient = require("mongodb").MongoClient;

var fs = require("fs");

function generateUUId() {
    return uuidV4();
  }
  

(async () => {
  let connection = await MongoClient.connect(url, { useNewUrlParser: true });
  let db = connection.db(dbName);

  try {
    let pipeline = [
      {
        $match: {
          userId: { $exists: true, $ne: null },
          solutionId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { solutionId: "$solutionId", userId: "$userId" },
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          duplicateCount: "$count",
          duplicateArray: "$docs",
        },
      },
    ];
    let duplicateArray = await db
      .collection("projects")
      .aggregate(pipeline)
      .toArray();

    let duplicateProjectsChunk = _.chunk(duplicateArray,100);
    let successfullyDeletedRecords = [];
    let failedToDeletedRecords = [];

    for(let i=0;i<duplicateProjectsChunk.length;i++)
      {
        let currentChunk = duplicateProjectsChunk[i];
        for (let duplicateRecord of currentChunk) {
          try {
    
            let duplicateArray = duplicateRecord.duplicateArray;
            let completedProjects = [];
            let inCompleteProjects = [];
            let inProgressProjects = [];
            let toBeDeletedRecords = [];
    
            for (let i = 0; i < duplicateArray.length; i++) {
              if (duplicateArray[i].status == "submitted") {
                completedProjects.push(duplicateArray[i]);
              } else if (duplicateArray[i].status == "started") {
                inCompleteProjects.push(duplicateArray[i]);
              }else if(duplicateArray[i].status == 'inProgress'){
                inProgressProjects.push(duplicateArray[i])
              }
            }
    
            completedProjects.sort(sortByCreatedAtDescending);
            inCompleteProjects.sort(sortByCreatedAtDescending);
            inProgressProjects.sort(sortByCreatedAtDescending);
    
            if (completedProjects.length > 0) {
              let firstRecord = completedProjects[0];
    
              for (let i = 1; i < completedProjects.length; i++) {
                toBeDeletedRecords.push(completedProjects[i]);
              }
    
              for (let i = 0; i < inProgressProjects.length; i++) {
                toBeDeletedRecords.push(inProgressProjects[i]);
              }
    
              for (let i = 0; i < inCompleteProjects.length; i++) {
                toBeDeletedRecords.push(inCompleteProjects[i]);
              }
    
            } else if(inProgressProjects.length > 0){
                let firstRecord = inProgressProjects[0];
    
                for (let i = 1; i < inProgressProjects.length; i++) {
                    toBeDeletedRecords.push(inProgressProjects[i]);
                  }
    
                  for (let i = 0; i < inCompleteProjects.length; i++) {
                    toBeDeletedRecords.push(inCompleteProjects[i]);
                  }
    
            }
              else if (inCompleteProjects.length > 0) {
              let firstRecord = inCompleteProjects[0];
              for (let i = 1; i < inCompleteProjects.length; i++) {
                toBeDeletedRecords.push(inCompleteProjects[i]);
              }
            }
    
            const idsToDelete = toBeDeletedRecords.map((record) => record._id);

            const result = await db.collection("projects").deleteMany({
              _id: { $in: idsToDelete },
            });

            if (result.deletedCount === toBeDeletedRecords.length) {
              successfullyDeletedRecords.push(...idsToDelete);
            } else{

              const NotDeletedRecords = await db.collection("observations").find({
                _id: { $in: idsToDelete },
              }).toArray();

              const idsFailedToDelete = NotDeletedRecords.map((record) => record._id);

              failedToDeletedRecords.push(...idsFailedToDelete);

            } 
    
          } catch (e) {
            console.log(e);
            continue;
          }
        }

      }
    fs.writeFileSync('successfully_deleted_duplicated_records' + generateUUId()+'.js',JSON.stringify(successfullyDeletedRecords))
    fs.writeFileSync('failed_to_deleted_duplicated_records' + generateUUId()+'.js',JSON.stringify(failedToDeletedRecords))
    console.log('Script execution completed');
    connection.close();
  } catch (error) {
    console.log(error);
  }
})().catch((err) => console.error(err));


const sortByCreatedAtDescending = (a, b) => {
    if (a.createdAt > b.createdAt) {
      return -1; // a should come before b in sorted order (latest first)
    } else if (a.createdAt < b.createdAt) {
      return 1; // b should come before a
    } else {
      return 0; // timestamps are equal
    }
  };