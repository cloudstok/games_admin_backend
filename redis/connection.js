
const Redis = require('ioredis')

const redis = new Redis({
    readOnly: false,
    host: "65.1.208.63",
    port: 6379,
    password: '',
});


redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

async function setRedis(key, value, ttl) {
    try {
        const setData = await redis.set(key, value);
        await redis.expire(key, ttl)
        return setData
    } catch (err) {
        console.error(err)
    }
}

async function getRedis(key) {
    try {
        const value = await redis.get(key);
        return value
    } catch (err) {
        console.error(err)
    }
}


async function deleteRedis(key) {
    const delDate = await redis.del(key);
    return delDate
}


async function hsetRedis(key, value) {
    try {
        const hsetData = await redis.hset(key, value)
        return hsetData
    } catch (err) {
        console.error(err)
    }
}


async function hgetRedis(key) {
    try {
        const hgetData = await redis.hgetall(key)
        return JSON.stringify(hgetData, null, 2)
    } catch (err) {
        console.error(err)
    }
}



// closeRedis()

module.exports = {
    setRedis, getRedis, hgetRedis, deleteRedis
}


