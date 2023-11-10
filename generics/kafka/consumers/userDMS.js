/**
 * name : projectCertificate.js
 * author : Vishnu
 * created-date : 10-Oct-2022
 * Description : Project certificates submission consumer.
 */

//dependencies
const userProjectsHelper = require(MODULES_BASE_PATH + "/userProjects/helper");
const kafkaProducersHelper = require(GENERICS_FILES_PATH + "/kafka/producers");
/**
 * submission consumer message received.
 * @function
 * @name messageReceived
 * @param {String} message - consumer data
 * @returns {Promise} return a Promise.
 */

var messageReceived = function (message) {
  return new Promise(async function (resolve, reject) {
    try {
      // This consumer is consuming from an old topic : PROJECT_CERTIFICATE_TOPIC, which is no more used by data team. ie) using existig topic instead of creating new one.
      let parsedMessage = JSON.parse(message.value);
      if (parsedMessage.edata.action === "delete-user") {
        let userDataDeleteStatus = await userProjectsHelper.userDelete(
          parsedMessage
        );
        if (userDataDeleteStatus.success === true) {
          let msgData = await UTILS.getTelemetryEvent(parsedMessage);
          let telemetryEvent = {
            timestamp: new Date(),
            msg: JSON.stringify(msgData),
            lname: "TelemetryEventLogger",
            tname: "",
            level: "INFO",
            HOSTNAME: "",
            "application.home": "",
          };
          await kafkaProducersHelper.pushTelemetryEventToKafka(telemetryEvent);
          return resolve("Message Processed.");
        } else {
          return resolve("Message Processed.");
        }
      }
      //   return resolve("Message Received");
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * If message is not received.
 * @function
 * @name errorTriggered
 * @param {Object} error - error object
 * @returns {Promise} return a Promise.
 */

var errorTriggered = function (error) {
  return new Promise(function (resolve, reject) {
    try {
      return resolve(error);
    } catch (error) {
      return reject(error);
    }
  });
};

module.exports = {
  messageReceived: messageReceived,
  errorTriggered: errorTriggered,
};
