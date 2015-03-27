# lambda-cloudwatch-monitaring

## Usage
- Edit config.js

```js:config.js
module.exports = {
  bucket              : '', // S3 bucket
  s3_region           : '', // S3 region
  cloudwatch_region   : '', // cloudwatch region
  sns_arn             : '', // sns arn for notification

  alert_key_prefix    : '', // alert file place
  alert_trigger_file  : '', // for Lambda loop file

  trigger_write_delay : 30000, // cron time (about) 

  slack_url           : '', // Incoming WebHooks URL
  slack_username      : '', // Slack notification username
  slack_icon_url      : ''  // Slack icon URL
}
```

## Need IAM setting
- cloudwatch::describeAlarms
- S3::getObject
- S3::deleteObject
