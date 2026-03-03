# Software Requirements Specification (SRS) for Block-Pix

## 1. Introduction
### 1.1 Purpose
This document details the functional and non-functional requirements for the **Block-Pix** ecosystem, a decentralized digital sanctuary for secure, permanent memory storage and legacy management.

### 1.2 Scope
Block-Pix leverages Aptos/Bitcoin blockchain and IPFS storage to ensure user data remains immutable, private, and transferable across generations through smart contracts and digital wills.

---

## 2. Overall Description
### 2.1 Product Perspective
Block-Pix is a hybrid web application (MERN stack) integrating decentralized protocols:
*   **Infrastructure**: IPFS (Pinata) for media storage, Aptos for on-chain identity/notarization.
*   **Logical Tiers**: React SPA frontend, Node.js API backend, MongoDB for state metadata.

### 2.2 Product Functions
*   **Identity**: Multi-chain wallet authentication (Aptos/BTC) and Guest mode.
*   **Preservation**: IPFS pinning of media with optional AES-256-GCM encryption.
*   **Legacies**: Digital Wills with Dead Man's Switch and Multi-Sig release triggers.
*   **Stories**: Chronological Journey Builder and Time-locked capsules.

---

## 3. System Features (Functional Requirements)
### 3.1 Authentication & Security
*   **FR-1**: Authenticate via wallet message signing (Aptos/BitPay) or local Burner Wallets.
*   **FR-2**: Secure all API endpoints using JWT and custom signature verification middleware.

### 3.2 Decentralized Storage
*   **FR-3**: Upload and pin media (photo, video, documents) to IPFS with permanent CIDs.
*   **FR-4**: Anchor memory metadata hashes to the Aptos blockchain for verifiable proof.

### 3.3 Legacy & Wills
*   **FR-5**: Create Digital Wills with configurable inactivity triggers (Dead Man's Switch).
*   **FR-6**: Implement Multi-Signature release, requiring M-of-N beneficiary confirmations.
*   **FR-7**: Support Time-Locked Capsules restricted by future timestamps and wallet addresses.

### 3.4 Content Organization
*   **FR-8**: Group memories into multi-chapter "Stories" displayed on a visual timeline.

---

## 4. Non-Functional Requirements
### 4.1 Performance & Reliability
*   **NFR-1**: Media metadata retrieval from IPFS shall execute within 2 seconds.
*   **NFR-2**: Ensure 99.9% data persistence via redundant IPFS pinning through Pinata.

### 4.2 Security & Compliance
*   **NFR-3**: User keys must remain client-side; server handles only signed payloads.
*   **NFR-4**: Audit logs must capture all state changes in Digital Wills and Notarization events.

---

## 5. Technical Specification
### 5.1 Data Architecture
*   **Schemas**: `User`, `Memory` (IPFS Link), `DigitalWill` (Trigger Logic), `Story` (Timeline).
*   **Services**: IPFS Pinning Service, Blockchain Notarization, JWT Auth Manager.

### 5.2 External Interfaces
*   **API**: RESTful Node.js endpoints.
*   **Blockchain**: Aptos TS SDK, BitPay for Testnet4.
*   **UI**: Responsive Glassmorphic design with unique IDs for automated testing.
