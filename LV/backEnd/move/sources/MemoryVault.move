/// MemoryVault - Store and prove ownership of memories on Aptos
/// 
/// This module allows users to:
/// - Store IPFS hashes of their encrypted memories
/// - Prove ownership with timestamps
/// - Transfer memories (for inheritance)
module memory_vault::memory_vault {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_MEMORY_NOT_FOUND: u64 = 2;
    const E_INVALID_ADDRESS: u64 = 3;
    const E_ALREADY_INITIALIZED: u64 = 4;
    const E_NOT_YET_UNLOCKED: u64 = 5;
    const E_NOT_BENEFICIARY: u64 = 6;
    const E_ALREADY_CLAIMED: u64 = 7;

    /// Represents a single memory
    struct Memory has store, drop, copy {
        id: u64,
        ipfs_hash: String,
        owner: address,
        timestamp: u64,
    }

    /// Store for all memories - held by module publisher
    struct MemoryStore has key {
        memories: vector<Memory>,
        total_count: u64,
    }

    /// User's memory IDs - resource stored in user's account
    struct UserMemories has key {
        memory_ids: vector<u64>,
    }

    /// Represents a time-locked legacy capsule
    struct Capsule has store, drop, copy {
        id: u64,
        ipfs_hash: String,
        creator: address,
        beneficiary: address,
        release_timestamp: u64,
        created_at: u64,
        claimed: bool,
    }

    /// Store for all capsules
    struct CapsuleStore has key {
        capsules: vector<Capsule>,
        total_count: u64,
    }

    // Events
    #[event]
    struct MemoryStoredEvent has drop, store {
        memory_id: u64,
        owner: address,
        ipfs_hash: String,
        timestamp: u64,
    }

    #[event]
    struct MemoryTransferredEvent has drop, store {
        memory_id: u64,
        from: address,
        to: address,
    }

    #[event]
    struct CapsuleCreatedEvent has drop, store {
        capsule_id: u64,
        creator: address,
        beneficiary: address,
        release_timestamp: u64,
    }

    #[event]
    struct CapsuleClaimedEvent has drop, store {
        capsule_id: u64,
        beneficiary: address,
    }

    /// Initialize the memory store (called once by module publisher)
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<MemoryStore>(addr), E_ALREADY_INITIALIZED);
        
        move_to(account, MemoryStore {
            memories: vector::empty<Memory>(),
            total_count: 0,
        });

        move_to(account, CapsuleStore {
            capsules: vector::empty<Capsule>(),
            total_count: 0,
        });
    }

    /// Store a new memory
    public entry fun store_memory(
        account: &signer,
        ipfs_hash: String,
    ) acquires MemoryStore, UserMemories {
        let owner = signer::address_of(account);
        let store = borrow_global_mut<MemoryStore>(@memory_vault);
        
        let memory_id = store.total_count + 1;
        let current_time = timestamp::now_seconds();
        
        let memory = Memory {
            id: memory_id,
            ipfs_hash,
            owner,
            timestamp: current_time,
        };
        
        vector::push_back(&mut store.memories, memory);
        store.total_count = memory_id;
        
        // Add to user's memory list
        if (!exists<UserMemories>(owner)) {
            move_to(account, UserMemories {
                memory_ids: vector::empty<u64>(),
            });
        };
        let user_memories = borrow_global_mut<UserMemories>(owner);
        vector::push_back(&mut user_memories.memory_ids, memory_id);
        
        // Emit event
        event::emit(MemoryStoredEvent {
            memory_id,
            owner,
            ipfs_hash,
            timestamp: current_time,
        });
    }

    /// Transfer memory to new owner
    public entry fun transfer_memory(
        account: &signer,
        memory_id: u64,
        new_owner: address,
    ) acquires MemoryStore {
        let sender = signer::address_of(account);
        let store = borrow_global_mut<MemoryStore>(@memory_vault);
        
        // Find and update memory
        let len = vector::length(&store.memories);
        let i = 0;
        while (i < len) {
            let memory = vector::borrow_mut(&mut store.memories, i);
            if (memory.id == memory_id) {
                assert!(memory.owner == sender, E_NOT_OWNER);
                memory.owner = new_owner;
                
                // Emit event
                event::emit(MemoryTransferredEvent {
                    memory_id,
                    from: sender,
                    to: new_owner,
                });
                return
            };
            i = i + 1;
        };
        abort E_MEMORY_NOT_FOUND
    }

    /// Create a new time-locked capsule
    public entry fun create_capsule(
        account: &signer,
        ipfs_hash: String,
        beneficiary: address,
        release_timestamp: u64,
    ) acquires CapsuleStore {
        let creator = signer::address_of(account);
        let store = borrow_global_mut<CapsuleStore>(@memory_vault);
        
        let capsule_id = store.total_count + 1;
        let current_time = timestamp::now_seconds();
        
        let capsule = Capsule {
            id: capsule_id,
            ipfs_hash,
            creator,
            beneficiary,
            release_timestamp,
            created_at: current_time,
            claimed: false,
        };
        
        vector::push_back(&mut store.capsules, capsule);
        store.total_count = capsule_id;
        
        // Emit event
        event::emit(CapsuleCreatedEvent {
            capsule_id,
            creator,
            beneficiary,
            release_timestamp,
        });
    }

    /// Claim a capsule (only by beneficiary after release timestamp)
    public entry fun claim_capsule(
        account: &signer,
        capsule_id: u64,
    ) acquires CapsuleStore, UserMemories {
        let beneficiaryAddress = signer::address_of(account);
        let store = borrow_global_mut<CapsuleStore>(@memory_vault);
        let current_time = timestamp::now_seconds();
        
        // Find and update capsule
        let len = vector::length(&store.capsules);
        let i = 0;
        let found = false;
        while (i < len) {
            let capsule = vector::borrow_mut(&mut store.capsules, i);
            if (capsule.id == capsule_id) {
                assert!(capsule.beneficiary == beneficiaryAddress, E_NOT_BENEFICIARY);
                assert!(!capsule.claimed, E_ALREADY_CLAIMED);
                assert!(current_time >= capsule.release_timestamp, E_NOT_YET_UNLOCKED);
                
                capsule.claimed = true;
                found = true;
                
                // Add to user's memory list
                if (!exists<UserMemories>(beneficiaryAddress)) {
                    move_to(account, UserMemories {
                        memory_ids: vector::empty<u64>(),
                    });
                };
                let user_memories = borrow_global_mut<UserMemories>(beneficiaryAddress);
                vector::push_back(&mut user_memories.memory_ids, capsule_id);
                
                // Emit event
                event::emit(CapsuleClaimedEvent {
                    capsule_id,
                    beneficiary: beneficiaryAddress,
                });
                break
            };
            i = i + 1;
        };
        assert!(found, E_MEMORY_NOT_FOUND);
    }

    #[view]
    public fun get_memory(memory_id: u64): (String, address, u64) acquires MemoryStore {
        let store = borrow_global<MemoryStore>(@memory_vault);
        let len = vector::length(&store.memories);
        let i = 0;
        while (i < len) {
            let memory = vector::borrow(&store.memories, i);
            if (memory.id == memory_id) {
                return (memory.ipfs_hash, memory.owner, memory.timestamp)
            };
            i = i + 1;
        };
        abort E_MEMORY_NOT_FOUND
    }

    #[view]
    public fun get_total_memories(): u64 acquires MemoryStore {
        borrow_global<MemoryStore>(@memory_vault).total_count
    }

    #[view]
    public fun verify_ownership(memory_id: u64, owner: address): bool acquires MemoryStore {
        let store = borrow_global<MemoryStore>(@memory_vault);
        let len = vector::length(&store.memories);
        let i = 0;
        while (i < len) {
            let memory = vector::borrow(&store.memories, i);
            if (memory.id == memory_id) {
                return memory.owner == owner
            };
            i = i + 1;
        };
        false
    }

    #[view]
    public fun get_user_memory_count(user: address): u64 acquires UserMemories {
        if (!exists<UserMemories>(user)) {
            return 0
        };
        vector::length(&borrow_global<UserMemories>(user).memory_ids)
    }

    #[view]
    public fun get_capsule(capsule_id: u64): (String, address, address, u64, bool) acquires CapsuleStore {
        let store = borrow_global<CapsuleStore>(@memory_vault);
        let len = vector::length(&store.capsules);
        let i = 0;
        while (i < len) {
            let capsule = vector::borrow(&store.capsules, i);
            if (capsule.id == capsule_id) {
                return (capsule.ipfs_hash, capsule.creator, capsule.beneficiary, capsule.release_timestamp, capsule.claimed)
            };
            i = i + 1;
        };
        abort E_MEMORY_NOT_FOUND
    }

    #[view]
    public fun get_total_capsules(): u64 acquires CapsuleStore {
        borrow_global<CapsuleStore>(@memory_vault).total_count
    }
}