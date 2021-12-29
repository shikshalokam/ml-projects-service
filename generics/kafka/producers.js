/**
 * name : producer.js
 * author : Aman Karki
 * created-date : 08-Sep-2020
 * Description : Kafka Producer related information.
*/

// Dependencies
const kafkaCommunicationsOnOff = (!process.env.KAFKA_COMMUNICATIONS_ON_OFF || process.env.KAFKA_COMMUNICATIONS_ON_OFF != "OFF") ? "ON" : "OFF";
const improvementProjectSubmissionTopic = (process.env.IMPROVEMENT_PROJECT_SUBMISSION_TOPIC && process.env.IMPROVEMENT_PROJECT_SUBMISSION_TOPIC != "OFF") ? process.env.IMPROVEMENT_PROJECT_SUBMISSION_TOPIC : "sl-improvement-project-submission-dev";

/**
  * Push improvement projects to kafka.
  * @function
  * @name pushProjectToKafka
  * @param {Object} message - Message data.
*/

const pushProjectToKafka = function (message) {
  return new Promise(async (resolve, reject) => {
      try {

          let kafkaPushStatus = await pushMessageToKafka([{
            topic: process.env.NOTIFICATIONS_TOPIC,
            messages: JSON.stringify(message)
          }]);

          return resolve(kafkaPushStatus);

      } catch (error) {
          return reject(error);
      }
  })
}



/**
  * Push message to kafka.
  * @function
  * @name pushMessageToKafka
  * @param {Object} payload - Payload data.
*/

const pushMessageToKafka = function(payload) {
  return new Promise((resolve, reject) => {

    if (kafkaCommunicationsOnOff != "ON") {
      throw reject("Kafka configuration is not done");
    }

    kafkaClient.kafkaProducer.send(payload, (err, data) => {
      if (err) {
        return reject("Kafka push to topic "+ payload[0].topic +" failed.");
      } else {
        return resolve(data);
      }
    })

  }).then(result => {
      
    return {
      status : CONSTANTS.common.SUCCESS,
      message: "Kafka push to topic "+ payload[0].topic +" successful with number - "+result[payload[0].topic][0]
    };

  }).catch((err) => {
    return {
      status : "failed",
      message: err
    }
  })
}


/**
  * Push improvement projects to kafka.
  * @function
  * @name pushImrovementProjectToKafka
  * @param {Object} message - Message data.
*/

const pushImrovementProjectToKafka = function (message) {
  return new Promise(async (resolve, reject) => {
      try {

          let kafkaPushStatus = await pushMessageToKafka([{
            topic: improvementProjectSubmissionTopic,
            messages: JSON.stringify(message)
          }]);
          return resolve(kafkaPushStatus);

      } catch (error) {
          return reject(error);
      }
  })
}

module.exports = {
  pushProjectToKafka : pushProjectToKafka,
  pushImrovementProjectToKafka : pushImrovementProjectToKafka
};

