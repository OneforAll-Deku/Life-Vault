// services/blockchainApi.ts
// API service for blockchain operations

import api from './api';

export interface GenerateTxResponse {
  success: boolean;
  data: {
    payload: {
      type: string;
      function: string;
      type_arguments: string[];
      arguments: string[];
    };
    moduleAddress: string;
    moduleName: string;
    ipfsHash: string;
  };
}

export interface ConfirmTxResponse {
  success: boolean;
  message: string;
  data: {
    txHash: string;
    txVersion: number;
    explorerUrl: string;
    verified: boolean;
  };
}

export interface VerifyTxResponse {
  success: boolean;
  data: {
    txHash: string;
    verified: boolean;
    timestamp: string;
    version: number;
    explorerUrl: string;
  };
}

/**
 * Generate transaction payload for wallet to sign
 */
export const generateTransaction = async (ipfsHash: string): Promise<GenerateTxResponse> => {
  const response = await api.post('/blockchain/generate-tx', { ipfsHash });
  return response.data;
};

/**
 * Confirm blockchain transaction after wallet signing
 */
export const confirmTransaction = async (
  txHash: string,
  memoryId: string,
  ipfsHash: string
): Promise<ConfirmTxResponse> => {
  const response = await api.post('/blockchain/confirm-tx', {
    txHash,
    memoryId,
    ipfsHash
  });
  return response.data;
};

/**
 * Verify a transaction on blockchain
 */
export const verifyTransaction = async (txHash: string): Promise<VerifyTxResponse> => {
  const response = await api.get(`/blockchain/verify/${txHash}`);
  return response.data;
};

export default {
  generateTransaction,
  confirmTransaction,
  verifyTransaction
};