const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT;
const client = redis.createClient(REDIS_PORT);

client.on("error", function(err) {
  console.log("Error " + err);
})

module.exports = client