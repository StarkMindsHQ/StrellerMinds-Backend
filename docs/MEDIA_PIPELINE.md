# Media Processing Pipeline

This document describes the architecture and workflow of the media processing pipeline, which handles video uploads, transcoding, storage, and secure delivery.

## 1. Overview

The media pipeline is built using NestJS and leverages Bull for background job processing, fluent-ffmpeg for video transcoding, and AWS S3 (with LocalStack for local development) for storage.

The pipeline consists of the following components:

-   **`MediaModule`**: The main module that encapsulates all the media-related functionality.
-   **`MediaController`**: Exposes the API endpoints for uploading videos, checking transcoding status, and getting signed URLs for content delivery.
-   **`MediaService`**: Contains the business logic for creating video records in the database and interacting with the transcoding queue.
-   **`TranscodeProcessor`**: A Bull processor that handles the video transcoding jobs. It uses `fluent-ffmpeg` to convert videos to HLS and generate thumbnails.
-   **`S3Service`**: A service that handles all interactions with AWS S3, including uploading files and generating signed URLs.
-   **`Video` Entity**: A TypeORM entity that represents the video metadata stored in the database.

## 2. Workflow

1.  **Upload**: A client uploads a video file to the `/media/upload` endpoint. The `MediaController` receives the file and saves it to a temporary local directory using `multer`.
2.  **Enqueue Job**: The `MediaService` creates a new `Video` record in the database with the status `UPLOADING` and then adds a new job to the `transcode` Bull queue. The job data includes the path to the temporary file and the ID of the video record.
3.  **Transcode**: The `TranscodeProcessor` picks up the job from the queue and starts processing it. It updates the video status to `PROCESSING`.
4.  **HLS and Thumbnails**: The processor uses `fluent-ffmpeg` to transcode the video into an HLS stream (with multiple bitrates, if configured) and generate a set of thumbnails. The transcoded files are saved to a temporary local directory.
5.  **Upload to S3**: The processor uploads the HLS playlist, video segments, and thumbnails to an S3 bucket.
6.  **Update Metadata**: After the upload is complete, the processor updates the `Video` record in the database with the status `READY` and the URLs for the HLS playlist and thumbnails. If the transcoding fails, the status is updated to `FAILED`.
7.  **Cleanup**: The processor cleans up the temporary local files.
8.  **Secure Delivery**: The client can request a signed URL for the HLS playlist by calling the `/media/:videoId/signed-url` endpoint. The `MediaController` uses the `S3Service` to generate a signed URL with a limited expiration time, which the client can use to fetch the video content directly from S3.

## 3. Local Development and Testing

For local development and testing, the pipeline uses LocalStack to simulate AWS S3 and a local Redis instance for the Bull queue.

### 3.1. Setup

1.  **Install Dependencies**: Make sure you have Docker and Docker Compose installed.
2.  **Start Services**: Run the following command to start the LocalStack and Redis services:

    ```bash
    docker-compose -f docker-compose.test.yml up -d
    ```

3.  **Environment Variables**: Create a `.env` file in the root of the project with the following content:

    ```
    AWS_ACCESS_KEY_ID=test
    AWS_SECRET_ACCESS_KEY=test
    AWS_REGION=us-east-1
    S3_ENDPOINT=http://localhost:4566
    S3_BUCKET_NAME=media-bucket
    ```

### 3.2. Running Tests

To run the integration tests for the media pipeline, use the following command:

```bash
npm run test:e2e
```

This will run the `media.e2e-spec.ts` test file, which covers the entire video processing workflow.
