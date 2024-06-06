
const Redis = require('ioredis')
// Create a Redis client instance
const redis = new Redis({
  readOnly: false,
  host: "65.1.208.63", // Redis server host
  port: 6379,        // Redis server port
  password: '',      // Optional: Redis server password, if set
});

// Handle errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});


 // Close the Redis connection when done
 async function closeRedis(){
    await redis.quit();

} 




   async function setRedis( key , value, ttl){
    try{
       const setData =  await redis.set(key, value);
       await redis.expire(key ,ttl)
       return setData
    }catch(err){
        console.error(err)
    }
    }
 // Get the value associated with a key
    async function getRedis(key){
        try{
            const value = await redis.get(key);
            return value
        }catch(err){
            console.error(err)
        }
    }
 // Delete a key
   async function deleteRedis(key){
       const delDate =  await redis.del(key);
       return delDate
    }
    //Store and retrieve a map.  or set JSON data
    async function hsetRedis(key , value){
        try{
            const hsetData = await redis.hset(key ,value)
            return hsetData
        }catch(err){
            console.error(err)
        }
    }
    //get JSON data
    async function hgetRedis(key){
        try{
            const hgetData=  await redis.hgetall(key)
            return JSON.stringify(hgetData , null , 2)
        }catch(err){
            console.error(err)
        }
    }
   
   
// (async()=>{
//    console.log(await setRedis("key" , "vishal" , 100) , "set")
//    console.log(await getRedis("key") , "get")
// })()


// closeRedis()

module.exports = {
    setRedis , getRedis ,hgetRedis , deleteRedis
}


