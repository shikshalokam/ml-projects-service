/**
 * name : helper.js
 * author : Aman
 * created-date : 16-July-2020
 * Description : Project categories helper functionality.
 */

// Dependencies 
const kendraService = require(GENERICS_FILES_PATH + "/services/kendra");
const sessionHelpers = require(GENERIC_HELPERS_PATH+"/sessions");
const moment = require("moment-timezone");

/**
    * LibraryCategoriesHelper
    * @class
*/

module.exports = class LibraryCategoriesHelper {

      /**
   * Library project categories documents.
   * @method
   * @name categoryDocuments
   * @param {Object} [findQuery = "all"] - filtered data.
   * @param {Array} [fields = "all"] - projected data.
   * @param {Array} [skipFields = "none"] - fields to skip.
   * @returns {Array} - Library project categories data.
   */

  static categoryDocuments(
    findQuery = "all", 
    fields = "all",
    skipFields = "none"
  ) {
      return new Promise(async (resolve, reject) => {
        
        try {
          
          let queryObject = {};

          if (findQuery != "all") {
              queryObject = findQuery;
          }

          let projection = {};

          if (fields != "all") {
              fields.forEach(element => {
                  projection[element] = 1;
              });
          }

          if (skipFields != "none") {
              skipFields.forEach(element => {
                  projection[element] = 0;
              });
          }

          let projectCategoriesData = 
          await database.models.projectCategories.find(
            queryObject, 
            projection
          ).lean();
          
          return resolve(projectCategoriesData);

      } catch (error) {
          return reject(error);
        }
      });
    }

      /**
      * List of library projects.
      * @method
      * @name projects
      * @param categoryId - category external id.
      * @param pageSize - Size of page.
      * @param pageNo - Recent page no.
      * @param search - search text.
      * @param sortedData - Data to be sorted.
      * @returns {Object} List of library projects.
     */

    static projects( categoryId,pageSize,pageNo,search,sortedData ) {
        return new Promise(async (resolve, reject) => {
            try {

                let matchQuery = {
                    $match : {
                        status : CONSTANTS.common.PUBLISHED,
                        "isReusable" : true
                    }
                };

                if( categoryId !== "" ) {
                    matchQuery["$match"]["categories.externalId"] = categoryId;
                }

                if ( search !== "" ) {
                    matchQuery["$match"]["$or"] = [
                        { "title": new RegExp(search, 'i') },
                        { "descripion": new RegExp(search, 'i') },
                        { "categories": new RegExp(search, 'i') }
                    ]
                }

                let aggregateData = [];
                aggregateData.push(matchQuery);

                let sortedQuery = {
                    "$sort" : {
                        createdAt : -1
                    }  
                }
                
                if( sortedData && sortedData === CONSTANTS.common.IMPORTANT_PROJECT ) {
                    sortedQuery["$sort"] = {};
                    sortedQuery["$sort"]["noOfRatings"] = -1;
                }
                
                aggregateData.push(sortedQuery);

                aggregateData.push({
                    $project : {
                        "title" : 1,
                        "externalId" : 1,
                        "noOfRatings" : 1,
                        "averageRating" : 1,
                        "createdAt" : 1,
                        "description" : 1,
                        "categories" : 1
                    }
                },{
                    $facet : {
                        "totalCount" : [
                            { "$count" : "count" }
                        ],
                        "data" : [
                            { $skip : pageSize * ( pageNo - 1 ) },
                            { $limit : pageSize }
                        ],
                    }
                },{
                    $project : {
                        "data" : 1,
                        "count" : {
                            $arrayElemAt : ["$totalCount.count", 0]
                        }
                    }
                });

                let result = 
                await database.models.projectTemplates.aggregate(aggregateData);

                if( result[0].data.length > 0 ) {
                    
                    result[0].data.forEach(resultedData => {
                        
                        let timeDifference = 
                        moment().diff(moment(resultedData.createdAt), 'days');

                        resultedData.new = false;
                        if( timeDifference <= 7 ) {
                            resultedData.new = true;
                        }
                    })
                }

                return resolve({
                    success: true,
                    message : CONSTANTS.apiResponses.PROJECTS_FETCHED,
                    data : {
                        data : result[0].data,
                        count : result[0].count ? result[0].count : 0
                    }
                });

            } catch (error) {
                return resolve({
                    success: false,
                    message: error.message,
                    data: []
                });
            }
        })
    }

    /**
      * Update categories
      * @method
      * @name update
      * @param filterQuery - Filter query.
      * @param updateData - Update data.
      * @returns {Object} updated data
     */

    static update(filterQuery,updateData) {    
        return new Promise(async (resolve, reject) => {
            try {

                let categoriesUpdated = 
                await database.models.projectCategories.updateMany(
                    filterQuery,
                    updateData
                );

                if( !categoriesUpdated.ok ) {
                    throw {
                        status : HTTP_STATUS_CODE['bad_request'].status,
                        message : CONSTANTS.apiResponses.PROJECT_CATEGORIES_NOT_UPDATED
                    }
                }

                return resolve({
                    success: true,
                    message : CONSTANTS.apiResponses.PROJECT_CATEGORIES_UPDATED,
                    data : categoriesUpdated
                });

            } catch (error) {   
                return resolve({
                    success: false,
                    message: error.message,
                    data : {}
                });
            }
        })
    }

};
