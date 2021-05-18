/**
 * name : userProjects.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : User Projects v2 related information.
 */

// Dependencies
const v1UserProjects = require(PROJECT_ROOT_DIRECTORY + "/controllers/v1/userProjects");
const userProjectsHelper = require(MODULES_BASE_PATH + "/userProjects/helper");

/**
    * UserProjects
    * @class
*/

module.exports = class UserProjects extends v1UserProjects {
    
     /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

    /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */

    
}