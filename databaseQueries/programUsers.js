module.exports = class programUsers {
  static programUsersDocument(
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

        let programJoinedData = await database.models.programUsers
          .find(queryObject, projection)
          .lean();
        return resolve(programJoinedData);
      } catch (error) {
        return reject(error);
      }
    });
  }


  static update(query, update, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {

            let programUsers = await database.models.programUsers.findOneAndUpdate(
                query, 
                update,
                options
            );
            if( !programUsers._id ) {
                throw {
                    message : constants.apiResponses.PROGRAM_USERS_NOT_UPDATED
                };
            }
            return resolve(programUsers);

        } catch (error) {
            return reject(error);
        }
    })
}
};
