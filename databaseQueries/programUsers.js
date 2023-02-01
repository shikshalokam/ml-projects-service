module.exports= class Programs{
    static findProgramJoined(programId,userId) {
        return new Promise(async (resolve, reject) => {
            try {
               let queryObject = {
                programId :programId,
                userId: userId
               }
               
               
               let programJoinedData = 
               await database.models.programUsers.find(
                   queryObject, 
                   {}
               ).lean();
               return resolve(programJoinedData);
           
           } catch (error) {
               return reject(error);
           }
       });
   }
}