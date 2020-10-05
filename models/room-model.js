const mongoose = require('mongoose');
const { host } = require('../data');
const Schema = mongoose.Schema;

const nowPlaying = new Schema(
    {
        playing: { type: Boolean },
        currentPosition: { type: Number },
        name: { type: String },
        albumArt: {},
        artists: { type: [] },
        duration: { type: Number }
    },
)

const Room = new Schema(
    {
        id: { type: String, required: true },
        access_token: { type: String, required: true },
        refresh_token: { type: String, required: true },
        queue: { type: [], required: true },
        default_playlist: {},
        nowPlaying: {
            type: nowPlaying, default: {
                playing: false,
                currentPosition: 0,
                name: null,
                albumArt: null,
                artists: null,
                duration: 0,
            }
        },
        count: { type: Number },
        //add a new attribute in order to determine the host at front end
        host_known: {type: Boolean, required: true, default: true},
        createdAt: { type: Date, default: Date.now},
        end_time: {type: Number, required: true}
    },
)
//Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình (mongo 127.0.0.1:27017/auxifyDB) trên và sau đó gõ command này 
//db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 10, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé
//to view all the indexes of a collection, run db.rooms.getIndexes()
//to delete all documents, run db.rooms.remove({})
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