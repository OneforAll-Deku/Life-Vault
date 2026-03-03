
import { spawn } from 'child_process';

const apiKey = 'sk-user-NX5rUaUjkNqxW4vIatY9yG0N78E1g-r-3nLRzsBk8859bFgtUSz4'; // Truncated in thought, but I'll use the one from config
const proc = spawn('npx', ['-y', '@testsprite/testsprite-mcp@latest', 'server'], {
    env: { ...process.env, API_KEY: apiKey },
    stdio: ['pipe', 'pipe', 'pipe']
});

proc.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

proc.stderr.on('data', (data) => {
    console.error(`STDERR: ${data}`);
});

setTimeout(() => {
    console.log('Terminating test...');
    proc.kill();
}, 5000);
