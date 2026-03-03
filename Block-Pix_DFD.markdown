# Data Flow Diagrams (DFD) for Block-Pix

This document outlines the data flow of the **Block-Pix** ecosystem from the Context Level (0) to the Detailed Level (2).

---

## 1. Level 0: Context Diagram
The Context Diagram represents the entire system as a single process and its interactions with external entities.

```mermaid
graph TD
    User((User))
    Blockchain((Blockchain - Aptos/BTC))
    IPFS((IPFS - Pinata))
    
    User -- "Login Credentials / Wallet Signature" --> BP(Block-Pix System)
    User -- "Upload Media / Create Will" --> BP
    
    BP -- "Authentication Status / Dashboard Data" --> User
    BP -- "Notarization Request / Tx Hash" --> Blockchain
    BP -- "Media Files / Pinning Req" --> IPFS
    
    Blockchain -- "Transaction Confirmation" --> BP
    IPFS -- "Content Identifier - CID" --> BP
```

---

## 2. Level 1: Process Diagram
Level 1 breaks the system into its primary functional modules.

```mermaid
graph TD
    User((User))
    DB[(MongoDB)]
    Blockchain((Blockchain))
    IPFS((IPFS))

    subgraph "Block-Pix Processes"
        P1[1.0 Authentication Service]
        P2[2.0 Memory Management]
        P3[3.0 Legacy & Will Service]
        P4[4.0 Story & Journey Service]
    end

    User -- "Sign Message" --> P1
    P1 -- "Verify & Issue JWT" --> User
    P1 -- "User Profile" --> DB

    User -- "Media Upload" --> P2
    P2 -- "Store CID & Metadata" --> DB
    P2 -- "Upload File" --> IPFS
    P2 -- "Anchor Hash" --> Blockchain

    User -- "Set Triggers / Beneficiaries" --> P3
    P3 -- "Will Config" --> DB
    P3 -- "Monitor Activity" --> P3

    User -- "View Timeline" --> P4
    P4 -- "Fetch Stories" --> DB
```

---

## 3. Level 2: Detailed Data Flow
Detailed breakdown of the **Memory Storage** and **Digital Will** processes.

### 2.1 Memory Management (Detailed)
```mermaid
graph LR
    User((User))
    IPFS((IPFS))
    DB[(MongoDB)]

    P2.1[2.1 Encryption & Buffer]
    P2.2[2.2 Pinata API Gateway]
    P2.3[2.3 Metadata Indexer]

    User -- "Raw File" --> P2.1
    P2.1 -- "Encrypted Blob" --> P2.2
    P2.2 -- "Store Request" --> IPFS
    IPFS -- "Return CID" --> P2.2
    P2.2 -- "CID + File Info" --> P2.3
    P2.3 -- "Save Record" --> DB
```

### 2.2 Digital Will & Dead Man's Switch (Detailed)
```mermaid
graph LR
    User((User))
    DB[(MongoDB)]
    Email((Email Service))
    Beneficiary((Beneficiary))

    P3.1[3.1 Heartbeat Monitor]
    P3.2[3.2 Trigger Logic]
    P3.3[3.3 Multi-Sig Release]

    User -- "Check-in / Activity" --> P3.1
    P3.1 -- "Update LastActive" --> DB
    DB -- "Inactivity Detected" --> P3.2
    P3.2 -- "Send Warnings" --> Email
    Email -- "Warning" --> User
    
    P3.3 -- "Confirmation Req" --> Beneficiary
    Beneficiary -- "Wallet Approval" --> P3.3
    P3.3 -- "Unlock Shared CIDs" --> DB
```

---

## 4. Entity-Process Data Summary

| Process | Data Input | Data Output | Source/Sink |
| :--- | :--- | :--- | :--- |
| **Auth** | Wallet Signature | JWT Session Token | User / Auth Service |
| **Storage** | Media File | IPFS CID | User / Pinata |
| **Will** | Inactivity Period | Execution Event | User / DB |
| **Notary** | Memory Hash | On-chain Tx Hash | App / Aptos |
