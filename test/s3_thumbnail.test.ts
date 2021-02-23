import * as cdk from '@aws-cdk/core'
import {
  expect as expectCDK,
  haveResourceLike,
  ResourcePart,
} from '@aws-cdk/assert'
import { S3ThumbnailStack } from '../lib/s3_thumbnail-stack'

const MessageRetentionPeriod = 2 * 24 * 60 * 60

test('S3, SQS and Lambda resources are created', () => {
  const stack = createStack()

  expectCDK(stack).to(
    haveResourceLike(
      'AWS::S3::Bucket',
      {
        Type: 'AWS::S3::Bucket',
        UpdateReplacePolicy: 'Delete',
        DeletionPolicy: 'Delete',
      },
      ResourcePart.CompleteDefinition
    )
  )

  expectCDK(stack).to(
    haveResourceLike('AWS::SQS::Queue', {
      MessageRetentionPeriod,
      QueueName: 'thumbnailPayload',
      ReceiveMessageWaitTimeSeconds: 20,
      VisibilityTimeout: 600,
    })
  )

  expectCDK(stack).to(
    haveResourceLike('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs12.x',
      MemorySize: 512,
      ReservedConcurrentExecutions: 20,
      Timeout: 20,
    })
  )
})

test('events have been added', () => {
  const stack = createStack()

  expectCDK(stack).to(haveResourceLike('AWS::Lambda::EventSourceMapping'))

  expectCDK(stack).to(
    haveResourceLike('Custom::S3BucketNotifications', {
      BucketName: {},
      NotificationConfiguration: {
        QueueConfigurations: [
          {
            Events: ['s3:ObjectCreated:*'],
            Filter: {
              Key: {
                FilterRules: [
                  {
                    Name: 'prefix',
                    Value: 'photos/',
                  },
                ],
              },
            },
          },
        ],
      },
    })
  )
})

function createStack() {
  const stackName = 'S3ThumbnailStack'
  const app = new cdk.App()
  return new S3ThumbnailStack(app, stackName)
}
