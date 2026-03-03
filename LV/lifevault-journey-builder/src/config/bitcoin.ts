export const BITCOIN_TESTNET4 = {
    name: 'testnet4',
    bech32: 'tb',
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef,
    magic: 0x1c163f28,
    port: 48333,
    dnsSeeds: [
        'seed.testnet4.bitcoin.jonasschnelli.ch',
        'seed.t4.petertodd.org',
        'seed.testnet4.wizdom.xyz'
    ],
    faucetUrl: 'https://mempool.space/testnet4/faucet',
    explorerUrl: 'https://mempool.space/testnet4',
    apiBaseUrl: 'https://test.bitpay.com'
};

export const getBitcoinNetwork = () => {
    const env = import.meta.env.VITE_BITCOIN_NETWORK || 'testnet4';
    if (env === 'testnet4') return BITCOIN_TESTNET4;
    // Add other networks if needed
    return BITCOIN_TESTNET4;
};
