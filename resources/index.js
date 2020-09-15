const AWS = require('aws-sdk')
const sharp = require('sharp')

const prefix = process.env.PREFIX
const s3 = new AWS.S3()
const sqs = new AWS.SQS({
  region: process.env.AWS_REGION,
})

exports.handler = async event => {
  try {
    for (let message of event.Records) {
      const body = JSON.parse(message.body)

      if (Array.isArray(body.Records) && body.Records[0].s3) {
        const objectName = decodeURIComponent(
          body.Records[0].s3.object.key.replace(/\+/g, ' ')
        )
        const bucketName = body.Records[0].s3.bucket.name
        console.log({ objectName, bucketName })
        try {
          await resizeAndSaveImage({ objectName, bucketName })
          await deleteMessageFromQueue(message.receiptHandle)
        } catch (e) {
          console.log('an error occured!')
          console.error(e)
        }
      } else {
        await deleteMessageFromQueue(message.receiptHandle)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify('success!'),
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      error: JSON.stringify('Server error!'),
    }
  }
}

async function resizeAndSaveImage({ objectName, bucketName }) {
  const objectWithoutPrefix = objectName.replace(prefix, '')
  const typeMatch = objectWithoutPrefix.match(/\.([^.]*)$/)
  if (!typeMatch) {
    console.log('Could not determine the image type.')
    return
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase()
  if (imageType !== 'jpg' && imageType !== 'png') {
    console.log(`Unsupported image type: ${imageType}`)
    return
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
