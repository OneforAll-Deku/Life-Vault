
async function test() {
    const payload = {
        address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        publicKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        signature: '0x' + '0'.repeat(128),
        message: 'Test message',
        nonce: '12345',
        fullMessage: 'Test message'
    };

    console.log('Testing /api/auth/wallet...');
    try {
        const res = await fetch('http://localhost:5000/api/auth/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
