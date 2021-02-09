const dotenv = require('dotenv');
dotenv.config();
module.exports = {
    database_url : process.env.MONGODB_CONNECTION_STRING,
    port : process.env.PORT,
    client_url : process.env.CLIENT_URL,
    server_url : process.env.SERVER_URL,
    spotify_id : process.env.SPOTIFY_ID,
    spotify_secret: process.env.SPOTIFY_SECRET,
    rs_url : process.env.MONGODB_RS_STRING,
    pusher_appId : process.env.PUSHER_APP_ID,
    pusher_key : process.env.PUSHER_KEY,
    pusher_secret : process.env.PUSHER_SECRET,
    pusher_cluster: process.env.PUSHER_CLUSTER
};