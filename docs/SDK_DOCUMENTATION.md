# SDK Documentation

This document provides comprehensive documentation for all client SDKs and third-party integrations used in the StrellerMinds Backend platform.

## Table of Contents

1. [Stellar Blockchain SDK](#stellar-blockchain-sdk)
2. [Stripe Payment SDK](#stripe-payment-sdk)
3. [AWS SDK](#aws-sdk)
4. [Azure Storage SDK](#azure-storage-sdk)
5. [Google Cloud Storage SDK](#google-cloud-storage-sdk)
6. [Firebase Admin SDK](#firebase-admin-sdk)
7. [Elasticsearch Client](#elasticsearch-client)
8. [Redis Client (IoRedis)](#redis-client-ioredis)
9. [Nodemailer](#nodemailer)
10. [JWT Authentication](#jwt-authentication)

---

## Stellar Blockchain SDK

### Overview
The Stellar SDK (`@stellar/stellar-sdk`) is used for blockchain operations and cryptocurrency transactions within the StrellerMinds platform.

### Configuration
```typescript
// Environment variables
STELLAR_NETWORK_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_SECRET_KEY=your_secret_key_here
```

### Key Features
- Account creation and management
- Transaction creation and signing
- Payment processing
- Smart contract interactions
- Balance queries

### Usage Examples

#### Creating a Stellar Account
```typescript
import { Keypair, Server, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const server = new Server(STELLAR_NETWORK_URL);
const keypair = Keypair.random();

console.log('Public Key:', keypair.publicKey());
console.log('Secret Key:', keypair.secret());
```

#### Sending a Payment
```typescript
async function sendPayment(sourceSecret: string, destinationPublicKey: string, amount: string) {
  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(Operation.payment({
      destination: destinationPublicKey,
      asset: Asset.native(),
      amount: amount
    }))
    .setTimeout(30)
    .build();
  
  transaction.sign(sourceKeypair);
  return await server.submitTransaction(transaction);
}
```

### Error Handling
```typescript
try {
  const result = await sendPayment(sourceSecret, destination, amount);
  console.log('Transaction successful:', result.hash);
} catch (error) {
  if (error.response && error.response.data) {
    console.error('Stellar API Error:', error.response.data);
  } else {
    console.error('Transaction Error:', error.message);
  }
}
```

---

## Stripe Payment SDK

### Overview
Stripe SDK (`stripe`) is integrated for processing payments, managing subscriptions, and handling financial transactions.

### Configuration
```typescript
// Environment variables
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

### Key Features
- Payment processing
- Subscription management
- Customer management
- Webhook handling
- Refund processing

### Usage Examples

#### Creating a Payment Intent
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function createPaymentIntent(amount: number, currency: string = 'usd') {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency,
      payment_method_types: ['card'],
      metadata: {
        integration_type: 'strellerminds'
      }
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Stripe Error:', error.message);
    throw error;
  }
}
```

#### Creating a Customer
```typescript
async function createCustomer(email: string, name: string) {
  const customer = await stripe.customers.create({
    email: email,
    name: name,
    metadata: {
      platform: 'strellerminds'
    }
  });
  
  return customer;
}
```

#### Handling Webhooks
```typescript
import { Request, Response } from 'express';

async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Handle successful payment
        break;
        
      case 'invoice.payment_failed':
        const invoice = event.data.object;
        console.log('Payment failed:', invoice.id);
        // Handle failed payment
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send('Webhook signature verification failed');
  }
}
```

---

## AWS SDK

### Overview
AWS SDK (`@aws-sdk/client-s3`, `@aws-sdk/client-secrets-manager`) is used for cloud storage and secret management.

### Configuration
```typescript
// Environment variables
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

### Key Features
- S3 file storage and retrieval
- Secrets management
- Cloud integration

### Usage Examples

#### S3 File Upload
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadFile(bucketName: string, key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: 'application/octet-stream'
  });
  
  try {
    const result = await s3Client.send(command);
    console.log('File uploaded successfully:', result.ETag);
    return result;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw error;
  }
}
```

#### Secrets Manager
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION
});

async function getSecret(secretName: string) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    
    return response.SecretBinary;
  } catch (error) {
    console.error('Secrets Manager Error:', error);
    throw error;
  }
}
```

---

## Azure Storage SDK

### Overview
Azure Storage SDK (`@azure/storage-blob`) is integrated for Microsoft Azure cloud storage services.

### Configuration
```typescript
// Environment variables
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your_account;AccountKey=your_key;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=your_container
```

### Key Features
- Blob storage operations
- File upload/download
- Container management

### Usage Examples

#### Upload Blob
```typescript
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

async function uploadBlob(containerName: string, blobName: string, content: Buffer) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  try {
    const uploadResponse = await blockBlobClient.upload(content, content.length);
    console.log('Blob uploaded:', uploadResponse.requestId);
    return uploadResponse;
  } catch (error) {
    console.error('Azure Blob Upload Error:', error);
    throw error;
  }
}
```

---

## Google Cloud Storage SDK

### Overview
Google Cloud Storage SDK (`@google-cloud/storage`) is used for Google Cloud Platform storage operations.

### Configuration
```typescript
// Environment variables
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
```

### Key Features
- Cloud storage operations
- File management
- Bucket operations

### Usage Examples

#### Upload File to GCS
```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
});

async function uploadFile(bucketName: string, fileName: string, filePath: string) {
  try {
    await storage.bucket(bucketName).upload(filePath, {
      destination: fileName,
      metadata: {
        contentType: 'application/octet-stream'
      }
    });
    
    console.log(`File ${fileName} uploaded to ${bucketName}`);
  } catch (error) {
    console.error('GCS Upload Error:', error);
    throw error;
  }
}
```

---

## Firebase Admin SDK

### Overview
Firebase Admin SDK (`firebase-admin`) is integrated for Firebase services including authentication, messaging, and database operations.

### Configuration
```typescript
// Environment variables
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
```

### Key Features
- Firebase Authentication
- Cloud Messaging
- Firestore Database
- Firebase Storage

### Usage Examples

#### Initialize Firebase Admin
```typescript
import admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

#### Send Push Notification
```typescript
async function sendPushNotification(token: string, title: string, body: string) {
  const message = {
    notification: {
      title: title,
      body: body
    },
    token: token,
    android: {
      priority: 'high',
      notification: {
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };
  
  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Firebase Messaging Error:', error);
    throw error;
  }
}
```

---

## Elasticsearch Client

### Overview
Elasticsearch client (`@elastic/elasticsearch`) is used for search functionality and analytics.

### Configuration
```typescript
// Environment variables
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
```

### Key Features
- Full-text search
- Analytics and monitoring
- Index management
- Query operations

### Usage Examples

#### Initialize Elasticsearch Client
```typescript
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
});
```

#### Search Documents
```typescript
async function searchDocuments(index: string, query: string) {
  try {
    const result = await client.search({
      index: index,
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['title', 'description', 'content']
          }
        }
      }
    });
    
    return result.body.hits.hits;
  } catch (error) {
    console.error('Elasticsearch Error:', error);
    throw error;
  }
}
```

---

## Redis Client (IoRedis)

### Overview
IoRedis (`ioredis`) is used for caching, session management, and real-time data operations.

### Configuration
```typescript
// Environment variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

### Key Features
- Caching
- Session storage
- Real-time data
- Pub/Sub messaging

### Usage Examples

#### Initialize Redis Client
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});
```

#### Cache Operations
```typescript
async function cacheData(key: string, data: any, ttl: number = 3600) {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log('Data cached successfully');
  } catch (error) {
    console.error('Redis Cache Error:', error);
    throw error;
  }
}

async function getCachedData(key: string) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis Get Error:', error);
    return null;
  }
}
```

---

## Nodemailer

### Overview
Nodemailer is used for sending emails and managing email communications.

### Configuration
```typescript
// Environment variables
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@strellerminds.com
```

### Key Features
- Email sending
- Template support
- Attachment handling
- Transport configuration

### Usage Examples

#### Configure Transporter
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

#### Send Email
```typescript
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email Send Error:', error);
    throw error;
  }
}
```

---

## JWT Authentication

### Overview
JWT tokens are used for authentication and authorization throughout the platform.

### Configuration
```typescript
// Environment variables
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d
```

### Key Features
- Token generation
- Token verification
- Refresh tokens
- Role-based access

### Usage Examples

#### Generate JWT Token
```typescript
import jwt from 'jsonwebtoken';

function generateToken(payload: any, expiresIn: string = '24h'): string {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
    issuer: 'strellerminds',
    audience: 'strellerminds-users'
  });
}

function generateRefreshToken(payload: any): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'strellerminds',
    audience: 'strellerminds-refresh'
  });
}
```

#### Verify Token
```typescript
function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'strellerminds',
      audience: 'strellerminds-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

---

## Best Practices

### Security
1. **Never hardcode credentials** - Always use environment variables
2. **Use HTTPS** for all external API calls
3. **Implement rate limiting** for external service calls
4. **Validate all inputs** before processing
5. **Use secure storage** for sensitive data

### Error Handling
1. **Implement try-catch blocks** for all SDK operations
2. **Log errors appropriately** without exposing sensitive information
3. **Provide meaningful error messages** to users
4. **Implement retry logic** for transient failures

### Performance
1. **Use connection pooling** for database and external service connections
2. **Implement caching** where appropriate
3. **Use async/await** for non-blocking operations
4. **Monitor SDK performance** and optimize as needed

### Monitoring
1. **Track SDK usage metrics**
2. **Monitor API rate limits**
3. **Set up alerts** for critical failures
4. **Log important events** for debugging

---

## Troubleshooting

### Common Issues

#### Stellar SDK Issues
- **Network connectivity**: Ensure Stellar network URL is accessible
- **Account not funded**: Testnet accounts need test lumens
- **Invalid key pairs**: Verify secret keys are correct

#### Stripe Issues
- **Webhook failures**: Verify webhook signature
- **Payment failures**: Check card details and fraud rules
- **API key issues**: Ensure correct API key is used

#### AWS/GCP/Azure Issues
- **Permission errors**: Check IAM/Service account permissions
- **Network connectivity**: Verify firewall and network settings
- **Configuration errors**: Validate connection strings and credentials

### Debugging Steps
1. Check environment variables are set correctly
2. Verify network connectivity to external services
3. Review SDK error messages and logs
4. Test with minimal configuration
5. Check service status and rate limits

---

## Support

For issues related to specific SDKs, please refer to:
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [AWS SDK Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Azure SDK Documentation](https://docs.microsoft.com/en-us/azure/developer/javascript/)
- [Google Cloud SDK Documentation](https://cloud.google.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)
- [Redis Documentation](https://redis.io/documentation)
- [Nodemailer Documentation](https://nodemailer.com/)

For platform-specific issues, please create an issue in the [StrellerMinds-Backend repository](https://github.com/StarkMindsHQ/StrellerMinds-Backend/issues).
