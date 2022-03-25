/**
 * name : observations.js
 * author : Priyanka Pradeep
 * created-date : 25-Mar-2022
 * Description : Observation helper for DB interactions.
 */

// Dependencies 

/**
    * Observations
    * @class
*/



module.exports= class Observations{
    /**
     * Observation details.
     * @method
     * @name observationDocument
     * @param {Array} [filterData = "all"] - solutions filter query.
     * @param {Array} [fieldsArray = "all"] - projected fields.
     * @param {Array} [skipFields = "none"] - field not to include
     * @returns {Array} solutions details.
     */
    
     static observationDocument(
        filterData = "all", 
        fieldsArray = "all",
        skipFields = "none"
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                let queryObject = (filterData != "all") ? filterData : {};
                let projection = {}
           
                if (fieldsArray != "all") {
                    fieldsArray.forEach(field => {
                        projection[field] = 1;
                   });
               }
               
               if( skipFields !== "none" ) {
                   skipFields.forEach(field=>{
                       projection[field] = 0;
                   });
               }
               let observationDoc = 
               await database.models.observations.find(
                   queryObject, 
                   projection
               ).lean();
           
               return resolve(observationDoc);
           
           } catch (error) {
               return reject(error);
           }
       });
   }
}