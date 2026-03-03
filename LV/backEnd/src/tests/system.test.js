import request from 'supertest';

const BASE_URL = 'http://localhost:5000';

describe('Health Check Endpoint', () => {
    it('should return 200 and healthy status', async () => {
        const res = await request(BASE_URL).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('should return 200 and API info for root', async () => {
        const res = await request(BASE_URL).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', '🔐 Block Pix API is running on Aptos & Bitcoin!');
    });
});

