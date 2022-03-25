/**
 * name : observations.js
 * author : Priyanka Pradeep
 * created-date : 25-Mar-2022
 * Description : observation related information.
 */
module.exports = class  Observations extends Abstract{
    constructor() {
      super("observations");
    }
  
    static get name() {
      return "observations";
    }
}