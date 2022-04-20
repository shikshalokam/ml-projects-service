/**
 * name : helper.js
 * author : Aman
 * created-date : 03-sep-2020
 * Description : Solution related helper functionality.
 */

// Dependencies

const coreService = require(GENERICS_FILES_PATH + "/services/core");
const solutionsQueries = require(DB_QUERY_BASE_PATH + "/solutions");

/**
    * SolutionsHelper
    * @class
*/
module.exports = class SolutionsHelper {

  /**
   * Create solution.
   * @method create
   * @name create
   * @param {Object} requestedData - solution creation data.
   * @param {String} token - Logged in user token.
   * @returns {Object} solution creation data. 
   */
  
  static create(requestedData,token) {
    return new Promise(async (resolve, reject) => {
        try {

            requestedData.type = requestedData.subType = CONSTANTS.common.IMPROVEMENT_PROJECT;
            requestedData.resourceType = [CONSTANTS.common.RESOURCE_TYPE];
            requestedData.language = [CONSTANTS.common.ENGLISH_LANGUAGE];
            requestedData.keywords = [CONSTANTS.common.KEYWORDS];
            requestedData.isDeleted = false;
            requestedData.isReusable = false;
            
            let solutionCreated = 
            await coreService.createSolution(requestedData,token);

            if( !solutionCreated.success ) {
              throw {
                message : CONSTANTS.apiResponses.IMPROVEMENT_PROJECT_SOLUTION_NOT_CREATED
              }
            }

            return resolve({
              success : true,
              message : CONSTANTS.apiResponses.IMPROVEMENT_PROJECT_SOLUTION_CREATED,
              data : solutionCreated.data
            });
            
        } catch (error) {
            return resolve({
              success : false,
              message : error.message
            });
        }
    });
  }

  /**
  * Update User District and Organisation In Solutions For Reporting.
  * @method
  * @name _addReportInformationInSolution 
  * @param {String} solutionId - solution id.
  * @param {Object} userProfile - user profile details
  * @returns {Object} Solution information.
*/

  static addReportInformationInSolution(solutionId,userProfile) {
    return new Promise(async (resolve, reject) => {
        try {

            //check solution & userProfile is exist
            if ( solutionId && Object.keys(userProfile).length > 0 ) {
                console.log("inside")
                let district = [];
                let organisation = [];

                //get the districts from the userProfile
                for (const location of userProfile["userLocations"]) {
                    if ( location.type == CONSTANTS.common.DISTRICT ) {
                        let distData = {}
                        distData["locationId"] = location.id;
                        distData["name"] = location.name;
                        district.push(distData);
                    }
                }

                //get the organisations from the userProfile
                for (const org of userProfile["organisations"]) {
                    let orgData = {};
                    orgData.orgName = org.orgName;
                    orgData.organisationId = org.organisationId;
                    organisation.push(orgData);
                }

                //checking solution is exist
                let solutionDocument = await solutionsQueries.solutionsDocument({
                    _id: solutionId
                },
                ["_id"]);
                
                if( !solutionDocument.length > 0 ) {
                    throw {
                        message : CONSTANTS.apiResponses.SOLUTION_NOT_FOUND,
                        status : HTTP_STATUS_CODE['bad_request'].status
                    }
                }

                let updateQuery = {};
                updateQuery["$addToSet"] = {};
                updateQuery["$addToSet"]["reportInformation.organisations"] = { $each : organisation};
                updateQuery["$addToSet"]["reportInformation.districts"] = { $each : district};

                //add user district and organisation in solution
                await solutionsQueries.updateSolutionDocument
                (
                    { _id : solutionId },
                    updateQuery
                )
            }
            
            return resolve({
                success: true,
                data: []
            });
            
        } catch (error) {
            return resolve({
              success : false,
              message : error.message,
              data: []
            });
        }
    });
  }

};
