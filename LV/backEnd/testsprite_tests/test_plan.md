# Backend Test Plan

## Overview
This test plan covers the backend services of LifeVault, including API endpoints for Memory Management, User Authentication, and Wallet Integration.

## Test Scope
- **Unit Tests**: Controllers and Services (Mocked DB/External Services)
- **Integration Tests**: API Endpoints (Running Server)
- **System Tests**: End-to-end flows (e.g., Register -> Login -> Create Memory)

## Features to Test

### 1. User Authentication
**Endpoints**:
- `POST /api/auth/register`
- `POST /api/auth/login`

**Test Cases**:
- Register a new user with valid email/password.
- Attempt registration with existing email (should fail).
- Login with valid credentials.
- Login with invalid password (should fail).
- Check JWT token generation and validity.

### 2. Wallet Authentication
**Endpoints**:
- `POST /api/wallet/auth` (or `/api/auth/wallet`)

**Test Cases**:
- Verify Aptos wallet signature (Ed25519).
- Verify Bitcoin wallet signature.
- Verify Burner wallet signature.
- Reject invalid signatures.
- Create new user on first wallet login.
- Link wallet to existing account.

### 3. Memory Management
**Endpoints**:
- `POST /api/memories`
- `GET /api/memories` (List)
- `GET /api/memories/:id` (Details)

**Test Cases**:
- Create access token (Login).
- Upload memory with image/video and metadata.
- Verify IPFS pinning (via Pinata).
- Verify metadata storage in MongoDB.
- Retrieve memory list and verify pagination.
- Retrieve specific memory and check details.
- Relay memory specific logic.

### 4. IPFS Integration
**Services**: `ipfsService.js`

**Test Cases**:
- Pin file to IPFS.
- Retrieve file from IPFS.
- Handle Pinata API errors gracefully.

## Test Environment
- **Framework**: Jest + Supertest
- **Database**: MongoDB (Local/Atlas Test Cluster)
- **External Services**: Pinata (Mocked or Test Creds), Aptos Devnet
