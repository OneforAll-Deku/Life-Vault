import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseService {
    constructor() {
        this.client = supabase;
    }

    /**
     * Generic upsert for any piece of data
     * @param {string} id - The ID of the record
     * @param {Object} data - The data to upsert
     * @param {string} table - The table name (mapped from namespace)
     */
    async upsert(id, data, table = 'memories') {
        try {
            const { data: result, error } = await this.client
                .from(table)
                .upsert({ id, ...data, updated_at: new Date().toISOString() })
                .select();

            if (error) throw error;
            console.log(`✅ Upserted ${id} to Supabase table: ${table}`);
            return result;
        } catch (error) {
            console.error(`❌ Supabase upsert failed for ${id}:`, error.message);
            throw error;
        }
    }

    /**
     * Generic fetch by criteria
     */
    async find(table, query = {}) {
        try {
            let request = this.client.from(table).select('*').order('created_at', { ascending: false });

            // Basic support for query objects
            for (const [key, value] of Object.entries(query)) {
                request = request.eq(key, value);
            }

            const { data, error } = await request;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`❌ Supabase find failed on ${table}:`, error.message);
            throw error;
        }
    }

    /**
     * Fetch all records for a user from a table
     */
    async listRecords(userId, table = 'memories', limit = 100) {
        try {
            const { data, error } = await this.client
                .from(table)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`❌ Supabase list failed in ${table}:`, error.message);
            return [];
        }
    }

    /**
     * Fetch a record by ID
     */
    async getRecord(id, table = 'memories') {
        try {
            const { data, error } = await this.client
                .from(table)
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`❌ Supabase record fetch failed for ${id}:`, error.message);
            return null;
        }
    }

    /**
     * Delete a record by ID
     */
    async deleteRecord(id, table = 'memories') {
        try {
            const { error } = await this.client
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;
            console.log(`✅ Deleted ${id} from Supabase table ${table}`);
            return true;
        } catch (error) {
            console.error('❌ Supabase deletion failed:', error.message);
            return false;
        }
    }

    /**
     * Vector Search for memories
     */
    async searchMemories(queryText, userId, limit = 5) {
        try {
            // Note: We still need an embedding generator. 
            // For now, if we don't have embeddings, we'll do a simple text search 
            // or rely on the same embedding flow in controllers.
            // If we are calling this directly, we might need a separate service for embeddings.

            return this.listRecords(userId, 'memories', limit); // Partial placeholder
        } catch (error) {
            console.error('❌ Supabase search failed:', error.message);
            return [];
        }
    }

    /**
     * Advanced Vector Search using RPC
     */
    async semanticSearch(embedding, userId, limit = 5, threshold = 0.5) {
        try {
            const { data, error } = await this.client.rpc('match_memories', {
                query_embedding: embedding,
                match_threshold: threshold,
                match_count: limit,
                p_user_id: userId
            });

            if (error) throw error;
            return data.map(item => ({
                id: item.id,
                score: item.similarity,
                metadata: item.metadata
            }));
        } catch (error) {
            console.error('❌ Supabase RPC search failed:', error.message);
            return [];
        }
    }
}

export default new SupabaseService();
