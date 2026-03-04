# 🛡️ Life Vault: The Ultimate On-Chain Memory & Legacy Protection System

**Life Vault** is a state-of-the-art, secure platform designed to preserve your digital legacy, protect sensitive memories, and ensure a seamless transfer of assets and information to your loved ones. Built with a focus on privacy, security, and decentralization.

![Life Vault Architecture](./LV/lifevault-journey-builder/public/favicon.ico)

## ✨ Core Features

### 🔐 Multi-Chain Security & Authentication
- **Aptos & Bitcoin Integration**: Secure wallet-based authentication for both Aptos and Bitcoin ecosystems.
- **Stateless Architecture**: Modern authentication flow using JWTs and secure signatures, removing external database dependencies for auth.

### 🧠 AI-Powered Memory Vault
- **Semantic Search**: Powered by **Pinecone Integrated Inference**, allowing you to find memories based on context and meaning rather than just keywords.
- **Privacy-First Indexing**: Your vector data is indexed securely with multi-tenant isolation.
- **Rich Media Storage**: (Upcoming) Support for encrypted image and document storage via IPFS/Pinata.

### 📜 Digital Will & Legacy Transfer
- **Dead Man's Switch**: A fail-safe mechanism that triggers if you're inactive for a set period.
- **Beneficiary Management**: Securely designate and verify heirs using blockchain-verified identities.
- **Multi-Signature Protection**: Ensure critical actions require multiple confirmations for maximum security.

### 💾 Local File-Based Persistence
- **No MongoDB Dependency**: To enable immediate local deployment without massive Docker setups, all primary state (Users, Digital Wills, Quests, Stories) natively persists locally to JSON via our custom model abstraction layer inside `LV/backEnd/data/` while production-ready features connect remotely.

## 🛠️ Tech Stack

- **Frontend**: Vite + React, Tailwind CSS (Custom Premium Light Theme).
- **Backend**: Node.js + Express.
- **Database/Vector Store**: Pinecone (for semantic memory indexing).
- **Primary Data**: Seamless File-Based JSON local persistence.
- **Blockchain**: Aptos SDK.
- **Authentication**: JWT + Wallet Signatures.
- **Deployment**: Render (Backend monorepo orchestrator), Frontend can be served standalone or proxied.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Pinecone Account & API Key
- Aptos Wallet

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/OneforAll-Deku/Life-Vault.git
   cd Life-Vault
   ```

2. **Backend Setup**:
   ```bash
   cd LV/backEnd
   npm install

   # Setup the Pinecone Index
   node src/scripts/initPinecone.js

   # Run the development server
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../lifevault-journey-builder
   npm install
   npm run dev
   ```

## 🛡️ Security Best Practices & Constraints
- **Zero Hardcoded Secrets**: Do **NOT** commit hardcoded API keys (e.g., Pinecone, Gemini, or Aptos keys) to version control. 
- **.env Ignored**: The `.env` file containing secrets is explicitly listed in `.gitignore`. 
- **Local Data Protection**: The `LV/backEnd/data/` directory where users' local JSON data mimics MongoDB is also `.gitignored` to prevent data leaks.
- Always use environment variables managed via Render explicitly, rather than hardcoding in scripts.

---
*Created and maintained with ❤️ by the Life Vault Team.*
