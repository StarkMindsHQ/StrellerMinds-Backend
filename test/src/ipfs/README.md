# IPFS Integration

This module provides integration with the InterPlanetary File System (IPFS) for decentralized content storage and retrieval.

## Endpoints

### Add Content
- **URL**: `/ipfs/add`
- **Method**: `POST`
- **Body**:
  - `content`: The content to be stored on IPFS (string).
- **Response**:
  - `cid`: The Content Identifier (CID) for the stored content.

### Get Content
- **URL**: `/ipfs/get/:cid`
- **Method**: `GET`
- **Parameters**:
  - `cid`: The Content Identifier of the content to retrieve.
- **Response**:
  - `content`: The retrieved content from IPFS.

## Features
- **Content Storage**: Store content on IPFS with pinning for persistence.
- **Content Retrieval**: Retrieve content using its CID with caching for efficiency.
- **Content Verification**: Verify content integrity using hashes.

## Usage
To use the IPFS integration, send a POST request to `/ipfs/add` with the content you wish to store. Retrieve the content using a GET request to `/ipfs/get/:cid` with the CID.

## Tests
Unit and integration tests are provided to ensure functionality. Run tests using `npm run test`.
