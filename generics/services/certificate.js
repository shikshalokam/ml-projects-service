/**
 * name : certificate.js
 * author : Vishnu
 * Date : 07-Oct-2022
 * Description : Sunbird-RC certificate api.
 */

//dependencies
const request = require('request');

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
            console.log("line 22 payload to RC : ",bodyData)
            const ML_PROJECT_URL = `http://${process.env.SERVICE_NAME}:${process.env.APPLICATION_PORT}`;
            const callbackUrl = ML_PROJECT_URL + CONSTANTS.endpoints.PROJECT_CERTIFICATE_API_CALLBACK;
            let certificateCreateUrl =  
            process.env.CERTIFICATE_SERVICE_URL + 
            CONSTANTS.endpoints.CERTIFICATE_CREATE + "?mode=async&callback=" + callbackUrl;
            const options = {
                headers : {
                    "content-type": "application/json"
                },
                json : bodyData
            };
            
            request.post(certificateCreateUrl,options,certificateCallback);
            console.log("line 35 certificateCreateUrl :", certificateCreateUrl)
            function certificateCallback(err, data) {

                let result = {
                    success : true
                };
                console.log("line 41 data from RC call :",data);
                console.log("line 41 error from RC call :",err);
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

/**
  * Project certificate issuer-kid
  * @function
  * @name getCertificateIssuerKid
  * @returns {JSON} - Certificate issuer kid details.
*/

const getCertificateIssuerKid = function () {
    return new Promise(async (resolve, reject) => {
        try {
            let issuerKidUrl =  
            process.env.CERTIFICATE_SERVICE_URL + CONSTANTS.endpoints.GET_CERTIFICATE_KID;
            let bodyData = {"filters": {}};

            const options = {
                headers : {
                    "Content-Type": "application/json"
                },
                json : bodyData
            };
            request.post(issuerKidUrl,options,getKidCallback);
            function getKidCallback(err, data) {
                let result = {
                    success : true
                };
                
                if (err) {
                    result.success = false;
                } else {
                    let response = data.body;
                    if( response.length >  0 && response[0].osid && response[0].osid !== "" ) {
                        result["data"] = response[0].osid;
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
            }, CONSTANTS.common.SERVER_TIME_OUT);

        } catch (error) {
            return reject(error);
        }
    })
}

module.exports = {
    createCertificate : createCertificate,
    getCertificateIssuerKid : getCertificateIssuerKid
}