import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

let pinecone = null;

export const connectPinecone = async () => {
    try {
        if (!process.env.PINECONE_API_KEY) {
            console.warn('⚠️ PINECONE_API_KEY not configured. Pinecone service will be disabled.');
            return null;
        }

        if (!pinecone) {
            pinecone = new Pinecone({
                apiKey: process.env.PINECONE_API_KEY,
            });
            console.log('✅ Pinecone initialized');
        }

        return pinecone;
    } catch (error) {
        console.error('❌ Pinecone initialization failed:', error.message);
        return null;
    }
};

export const getPineconeClient = () => {
    if (!pinecone && process.env.PINECONE_API_KEY) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
    }
    return pinecone;
};

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'lifevault-memories';
export const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || 'memories';
