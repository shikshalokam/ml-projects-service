/**
 * name : helper.js
 * author : Aman
 * created-date : 16-July-2020
 * Description : Project categories helper functionality.
 */

// Dependencies 
const kendraService = require(GENERICS_FILES_PATH + "/services/kendra");
const sessionHelpers = require(GENERIC_HELPERS_PATH+"/sessions");
const projectCategoriesService = require(DB_SERVICE_BASE_PATH + "/projectCategories");
const projectTemplateService = require(DB_SERVICE_BASE_PATH + "/projectTemplates");
const moment = require("moment-timezone");

/**
    * LibraryCategoriesHelper
    * @class
*/

module.exports = class LibraryCategoriesHelper {

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

                let result = await projectTemplateService.getAggregate(aggregateData);

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

                let categoriesUpdated = await projectCategoriesService.updateMany(filterQuery,updateData);

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
