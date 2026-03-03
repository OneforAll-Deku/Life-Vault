# 🛡️ Life Vault: The Ultimate On-Chain Memory & Legacy Protection System

**Life Vault** is a state-of-the-art, secure platform designed to preserve your digital legacy, protect sensitive memories, and ensure a seamless transfer of assets and information to your loved ones. Built with a focus on privacy, security, and decentralization.

## ✨ Core Features

### 🔐 Multi-Chain Security & Authentication
- **Aptos & Bitcoin Integration**: Secure wallet-based authentication for both Aptos and Bitcoin ecosystems.
- **Stateless Architecture**: Modern authentication flow using JWTs and secure signatures, removing server-side database dependencies for auth.

### 🧠 AI-Powered Memory Vault
- **Semantic Search**: Powered by **Pinecone Integrated Inference**, allowing you to find memories based on context and meaning rather than just keywords.
- **Privacy-First Indexing**: Your data is indexed securely with multi-tenant isolation.
- **Rich Media Storage**: (Upcoming) Support for encrypted image and document storage via IPFS/Pinata.

### 📜 Digital Will & Legacy Transfer
- **Dead Man's Switch**: A fail-safe mechanism that triggers if you're inactive for a set period.
- **Beneficiary Management**: Securely designate and verify heirs using blockchain-verified identities.
- **Multi-Signature Protection**: Ensure critical actions require multiple confirmations for maximum security.

## 🛠️ Tech Stack

- **Frontend**: Vite + React, Tailwind CSS (Custom Premium Light/Dark Theme).
- **Backend**: Node.js + Express.
- **Database/Vector Store**: Pinecone (for semantic memory indexing).
- **Blockchain**: Aptos SDK, Bitcoin Signature Verification.
- **Authentication**: JWT + Wallet Signatures.
- **Deployment**: Render (Backend), Vercel (Frontend).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Pinecone Account & API Key
- Aptos/Bitcoin Wallet

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
   # Create a .env file based on the provided configuration
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd LV/lifevault-journey-builder
   npm install
   npm run dev
   ```

## 🛡️ Security Note
This project utilizes a stateless architecture. Ensure your `.env` files are never committed to version control. All sensitive keys and IDs are excluded via `.gitignore`.

---
*Created and maintained with ❤️ by the Life Vault Team.*
