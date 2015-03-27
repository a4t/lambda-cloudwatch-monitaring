var AWS     = require('aws-sdk');
var request = require('request');
var Promise = require('promise');
var Config  = require('./config.js');

var s3         = new AWS.S3({region: Config.s3_region});
var cloudwatch = new AWS.CloudWatch({
  region: Config.cloudwatch_region,
  apiVersion: '2010-08-01'
});

/**
 * upload alert file
 *
 * @param string key
 */
function upload_alert_file(key) {
  var params = {
    Bucket: Config.bucket,
    Key: key,
    Body: '1'
  };

  s3.putObject(params, function(err, data) {
    if (err) {
      upload_alert_file(key);
    }
  });
}

/**
 * upload lambda loop file
 *
 * @param object context
 */
function upload_trigger_file(context) {
  var params = {
    Bucket: Config.bucket,
    Key: Config.alert_trigger_file,
    Body: '1'
  };

  s3.putObject(params, function(err, data) {
    if (err) {
      upload_trigger_file(context);
    } else {
      context.done(null, 'Success!! Next loop start.');
    }
  });
}

/**
 * delete_s3_file
 *
 * @param string key
 */
function delete_file_to_s3(key) {
  var params = {
    Bucket: Config.bucket,
    Key: key
  };

  s3.deleteObject(params, function(err, data) {});
}

/**
 * create_alert_file
 *
 * @param string alert_name
 */
function create_alert_file(alarm_name) {
  var alert_key = Config.alert_key_prefix + alarm_name;
  upload_alert_file(alert_key);
}

/**
 * delete_alert_file
 *
 * @param string alert_name
 */
function delete_alert_file(alert_name) {
  var alert_key = Config.alert_key_prefix + alert_name;
  delete_file_to_s3(alert_key);
}

/**
 * The processing on alert
 *
 * @param object metric_alarm
 */
function alert_process(metric_alarm) {
  var alarm_name = metric_alarm.AlarmName;
  var alert_key = Config.alert_key_prefix + alarm_name;
  var params = {
    Bucket: Config.bucket,
    Key: alert_key
  };

  s3.getObject(params, function(err, data) {
    if (err) { // to Alert
      create_alert_file(alarm_name);

      var reason = metric_alarm.StateReason;
      var status = metric_alarm.StateValue;
      alert_to_slack(alarm_name, status, reason);
    }
  });
}

/**
 * To slack
 *
 * @param string alert_name
 * @param string status
 * @param string reason
 */
function alert_to_slack(alert_name, status, reason) {
  var text = '`'+status+'` : '+alert_name+"\\n"+reason;

  var options = {
    uri: Config.slack_url,
    form: 'payload={"username": "'+Config.slack_user_name+'", "icon_url": "'+Config.slack_icon_url+'", "text": "'+text+'"}',
    json: true
  };
  request.post(options, function(error, response, body){});
}

/**
 * get cloudwatch alarms attach my sns_arn
 *
 * @return object
 */
function get_cloudwatch_describe_alarms() {
  return new Promise(function (resolve, reject) {
    var params = {
      ActionPrefix: Config.sns_arn
    };
    cloudwatch.describeAlarms(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * This file is trigger file ?
 *
 * @param  object event
 * @return boolean
 */
function is_trigger_file(event) {
  var srcKey = event.Records[0].s3.object.key;
  if (srcKey != Config.alert_trigger_file) {
    return false;
  }

  return true;
}

/**
 * Main handler
 */
exports.handler = function(event, context) {
  if (!is_trigger_file(event)) {
    return true;
  }

  setTimeout(function () {
    get_cloudwatch_describe_alarms().then(function (data) {
      data.MetricAlarms.forEach(function(metric_alarm, index) {
        if (metric_alarm.StateValue != 'OK') {
          alert_process(metric_alarm);
        } else { // not alert and delete alert file
          delete_alert_file(metric_alarm.AlarmName);
        }
      });

      upload_trigger_file(context);
    }).catch(function (error) {
      upload_trigger_file(context);
    });
  }, Config.trigger_write_delay);
};
