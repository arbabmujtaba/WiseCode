const { createClient } = require('redis');

const redisClient = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST || 'redis-19934.c212.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: Number(process.env.REDIS_PORT) || 19934
    }
});

module.exports = redisClient;
