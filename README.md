# S3 image resizer

This is an [aws-cdk](https://aws.amazon.com/cdk/) project where you can generate a thumbnail based on [S3 event notifications](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) using an SQS Queue with Lambda.

**Steps**

1. Rename the `.example.env` file to `.env` and replace all the values with predefined values for your stack (not mandatory).

2. Run `yarn` (recommended) or `npm install`

3. Run `yarn cdk deploy --profile profileName` to deploy the stack to your specified region. You can skip providing the profile name if it is `default`.

4. Now you can add image/s in the _photos_ folder in S3 and check after a couple of seconds that images in a folder named _thumbnails_ is generated by Lambda via SQS.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `yarn watch` watch for changes and compile
- `yarn test` perform the jest unit tests
- `yarn cdk deploy` deploy this stack to your default AWS account/region
- `yarn cdk diff` compare deployed stack with current state
- `yarn cdk synth` emits the synthesized CloudFormation template
