import { getPineconeClient, PINECONE_INDEX_NAME } from '../config/pinecone.js';

class PineconeService {
    constructor() {
        this.indexName = PINECONE_INDEX_NAME;
    }

    /**
     * Generic upsert for any piece of data
     */
    async upsert(id, data, namespace = 'memories') {
        try {
            const client = getPineconeClient();
            if (!client) return;
            const index = client.index(this.indexName);

            // Construct text for embedding based on data type
            let textToEmbed = '';
            if (data.modelType === 'user') {
                textToEmbed = `${data.name} ${data.email} ${data.bio || ''}`;
            } else if (data.modelType === 'story') {
                textToEmbed = `${data.title} ${data.description || ''} ${data.tags?.join(' ') || ''}`;
            } else {
                textToEmbed = `${data.title || ''} ${data.description || ''} ${data.category || ''}`;
            }

            await index.namespace(namespace).upsertRecords({
                records: [{
                    id: id.toString(),
                    text: textToEmbed,
                    ...data,
                    updatedAt: new Date().toISOString()
                }]
            });
            console.log(`✅ Synced ${id} to Pinecone namespace: ${namespace}`);
        } catch (error) {
            console.error(`❌ Pinecone sync failed for ${id}:`, error.message);
        }
    }

    /**
     * Fetch all records for a user from a namespace
     */
    async listRecords(userId, namespace = 'memories', limit = 100) {
        try {
            const client = getPineconeClient();
            if (!client) return [];
            const index = client.index(this.indexName);

            const response = await index.namespace(namespace).searchRecords({
                query: {
                    inputs: { text: ' ' }, // Empty search to get all
                    topK: limit,
                    filter: {
                        userId: { '$eq': userId.toString() }
                    }
                }
            });

            if (!response || !response.matches) return [];

            return response.matches.map(m => ({
                id: m.id,
                ...(m.record || m.metadata || m)
            }));
        } catch (error) {
            console.error(`❌ Pinecone list failed in ${namespace}:`, error.message);
            return [];
        }
    }

    /**
     * Upsert a memory into Pinecone using integrated inference
     */
    async upsertMemory(memory) {
        return this.upsert(memory._id || memory.id, {
            ...memory,
            userId: memory.userId?.toString(),
            modelType: 'memory'
        }, 'memories');
    }

    /**
     * Upsert a User profile for persistence
     */
    async upsertUser(user) {
        return this.upsert(user._id, {
            email: user.email,
            name: user.name,
            avatar: user.avatar || '',
            bio: user.bio || '',
            aptosAddress: user.aptosAddress || '',
            userType: user.userType || 'user',
            modelType: 'user'
        }, 'users');
    }

    /**
     * Upsert a Story
     */
    async upsertStory(story) {
        return this.upsert(story._id, {
            ...story,
            userId: story.creatorId?.toString(),
            modelType: 'story'
        }, 'stories');
    }

    /**
     * Fetch a record by ID from a specific namespace
     */
    async getRecord(id, namespace = 'memories') {
        try {
            const client = getPineconeClient();
            if (!client) return null;

            const index = client.index(this.indexName);
            // Pinecone fetch returns a Record object
            const result = await index.namespace(namespace).fetch([id.toString()]);

            if (result && result.records && result.records[id.toString()]) {
                const record = result.records[id.toString()];
                return record.metadata || record;
            }
            return null;
        } catch (error) {
            console.error(`❌ Pinecone fetch failed for ${id}:`, error.message);
            return null;
        }
    }

    /**
     * Search for similar memories using integrated inference
     */
    async searchMemories(queryText, userId, limit = 5) {
        try {
            const client = getPineconeClient();
            if (!client) throw new Error('Pinecone client not initialized');

            const index = client.index(this.indexName);

            // Integrated inference: use searchRecords
            const searchResponse = await index.namespace('memories').searchRecords({
                query: {
                    inputs: { text: queryText },
                    topK: limit,
                    filter: {
                        userId: { '$eq': userId.toString() }
                    }
                }
            });

            if (!searchResponse || !searchResponse.matches) {
                return [];
            }

            return searchResponse.matches.map(match => ({
                id: match.id,
                score: match.score,
                metadata: match.record || match.metadata // Handled both searchRecords and query formats
            }));
        } catch (error) {
            console.error('❌ Pinecone search failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete a memory from Pinecone
     */
    async deleteMemory(memoryId) {
        try {
            const client = getPineconeClient();
            if (!client) return;

            const index = client.index(this.indexName);
            await index.namespace(namespace).deleteOne(id.toString());
            console.log(`✅ Deleted ${id} from Pinecone namespace ${namespace}`);
        } catch (error) {
            console.error('❌ Pinecone deletion failed:', error.message);
        }
    }

    /**
     * Find a user by email in Pinecone (Fallback if JSON is wiped)
     */
    async findUserByEmail(email) {
        try {
            const client = getPineconeClient();
            if (!client) return null;

            const index = client.index(this.indexName);
            const searchResponse = await index.namespace('users').searchRecords({
                query: {
                    inputs: { text: email },
                    topK: 1,
                    filter: {
                        email: { '$eq': email }
                    }
                }
            });

            if (searchResponse.matches && searchResponse.matches.length > 0) {
                return searchResponse.matches[0].record;
            }
            return null;
        } catch (error) {
            console.error('❌ Pinecone email search failed:', error.message);
            return null;
        }
    }
}

export default new PineconeService();
