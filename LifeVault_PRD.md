# Product Requirements Document (PRD): LifeVault

## 1. Project Overview
**Product Name:** LifeVault
**Tagline:** Your life, secured on the chain.
**Mission:** Provide a decentralized, secure, and permanent digital sanctuary for personal memories (stories, photos, milestones) using blockchain and IPFS technology.

## 2. Target Audience
- **Web3 Enthusiasts:** Users who value data ownership and decentralization.
- **Privacy-Conscious Individuals:** People looking for alternatives to centralized cloud storage.
- **Families:** Users wanting to preserve family history across generations on an unchangeable ledger.

## 3. Core Features

### 3.1 Multi-Chain Wallet Authentication
- **Aptos Integration:** Support for Petra Wallet and other Aptos-compatible wallets.
- **Bitcoin Support:** Integration with BitPay for Bitcoin Testnet4 authentication.
- **Burner Wallet:** A "Guest Mode" for frictionless onboarding without requiring a browser extension.
- **Message Signing:** Secure authentication flow using cryptographic signatures.

### 3.2 Decentralized Memory Storage
- **IPFS Pinning:** Media files (images, videos) are pinned to IPFS via Pinata for permanent storage.
- **Metadata Management:** Memory details (title, description, category, date) stored in a secure backend database and linked via IPFS CID.
- **On-Chain Anchoring:** Optional ability to anchor memory hashes to the Aptos blockchain for verifiable proof of existence.

### 3.3 Interactive User Experience
- **Dynamic Dashboard:** Real-time stats showing memory count, Aptos balance, and Bitcoin wallet status.
- **Visual Timeline:** A chronological "Journey Builder" to navigate through life milestones.
- **Quick Actions:** Instant upload and story creation tools.
- **Premium Design:** Glassmorphic UI with dark mode support and smooth animations.

## 4. Technical Stack

### 4.1 Frontend
- **Framework:** React 18+ with Vite.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS & Shadcn UI.
- **State Management:** React Context API (WalletContext, AuthContext).
- **Icons:** Lucide-React.

### 4.2 Backend
- **Server:** Node.js with Express.
- **Database:** MongoDB with Mongoose.
- **Security:** JWT (JSON Web Tokens), Helmet, Bcryptjs.
- **Authentication:** Custom wallet signature verification (Aptos/Bitcoin).

### 4.3 Third-Party Services
- **Storage:** Pinata (IPFS Gateway & Pinning).
- **Blockchain:** Aptos Labs TS SDK.
- **Wallet Connectors:** @aptos-labs/wallet-adapter-react.

## 5. Roadmap & Future Enhancements
- **Social Sharing:** Securely share specific "Vaults" with friends or family.
- **Encryption:** Client-side encryption for private memories.
- **Cross-Chain Expansion:** Support for Ethereum and Polygon.
- **AI Integration:** Automated memory categorization and journal prompts.
