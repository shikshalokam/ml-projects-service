/**
 * name : deltaDataMigrationScriptOfProjects.js
 * author : Vishnu
 * created-date : 27-04-2023
 * Description : Delta data migration script to OCI database 
 */

// Dependencies
const path = require("path");
let rootPath = path.join(__dirname, '../../')
require('dotenv').config({ path: rootPath+'/.env' })
let _ = require("lodash");
var MongoClient = require('mongodb').MongoClient;
const kafkaProducersHelper = require(rootPath + "/generics/kafka/producers");
var fs = require('fs');

// DB credentials 
let mongoUrlOfOCIDb = process.env.MONGODB_URL;
let ociDbName = mongoUrlOfOCIDb.split("/").pop();
let DbUrl = mongoUrlOfOCIDb.split(ociDbName)[0];
let azureDbName = "sl-prod-old";

(async () => {
    // Azure DB connection && OCI db connection
    let connection = await MongoClient.connect(DbUrl, { useNewUrlParser: true });
    let db_Azure = connection.db(azureDbName);
    let db_OCI = connection.db(ociDbName);
   
    try {
        console.log("--------------------Execution Started------------------")
        const fromDate = new Date('2023-04-18T00:00:00Z'); // Specify the date from which to fetch data
        let addedProjects = [];

        let projectsDetailsFromAzureDb = await db_Azure.collection('projects').find({
            createdAt: {"$gte": fromDate},
        }).project({_id:1}).toArray();

        // Get project Ids 
        projectIdsFromAzureDb = await getArrayOfMongoIds(projectsDetailsFromAzureDb);

        // Get data from OCI-mongo database
        let projectsDetailsFromOCIDb = await db_OCI.collection('projects').find({
        }).project({_id:1}).toArray();

        // Get project Ids 
        projectIdsFromOCIDb = await getArrayOfMongoIds(projectsDetailsFromOCIDb)

        let missingProjectIds = _.differenceWith(projectIdsFromAzureDb, projectIdsFromOCIDb,_.isEqual);

        if ( missingProjectIds.length > 0 ){
            await createDataInOCIdatabaseCollection(missingProjectIds,"projects");
        }

        /**
         * getArrayOfMongoIds 
         * @param {Array} data 
         * @request - [{6025062519f84e54685df33f}]
         * @returns {Array} - [6025062519f84e54685df33f]
         */
        async function getArrayOfMongoIds( data ) {
            // get mongoIds 
            let mongoIdsArray = [];
            if ( data.length > 0 ) {
                mongoIdsArray = data.map(function (obj) {
                    return obj._id;
                });
                return mongoIdsArray;
            } else {
                return mongoIdsArray;
            }
        }

        /**
         * createDataInOCIdatabaseCollection
         * @param {Array} mongoIds - project _ids
         * @param {String} collectionName
         */
        async function createDataInOCIdatabaseCollection (mongoIds,collectionName) {
            try{
                // Get entire project data from Db
                let collectionDetailsFromAzureDb = await db_Azure.collection(collectionName).find({
                    _id: {"$in": mongoIds},
                }).project().toArray();
    
                let chunkOfDocument = _.chunk(collectionDetailsFromAzureDb, 10);
                for ( let chunkOfDocumentIndex = 0; chunkOfDocumentIndex < chunkOfDocument.length; chunkOfDocumentIndex++ ) {
                    await insertIntoOCIDatabase(chunkOfDocument[chunkOfDocumentIndex],collectionName);
                }        
            }catch(err){
                console.log("error occured")
            }
        }

        /**
         * insertIntoOCIDatabase
         * @param {Object} data - project data
         * @param {String} collectionName 
         */
        async function insertIntoOCIDatabase (data,collectionName) {
            try{
                let createDoc = await db_OCI.collection(collectionName).insertMany(data);
                if(createDoc.ops && createDoc.ops.length > 0 ) {
                    for (let index=0; index < createDoc.ops.length; index++) {
                        addedProjects.push(createDoc.ops[index]._id)
                        await kafkaProducersHelper.pushProjectToKafka(createDoc.ops[index]);
                    }
                }          
            }catch(err){
                console.log("error occured")
            }
        }

        // Write script exicution result into a file
       if ( addedProjects.length > 0 ) {
            //write updated project ids to file
            fs.writeFile(
                'AddedProjectIds.json',

                JSON.stringify({projectIds:addedProjects}),

                function (err) {
                    if (err) {
                        console.error('Crap happens');
                    }
                }
            );
        }
        console.log("Added Project Count : ", addedProjects.length)
        connection.close();
        console.log("--------------------Execution Finished------------------")

    }
    catch (error) {
        console.log(error)
    }
})().catch(err => console.error(err));