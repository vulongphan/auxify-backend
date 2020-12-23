const dotenv = require('dotenv');
dotenv.config();
module.exports = {
    database_url : process.env.MONGODB_CONNECTION_STRING,
    port : process.env.PORT,
    client_url : process.env.CLIENT_URL,
    server_url : process.env.SERVER_URL,
    spotify_id : process.env.SPOTIFY_ID,
    spotify_secret: process.env.SPOTIFY_SECRET
};