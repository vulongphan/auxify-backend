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

module.exports = mongoose.model('Room', Room);
