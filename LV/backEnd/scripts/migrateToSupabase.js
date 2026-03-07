/**
 * Data Migration Script: Local JSON → Supabase
 * 
 * Reads existing data from /data/*.json and upserts into Supabase tables.
 * Run with: node scripts/migrateToSupabase.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Map JSON filenames to Supabase table names
const FILE_TABLE_MAP = {
    'users.json': 'users',
    'memories.json': 'memories',
    'stories.json': 'stories',
    'storychapters.json': 'story_chapters',
    'digitalwills.json': 'digital_wills',
    'badges.json': 'badges',
    'campaigns.json': 'campaigns',
    'quests.json': 'quests',
    'questcompletions.json': 'quest_completions',
    'familyvaults.json': 'family_vaults',
    'sharedlinks.json': 'shared_links',
};

// Field name transformations (camelCase → snake_case) per table
const FIELD_TRANSFORMS = {
    users: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        aptosAddress: 'aptos_address',
        userType: 'user_type',
        questsCompleted: 'quests_completed',
        memoriesCreated: 'memories_created',
        storiesCreated: 'stories_created',
        digitalWillsCreated: 'digital_wills_created',
        lastLogin: 'last_login',
        isActive: 'is_active',
        lastCheckIn: 'last_check_in',
    },
    memories: {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        fileSize: 'file_size',
        ipfsHash: 'ipfs_hash',
        txHash: 'tx_hash',
        isOnChain: 'is_on_chain',
        mediaType: 'media_type',
        sharedWith: 'shared_with',
        encryptionKey: 'encryption_key',
    },
    stories: {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        coverImage: 'cover_image',
        chapterCount: 'chapter_count',
        isPublished: 'is_published',
    },
    story_chapters: {
        storyId: 'story_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        orderIndex: 'order_index',
        mediaAssets: 'media_assets',
    },
    digital_wills: {
        userId: 'user_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        multiSig: 'multi_sig',
        deadManSwitch: 'dead_man_switch',
        legalTemplate: 'legal_template',
        globalMemories: 'global_memories',
        executedAt: 'executed_at',
        executionTxHash: 'execution_tx_hash',
        activityLog: 'activity_log',
    },
    badges: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        imageUrl: 'image_url',
        pointValue: 'point_value',
        campaignId: 'campaign_id',
        nftMetadata: 'nft_metadata',
        isTransferable: 'is_transferable',
        isBurnable: 'is_burnable',
        totalAwarded: 'total_awarded',
        uniqueHolders: 'unique_holders',
    },
    campaigns: {
        organizationId: 'organization_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        campaignType: 'campaign_type',
        organizationType: 'organization_type',
        organizationName: 'organization_name',
        organizationLogo: 'organization_logo',
        contactEmail: 'contact_email',
        completionRequirements: 'completion_requirements',
        grandPrize: 'grand_prize',
        startDate: 'start_date',
        endDate: 'end_date',
        targetRegions: 'target_regions',
        coverImage: 'cover_image',
        bannerImage: 'banner_image',
        shortCode: 'short_code',
    },
    quests: {
        creatorId: 'creator_id',
        creatorType: 'creator_type',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        questType: 'quest_type',
        timeWindow: 'time_window',
        qrCode: 'qr_code',
        aiVerification: 'ai_verification',
        startDate: 'start_date',
        endDate: 'end_date',
        campaignId: 'campaign_id',
        coverImage: 'cover_image',
        maxCompletions: 'max_completions',
    },
    quest_completions: {
        questId: 'quest_id',
        userId: 'user_id',
        campaignId: 'campaign_id',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        attemptNumber: 'attempt_number',
        startedAt: 'started_at',
        completedAt: 'completed_at',
    },
    family_vaults: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        createdBy: 'created_by',
        isArchived: 'is_archived',
    },
    shared_links: {
        memoryId: 'memory_id',
        creatorId: 'creator_id',
        createdAt: 'created_at',
        accessToken: 'access_token',
        expiresAt: 'expires_at',
        maxUses: 'max_uses',
        useCount: 'use_count',
        isActive: 'is_active',
    },
};

function transformRecord(record, tableName) {
    const transforms = FIELD_TRANSFORMS[tableName] || {};
    const transformed = {};

    for (const [key, value] of Object.entries(record)) {
        // Use _id as id if present
        if (key === '_id') {
            transformed['id'] = value;
            continue;
        }
        const newKey = transforms[key] || key;
        transformed[newKey] = value;
    }

    // Ensure id is present
    if (!transformed.id && record._id) {
        transformed.id = record._id;
    }

    return transformed;
}

async function migrateFile(filename, tableName) {
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${filename} — file not found.`);
        return { filename, status: 'skipped', reason: 'file not found' };
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    let records;
    try {
        records = JSON.parse(raw);
    } catch {
        console.error(`❌ Failed to parse ${filename}`);
        return { filename, status: 'error', reason: 'parse error' };
    }

    if (!Array.isArray(records) || records.length === 0) {
        console.log(`⏭️  Skipping ${filename} — empty or not an array.`);
        return { filename, status: 'skipped', reason: 'empty' };
    }

    console.log(`\n📦 Migrating ${filename} → ${tableName} (${records.length} records)...`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
        const transformed = transformRecord(record, tableName);
        try {
            const { error } = await supabase
                .from(tableName)
                .upsert(transformed);

            if (error) {
                console.error(`  ❌ ${transformed.id}: ${error.message}`);
                errorCount++;
            } else {
                successCount++;
            }
        } catch (err) {
            console.error(`  ❌ ${transformed.id}: ${err.message}`);
            errorCount++;
        }
    }

    console.log(`  ✅ ${successCount} migrated, ❌ ${errorCount} failed.`);
    return { filename, status: 'done', success: successCount, errors: errorCount };
}

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  Block Pix — Data Migration: JSON → Supabase');
    console.log('═══════════════════════════════════════════════\n');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
        process.exit(1);
    }

    console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`📂 Data dir:     ${DATA_DIR}\n`);

    const results = [];

    for (const [filename, tableName] of Object.entries(FILE_TABLE_MAP)) {
        const result = await migrateFile(filename, tableName);
        results.push(result);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  Migration Summary');
    console.log('═══════════════════════════════════════════════');
    for (const r of results) {
        const icon = r.status === 'done' ? '✅' : (r.status === 'skipped' ? '⏭️' : '❌');
        console.log(`  ${icon} ${r.filename.padEnd(25)} → ${r.status}${r.success ? ` (${r.success} ok, ${r.errors} err)` : ''}`);
    }
    console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
});
