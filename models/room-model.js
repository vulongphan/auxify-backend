const mongoose = require('mongoose');
const { host } = require('../data');
const Schema = mongoose.Schema;
const duration = 3600; //the duration for 4 hour long session
const Room = new Schema(
    {
        id: {type: String, required: true},
        access_token: {type: String, required: true},
        refresh_token: {type: String, required: true},
        queue: {type: [], required: true},
        default_playlist: {},
        end_time: {type: Number, required: true},
        createdAt: {type: Date, default: Date.now},
    },
)
//Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình (mongo 127.0.0.1:27017/auxifyDB) trên và sau đó gõ command này 
//db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 10, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé

module.exports = mongoose.model('Room', Room);


/* example valid post body for addRoom:
{
    "id": "ABCD",
    "access_token": "LOL",
    "refresh_token": "LOL",
    "queue": [{
        "name" : "Hello",
        "artists": ["Maroon 5"],
        "image": "lol",
        "vote": 0
    }],
    "uri": "lol"
    "default_playlist": "bro"
}
*/