/**
 * name : updatePrivateProgramInProject.js
 * author : Ankit Shahu
 * created-date : 02-Feb-2023
 * Description : Migration script for update project
 */

const path = require("path");
let rootPath = path.join(__dirname, '../../')
require('dotenv').config({ path: rootPath+'/.env' })

let _ = require("lodash");
let mongoUrl = process.env.MONGODB_URL;
let dbName = mongoUrl.split("/").pop();
let url = mongoUrl.split(dbName)[0];
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var request = require('request');
var fs = require('fs');
const { at } = require("lodash");

const filePathUrl = "https://samikshaprod.blob.core.windows.net/samiksha/";


(async () => {
    
    let connection = await MongoClient.connect(url, { useNewUrlParser: true });
    let db = connection.db(dbName);
    try {
        // check project attachments for isUploaded = false data and remove the attachment object
        let collectionDocs = await db.collection("projects").find({    
            "$or": [
                {
                    "attachments.isUploaded": {
                        "$exists": true
                    },"attachments.isUploaded": false 
                },
                {
                    "tasks.attachments.isUploaded": {
                        "$exists": true
                    },"tasks.attachments.isUploaded": false
                }
            ]
        }).project({_id:1}).toArray();
  
        //varibale to store all projectIds which are updated
        let projectIds = [];
        collectionDocs.forEach( eachDoc => {
            projectIds.push(eachDoc._id);
        })
      
        let chunkOfProjectIds = _.chunk(projectIds, 5);
        let UpdatedProjectId = []
        //loop project chunks
        for ( let chunkPointer = 0; chunkPointer < chunkOfProjectIds.length; chunkPointer++ ) {
           
            //chunk of project ids
            let projectId = chunkOfProjectIds[chunkPointer];

            //loop for chunk of project id in chunk
            for ( let projectIdpointer = 0 ; projectIdpointer < projectId.length; projectIdpointer++ ) {
                let id = projectId[projectIdpointer];
                
                //pull project Data from DB 
                let pullProjectData = await db.collection("projects").find({
                    _id: id
                }).project({}).toArray({})

                //store in varibale to avoid using [0]
                pullProjectData = pullProjectData[0]

                //update Object
                let updateObject = {
                    "$set" : {}
                }

                //check if project Document has attachments or not if present then checks length of attachment it should be greater than 0
                if( pullProjectData.hasOwnProperty('attachments') && pullProjectData.attachments.length > 0 ) {

                    //varibale to store updated attachment objects
                    let attachmentsPresent = []

                    //for loop for each attachment
                    for(let j = 0; j< pullProjectData.attachments.length; j++){

                        //check if isUploaded key is present or not and isUploaded should be false and checks type of attachment 
                        if(pullProjectData.attachments[j].hasOwnProperty("isUploaded") && !pullProjectData.attachments[j].isUploaded && pullProjectData.attachments[j].type !== "link"){

                            //checks if document is present or not
                            let documentExist = await getDocumentStatus( pullProjectData.attachments[j].sourcePath)
                            //if present then push object to new array and update isUploaded to true
                            if(documentExist.success){
                                pullProjectData.attachments[j].isUploaded = true
                                attachmentsPresent.push(pullProjectData.attachments[j])
                            }
                        }else{
                            //if isUploaded is not present then push object to new array and if type is link then also
                            attachmentsPresent.push(pullProjectData.attachments[j])
                        }
                    }
                    //assign attachmentPresent object to update variable
                    updateObject['$set']['attachments'] = attachmentsPresent
                }

                //check if project has tasks available and length of tasks array should be greater than 0   
                if( pullProjectData.hasOwnProperty('tasks') && pullProjectData.tasks.length > 0){


                    //varibale to store updated task objects
                    let newTaskWithValidatedAttachments = []
                    //for loop for each task
                    for(let j = 0; j< pullProjectData.tasks.length; j++){

                        //store task object in task
                        let task = pullProjectData.tasks[j]

                        //checks if task object has key attachment present or not
                        if(task.hasOwnProperty("attachments")){

                            //varible to store attachment object of task
                            let attachmentsPresent = []


                            //for loop for each attachment in each task
                            for(let k = 0; k < task.attachments.length; k++){

                                //check if isUploaded key is present or not and isUploaded should be false and checks type
                                if(task.attachments[k].hasOwnProperty("isUploaded") && !task.attachments[k].isUploaded && task.attachments[k].type !== "link"){

                                    //checks if document is present or not
                                    let documentExist = await getDocumentStatus( task.attachments[k].sourcePath)
                                    //if present then push object to new array and update isUploaded to true
                                    if(documentExist.success){
                                        task.attachments[k].isUploaded = true
                                        attachmentsPresent.push(task.attachments[k])
                                    }
                                }else{
                                    //if isUploaded is not present then push object to new array and if type is link then also
                                    attachmentsPresent.push(task.attachments[k])
                                }
                            }
                            //assign attachmentPresent array to task attachments
                            task.attachments = attachmentsPresent
                        }
                        //push task to new array of tasks key
                        newTaskWithValidatedAttachments.push(task)
                    }
                    //assign all valid task to task for update
                    updateObject['$set']['tasks'] = newTaskWithValidatedAttachments
                }
                //push project id which is validated
                UpdatedProjectId.push(id)
                //update project with new varibales
                await db.collection("projects").updateOne({_id:id},updateObject)
            }
            
            
        }
        console.log(UpdatedProjectId)

        //function to check if document exists
        function getDocumentStatus (sourcePath) {
            return new Promise(async (resolve, reject) => {
                try {
                    //  <--- Important : This url endpoint is private do not use it for regular workflows --->
                    let url = filePathUrl + sourcePath;
                    const options = {
                        headers : {
                        }
                    };
                    request.get(url,options,userReadCallback);
                    let result = {
                        success : true
                    };
                    function userReadCallback(err, data) { 
                        if (err) {
                            result.success = false;
                        } else {
                            // let response = JSON.parse(data.body);
                            console.log(data.statusCode)
                            if( data.statusCode === 200 ) {
                                result.success = true;
                            } else {
                                result.success = false;
                            }
        
                        }   
                        return resolve(result);
                    }
                    setTimeout(function () {
                        return resolve (result = {
                            success : false
                         });
                     }, 5000);
        
                } catch (error) {
                    return reject(error);
                }
            })
        }

        fs.writeFile(
            'updatedProjectWithAttachments.json',

            JSON.stringify({updatedProjectIds: UpdatedProjectId}),

            function (err) {
                if (err) {
                    console.error('Crap happens');
                }
            }
        );
        

        console.log("finished project attachment deletion based on isUploaded:= false, completed...")
        connection.close();
    }
    catch (error) {
        console.log(error)
    }
})().catch(err => console.error(err));


