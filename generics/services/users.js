/**
 * name : users.js
 * author : Vishnu
 * Date : 07-April-2022
 * Description : All users related api call.
 */

//dependencies
const request = require('request');
const userServiceUrl = process.env.USER_SERVICE_URL;
const serverTimeout = process.env.SUNBIRD_SERVER_TIMEOUT ? parseInt(process.env.SUNBIRD_SERVER_TIMEOUT) : 5000;

const profile = function ( token,userId = "" ) {
    return new Promise(async (resolve, reject) => {
        try {

            let url = userServiceUrl + CONSTANTS.endpoints.USER_READ_V5;
    
            if( userId !== "" ) {
                url = url + "/" + userId + "?"  + "fields=organisations,roles,locations,declarations,externalIds"
            }

            const options = {
                headers : {
                    "content-type": "application/json",
                    "x-authenticated-user-token" : token,
                    "Authorization" : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJSbTBGOTlnMnd4SmZKelJwa2YzTnRlaE5CYlJnZXRCaCJ9.CjDN6GufxylpAM5J_6j9fD0wq7S2qr1F6FOzAZtQ6XU"
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
                    
                    let response = JSON.parse(data.body);
                    if( response.responseCode === HTTP_STATUS_CODE['ok'].code ) {
                        result["data"] = response.result;
                    } else {
                        result.success = false;
                    }

                }
                console.log("result : ",result.data.response)
                return resolve(result);
            }
            setTimeout(function () {
                return reject (result = {
                    success : false
                 });
             }, serverTimeout);

        } catch (error) {
            return reject(error);
        }
    })
}

module.exports = {
    profile : profile
}
