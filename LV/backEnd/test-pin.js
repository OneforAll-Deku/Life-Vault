import ipfsService from './src/services/ipfsService.js';
import fs from 'fs';
import path from 'path';

const testPinData = async () => {
    console.log('🧪 Testing real IPFS Pinning...');
    try {
        const result = await ipfsService.pinJSON({ test: "Hello Block Pix", timestamp: Date.now() }, { name: "Test Pin" });
        console.log('✅ Pin successful!');
        console.log('Hash:', result.ipfsHash);
        console.log('URL:', result.gatewayUrl);
    } catch (error) {
        console.error('❌ Pin failed:', error.message);
    }
};

testPinData();
