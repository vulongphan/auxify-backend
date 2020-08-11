const mongoose = require('mongoose');
const { host } = require('../data');
const Schema = mongoose.Schema;

const Room = new Schema(
    {
        id: {type: String, required: true},
        access_token: {type: String, required: true},
        refresh_token: {type: String, required: true},
        queue: {type: [], required: true},
        default_playlist: {},
        createdAt: {type: Date, expires: 3600}
    },
)

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