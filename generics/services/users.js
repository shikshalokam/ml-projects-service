/**
 * name : users.js
 * author : Vishnu
 * Date : 07-April-2022
 * Description : All users related api call.
 */

//dependencies
const request = require('request');
const userServiceUrl = process.env.USER_SERVICE_URL;
const serverTimeout = process.env.SUNBIRD_SERVER_TIMEOUT ? parseInt(  process.env.SUNBIRD_SERVER_TIMEOUT ) : 5000;
/**
  * 
  * @function
  * @name learnerLocationSearch
  * @param {String} bearerToken - autherization token.
  * @param {object} bodyData -  bodydata .
  * @returns {Promise} returns a promise.
*/

const learnerLocationSearch = function ( filterData ) {
  return new Promise(async (resolve, reject) => {
      try {
          
        let bodyData={};
        bodyData["request"] = {};
        bodyData["request"]["filters"] = filterData;
        const url = 
        userServiceUrl + CONSTANTS.endpoints.GET_LOCATION_DATA;
        const options = {
            headers : {
                "content-type": "application/json"
            },
            json : bodyData
        };

        request.post(url,options,learnerSearchCallback);

        let result = {
            success : true
        };

        function learnerSearchCallback(err, data) {

            
            if (err) {
                result.success = false;
            } else {
                  
                let response = data.body;
                  
                if( response.responseCode === CONSTANTS.common.OK) {
                    result["data"] = response.result;
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
        }, serverTimeout);

      } catch (error) {
          return reject(error);
      }
  })
}
module.exports = {
    learnerLocationSearch : learnerLocationSearch
};