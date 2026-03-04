import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const indexName = 'lifevault-memories';

async function createIndex() {
    console.log(`Checking if index '${indexName}' exists...`);
    try {
        const existingIndexes = await pc.listIndexes();
        const indexList = existingIndexes.indexes || [];

        const indexExists = indexList.some(i => i.name === indexName);

        if (indexExists) {
            console.log(`✅ Index '${indexName}' already exists.`);
            return;
        }

        console.log(`Creating index '${indexName}'...`);
        // We use integrated inference since code expects 'searchRecords' and 'upsertRecords'
        await pc.createIndex({
            name: indexName,
            dimension: 384, // Standard for bge-small-en-v1.5
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });

        console.log(`✅ Index '${indexName}' creation initiated successfully.`);
    } catch (error) {
        console.error('❌ Failed to create index:', error);
    }
}

createIndex();
