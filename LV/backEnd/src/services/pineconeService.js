import { getPineconeClient, PINECONE_INDEX_NAME } from '../config/pinecone.js';

class PineconeService {
    constructor() {
        this.indexName = PINECONE_INDEX_NAME;
    }

    /**
     * Upsert a memory into Pinecone using integrated inference
     */
    async upsertMemory(memory) {
        try {
            const client = getPineconeClient();
            if (!client) return;

            const index = client.index(this.indexName);

            // Create a combined text for embedding (using Pinecone Inference)
            const textToEmbed = `${memory.title} ${memory.description || ''} ${memory.category || ''}`;

            // Integrated inference: use upsertRecords with the fieldMap key ('text')
            await index.upsertRecords({
                records: [{
                    id: (memory._id || memory.id).toString(),
                    text: textToEmbed,
                    userId: (memory.userId || 'anonymous').toString(),
                    title: memory.title,
                    description: memory.description || '',
                    category: memory.category || 'other',
                    createdAt: (memory.createdAt || new Date()).toISOString(),
                    ipfsHash: memory.ipfsHash || '',
                    ipfsUrl: memory.ipfsUrl || ''
                }]
            });

            console.log(`✅ Indexed memory ${memory._id || memory.id} in Pinecone using Integrated Inference`);
        } catch (error) {
            console.error('❌ Pinecone upsert failed:', error.message);
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
            const searchResponse = await index.searchRecords({
                query: {
                    inputs: { text: queryText },
                    topK: limit,
                    filter: {
                        userId: { '$eq': userId.toString() }
                    }
                }
            });

            return searchResponse.matches.map(match => ({
                id: match.id,
                score: match.score,
                metadata: match.record // searchRecords returns data in 'record'
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
            await index.deleteOne(memoryId.toString());
            console.log(`✅ Deleted memory ${memoryId} from Pinecone`);
        } catch (error) {
            console.error('❌ Pinecone deletion failed:', error.message);
        }
    }
}

export default new PineconeService();
