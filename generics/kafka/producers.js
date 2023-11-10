/**
 * name : producer.js
 * author : Aman Karki
 * created-date : 08-Sep-2020
 * Description : Kafka Producer related information.
 */

// Dependencies
const kafkaCommunicationsOnOff =
  !process.env.KAFKA_COMMUNICATIONS_ON_OFF ||
  process.env.KAFKA_COMMUNICATIONS_ON_OFF != "OFF"
    ? "ON"
    : "OFF";
const projectSubmissionTopic =
  process.env.PROJECT_SUBMISSION_TOPIC &&
  process.env.PROJECT_SUBMISSION_TOPIC != "OFF"
    ? process.env.PROJECT_SUBMISSION_TOPIC
    : "sl-improvement-project-submission-dev";
const telemetryEventTopic = process.env.TELEMETRY_TOPIC
  ? process.env.TELEMETRY_TOPIC
  : "sl-telemetry-dev";
const userDeleteTopic = process.env.USER_DELETE_TOPIC;

/**
 * Push improvement projects to kafka.
 * @function
 * @name pushProjectToKafka
 * @param {Object} message - Message data.
 */

const pushProjectToKafka = function (message) {
  return new Promise(async (resolve, reject) => {
    try {
      let kafkaPushStatus = await pushMessageToKafka([
        {
          topic: projectSubmissionTopic,
          messages: JSON.stringify(message),
        },
      ]);

      return resolve(kafkaPushStatus);
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * Push message to telemetry.
 * @function
 * @name pushTelemetryEventToKafka
 * @param {Object} message - Message data.
 */
const pushTelemetryEventToKafka = function (message) {
  return new Promise(async (resolve, reject) => {
    try {
      let kafkaPushStatus = await pushMessageToKafka([
        {
          topic: telemetryEventTopic,
          messages: JSON.stringify(message),
        },
      ]);

      return resolve(kafkaPushStatus);
    } catch (error) {
      return reject(error);
    }
  });
};
const pushEventToKafka = function () {
  return new Promise(async (resolve, reject) => {
    try {
      let userID = "39c5d6f8-8f62-48e2-8780-3eab65e502e8";
      let orgid = "0126796199493140480";
      let message = {
        eid: "BE_JOB_REQUEST",
        ets: 1619527882745,
        mid: "LP.1619527882745.32dc378a-430f-49f6-83b5-bd73b767ad36",
        actor: {
          id: "delete-user",
          type: "System",
        },
        context: {
          channel: "01309282781705830427",
          pdata: {
            id: "org.sunbird.platform",
            ver: "1.0",
          },
          env: "dev",
        },
        object: {
          id: "<deleted-userId>",
          type: "User",
        },
        edata: {
          organisationId: orgid,
          userId: userID,
          suggested_users: [
            {
              role: "ORG_ADMIN",
              users: ["<orgAdminUserId>"],
            },
            {
              role: "CONTENT_CREATOR",
              users: ["<contentCreatorUserId>"],
            },
            {
              role: "COURSE_MENTOR",
              users: ["<courseMentorUserId>"],
            },
          ],
          action: "delete-user",
          iteration: 1,
        },
      };
      let kafkaPushStatus = await pushMessageToKafka([
        {
          topic: userDeleteTopic,
          messages: JSON.stringify(message),
        },
      ]);

      return resolve(kafkaPushStatus);
    } catch (error) {
      return reject(error);
    }
  });
};

/**
 * Push message to kafka.
 * @function
 * @name pushMessageToKafka
 * @param {Object} payload - Payload data.
 */

const pushMessageToKafka = function (payload) {
  return new Promise((resolve, reject) => {
    if (kafkaCommunicationsOnOff != "ON") {
      throw reject("Kafka configuration is not done");
    }

    console.log("-------Kafka producer log starts here------------------");
    console.log("Topic Name: ", payload[0].topic);
    console.log("Message: ", JSON.stringify(payload));
    console.log("-------Kafka producer log ends here------------------");

    kafkaClient.kafkaProducer.send(payload, (err, data) => {
      if (err) {
        return reject("Kafka push to topic " + payload[0].topic + " failed.");
      } else {
        return resolve(data);
      }
    });
  })
    .then((result) => {
      console.log(
        "Kafka push to topic " +
          payload[0].topic +
          " successful with number - " +
          result[payload[0].topic][0]
      );
      return {
        status: CONSTANTS.common.SUCCESS,
        message:
          "Kafka push to topic " +
          payload[0].topic +
          " successful with number - " +
          result[payload[0].topic][0],
      };
    })
    .catch((err) => {
      return {
        status: "failed",
        message: err,
      };
    });
};

module.exports = {
  pushProjectToKafka: pushProjectToKafka,
  pushEventToKafka: pushEventToKafka,
  pushTelemetryEventToKafka: pushTelemetryEventToKafka,
};
