/**
 * name : certificate.js
 * author : Vishnu
 * Date : 07-Oct-2022
 * Description : Sunbird-RC certificate api.
 */

//dependencies
const request = require('request');
const CERTIFICATE_SERVICE_URL = process.env.CERTIFICATE_SERVICE_URL;
const ML_PROJECT_URL = `http://${process.env.SERVICE_NAME}:${process.env.APPLICATION_PORT}`;

/**
  * Project certificate creation
  * @function
  * @name createCertificate
  * @param {Object} bodyData - Body data
  * @returns {JSON} - Certificate creation details.
*/

const createCertificate = function (bodyData) {
    return new Promise(async (resolve, reject) => {
        try {
            const callbackUrl = ML_PROJECT_URL + CONSTANTS.endpoints.PROJECT_CERTIFICATE_API_CALLBACK;
            let certificateCreateUrl =  
            CERTIFICATE_SERVICE_URL + 
            CONSTANTS.endpoints.CERTIFICATE_CREATE + "?mode=async&callback=" + callbackUrl;
        
            const options = {
                headers : {
                    "content-type": "application/json"
                },
                json : bodyData
            };
            
            request.post(certificateCreateUrl,options,certificateCallback);

            function certificateCallback(err, data) {

                let result = {
                    success : true
                };
                
                if (err) {
                    result.success = false;
                } else {
                    let response = data.body;
                    if( response.params.status === "SUCCESSFUL" ) {
                        result["data"] = response.result;
                    } else {
                        result.success = false;
                    }
                }
                return resolve(result);
            }

        } catch (error) {
            return reject(error);
        }
    })
}

module.exports = {
    createCertificate : createCertificate
}