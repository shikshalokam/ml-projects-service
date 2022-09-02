/**
 * name : users.js
 * author : Vishnu
 * Date : 07-April-2022
 * Description : All users related api call.
 */

//dependencies
const request = require('request');
const userServiceUrl = process.env.USER_SERVICE_URL;

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
                    "x-authenticated-user-token" : token
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


/**
  * 
  * @function
  * @name locationSearch
  * @param {object} filterData -  location search filter object.
  * @param {Boolean} formatResult -  format result or not.
  * @returns {Promise} returns a promise.
*/

const locationSearch = function ( filterData, formatResult = false ) {
  return new Promise(async (resolve, reject) => {
      try {
          
        let bodyData={};
        bodyData["request"] = {};
        bodyData["request"]["filters"] = filterData;
        const url = 
        userServiceUrl + CONSTANTS.endpoints.GET_LOCATION_DATA;
        const options = {
            headers : {
                "content-type": "application/json",
                "Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJSbTBGOTlnMnd4SmZKelJwa2YzTnRlaE5CYlJnZXRCaCJ9.CjDN6GufxylpAM5J_6j9fD0wq7S2qr1F6FOzAZtQ6XU"
            },
            json : bodyData
        };

        request.post(url,options,requestCallback);
        
        let result = {
            success : true
        };

        function requestCallback(err, data) {   
            if (err) {
                result.success = false;
            } else {

                let response = data.body;
                if( response.responseCode === CONSTANTS.common.OK &&
                    response.result &&
                    response.result.response &&
                    response.result.response.length > 0
                ) {
                    if ( formatResult ) {
                        let entityResult =new Array;
                        response.result.response.map(entityData => {
                            let data = {};
                            data._id = entityData.id;
                            data.entityType = entityData.type;
                            data.metaInformation = {};
                            data.metaInformation.name = entityData.name;
                            data.metaInformation.externalId = entityData.code
                            data.registryDetails = {};
                            data.registryDetails.locationId = entityData.id;
                            data.registryDetails.code = entityData.code;
                            entityResult.push(data);
                        });
                        result["data"] = entityResult;
                        result["count"] = response.result.count;
                    } else {
                        result["data"] = response.result.response;
                        result["count"] = response.result.count;
                    }
                    
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

/**
  * get Parent Entities of an entity.
  * @method
  * @name getParentEntities
  * @param {String} entityId - entity id
  * @returns {Array} - parent entities.
*/

async function getParentEntities( entityId, iteration = 0, parentEntities ) {

    if ( iteration == 0 ) {
        parentEntities = [];
    }

    let filterQuery = {
        "id" : entityId
    };

    let entityDetails = await locationSearch(filterQuery);
    if ( !entityDetails.success ) {
        return parentEntities;
    } else {
        
        let entityData = entityDetails.data[0];
        if ( iteration > 0 ) parentEntities.push(entityData);
        if ( entityData.parentId ) {
            iteration = iteration + 1;
            entityId = entityData.parentId;
            await getParentEntities(entityId, iteration, parentEntities);
        }
    }

    return parentEntities;

}

module.exports = {
    profile : profile,
    locationSearch : locationSearch,
    getParentEntities : getParentEntities
};
