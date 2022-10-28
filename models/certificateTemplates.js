module.exports = {
  name: "certificateTemplates",
  schema: {
    templateUrl: String,
    issuer: Object,
    status: {
      type : String,
      required : true
    },
    solutionId: {
      type : "ObjectId",
      unique: true,
      index : true
    },
    programId: "ObjectId",
    criteria: {
      type : Object,
      required : true
    }
  }
};