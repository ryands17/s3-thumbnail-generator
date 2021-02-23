const AWS = require('aws-sdk')
const sharp = require('sharp')

const prefix = process.env.PREFIX
const s3 = new AWS.S3()
const sqs = new AWS.SQS({
  region: process.env.AWS_REGION,
})

exports.handler = async event => {
  const results = await Promise.allSettled(
    event.Records.map(async message => {
      const body = JSON.parse(message.body)

      if (Array.isArray(body.Records) && body.Records[0].s3) {
        const { s3 } = body.Records[0]
        const objectName = decodeURIComponent(s3.object.key.replace(/\+/g, ' '))
        const bucketName = s3.bucket.name
        try {
          await resizeAndSaveImage({ objectName, bucketName })
          return { receiptHandle: message.receiptHandle, objectName }
        } catch (error) {
          handleError(
            `Message ${message.receiptHandle} failed with parameters: ${bucketName}, ${objectName}`
          )
        }
      }
    })
  )

  const failedMessages = results.filter(r => r.status === 'rejected')
  const successfulMessages = results.filter(r => r.status === 'fulfilled')
  if (failedMessages.length) {
    await Promise.allSettled(
      successfulMessages.map(receiptHandle =>
        deleteMessageFromQueue(receiptHandle)
      )
    )
    handleError(failedMessages.map(r => r.reason).join(','))
  }

  const successMessage = `Succesfully processed ${successfulMessages.map(
    m => m.value.objectName
  )}`
  console.log(successMessage)
  return successMessage
}

async function resizeAndSaveImage({ objectName, bucketName }) {
  const objectWithoutPrefix = objectName.replace(prefix, '')
  const typeMatch = objectWithoutPrefix.match(/\.([^.]*)$/)
  if (!typeMatch) {
    handleError('Could not determine the image type.')
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase()
  if (!['jpeg', 'jpg', 'png'].includes(imageType)) {
    handleError(`Unsupported image type: ${imageType}`)
  }

  // Download the image
  const image = await s3
    .getObject({
      Bucket: bucketName,
      Key: objectName,
    })
    .promise()

  // Transform the image via sharp
  const width = 300
  const buffer = await sharp(image.Body).resize(width).toBuffer()

  const key = `thumbnails/${objectWithoutPrefix}`
  return s3
    .putObject({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'image',
    })
    .promise()
}

function deleteMessageFromQueue(receiptHandle) {
  if (receiptHandle) {
    return sqs
      .deleteMessage({
        QueueUrl: process.env.QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })
      .promise()
  }
}

function handleError(err) {
  console.error(err)
  throw Error(err)
}
