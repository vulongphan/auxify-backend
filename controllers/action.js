const Room = require('../models/room-model');
var SpotifyWebApi = require('spotify-web-api-node');

/**
 * POST: create a new room and save it in the database
 * req.body contains the essential info of the room, called when someone clicks create a new room
 */
addRoom = (req, res) => {
    const body = req.body;
    if (!body) {
        return res.status(400).json({
            success: false,
            error: 'You must provide a room',
        })
    }

    const room = new Room(body)
    if (!room) return res.status(400).json({ success: false, error: err })

    room
        .save()
        .then(() => {
            return res.status(201).json({
                success: true,
                id: room.id,
                message: 'Room added',
            })
        })
        .catch(error => {
            return res.status(400).json({
                error,
                message: 'Room not found!!',
            })
        })
}

/**
 * GET: fetch the room data
 */
getRoom = async (req, res) => {
    const room_id = req.params.id;
    await Room.findOne({ id: room_id }, (err, room) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }
        if (!room) {
            return res
                .status(404)
                .json({ success: false, error: `Room not found` })
        }
        return res.status(200).json({ success: true, data: room })
    }).catch(err => console.log(err));
}

const swap = (arr, i, j) => {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

/**
 * POST: update the queue of the room
 */
addToQueue = (req, res) => {
    const song = req.body;
    const room_id = req.params.id;

    if (!song) {
        return res.status(400).json({
            success: false,
            error: 'You must provide a song',
        })
    }

    Room.findOne({ id: room_id, queue: { $elemMatch: { name: song.name, artists: song.artists, image: song.image } } }, (err, room) => {
        //matching at least one query for the result to be found
        if (!err && !room) {
            Room.findOne({ id: room_id }, (err, room) => {
                if (!room && !err) return res.status(400).json({ error: "No room found with given id" });
                else if (err) return res.status(404).json({ err });
                else { //if there is a room found with a given id
                    var queue = room.queue;
                    queue.push(song);
                    var i = queue.length - 1;

                    //the new song has 0 vote so push any song with negative votes after the newly added song
                    while (i >= 1 && queue[i - 1].vote < 0) {
                        i--;
                        swap(queue, i, i + 1);
                    }
                    Room.updateOne({ id: room_id }, { queue: queue },
                        (err) => {
                            if (err) return res.status(404).json({ err });
                            else return res.status(200).json({ success: true });
                        });
                }
            })
        } else if (err) {
            res.status(404).json({ err });
        } else {
            return res.status(400).json({ error: "Song already in the queue" });
        }
    })
}

/**
 * GET: remove the next song in the queue as it is ready to be played, and fetch its info
 */
removeFromQueue = (req, res) => {
    const room_id = req.params.id;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            if (room.queue.length > 0) {
                Room.updateOne({ id: room_id }, { $pop: { queue: -1 } },
                    (err) => {
                        if (err) return res.status(404).json({ err });
                        else return res.status(200).json({ success: true, data: room.queue[0] });
                    });
            }
            else {
                res.status(400).json({ err: "Queue is empty" });
            }
        }
    })
}

/**
 * Sort the song queue whenever a song's vote is updated
 * @param {Array} queue: the song queue 
 * @param {number} i: the song index whose vote is going to be updated
 * @param {number} amount: the amount of vote added/deducted  
 */
const sortQueue = (queue, i, amount) => {
    if (amount > 0 && i > 0 && queue[i - 1].vote < queue[i].vote) {
        var j = i - 1;
        while (j > 0 && queue[j - 1].vote < queue[i].vote) j--;
        swap(queue, i, j);
    }
    else if (amount < 0 && i < queue.length - 1 && queue[i + 1].vote > queue[i].vote) {
        var j = i + 1;
        while (j < queue.length - 1 && queue[j + 1].vote > queue[i].vote) j++;
        swap(queue, i, j);
    }
}

/**
 * POST: upvote/downvote
 */
vote = (req, res) => {
    const room_id = req.params.id;
    const index = req.body.index;
    const amount = req.body.amount;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            // i is the index where vote is changed, amount is the number of vote changed
            const queue = room.queue;
            queue[index].vote += amount;
            sortQueue(queue, index, amount);
            Room.updateOne({ id: room_id }, { queue: queue }, (err) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({ success: true });
            })
        }
    })
}

/**
 * POST: update the default playlist of the room
 */
playDefault = (req, res) => {
    const room_id = req.params.id;
    const playlist = req.body.default_playlist;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            Room.updateOne({ id: room_id }, { default_playlist: playlist }, (err) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({ success: true })
            })
        }
        else if (err) return res.status(404).json({ err })
        else return res.status(400).json({ error: "No room found with the given id" })
    })

}

/**
 * GET: delete the room from the database
 */
deleteRoom = (req, res) => {
    const room_id = req.params.id;

    Room.deleteOne({ id: room_id }, (err) => {
        if (err) return res.status(404).json({ err });
        else return res.status(200).json({ success: true })
    })
}

updateToken = (req, res) => {
    const room_id = req.params.id;
    const access_token = req.body.access_token;
    const end_time = req.body.end_time;

    // we have to do findOne first before update the document with updateOne
    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) { // if room exists
            Room.updateOne({ id: room_id }, { access_token: access_token, end_time: end_time }, (err, room) => { // updateOne does not seem to be able to report when no room found
                if (err) return res.status(400).json(err);
                else return res.status(200).json({ success: true });
            })
        }
        else if (!room) return res.status(500).json({ error: "No room found with the given id", room_exists: false});
        else return res.status(404).json({ err });
    })

}

updateHost = async (req, res) => {
    const room_id = req.params.id;
    const host_known = req.body.host_known;

    await Room.updateOne({ id: room_id }, { host_known: host_known }, (err) => {
        if (err) return res.status(400).json(err);
        else return res.status(200).json({ success: true })
    })
}


/**
 * Play a song, called when the previous song finishes playing
 * @param {*} room: object room contains room info
 */
async function play(room, s) {
    var options;
    //play the next song in the queue when the queue is not empty
    if (room.queue.length > 0) {
        options = {
            uris: [room.queue[0].uri],
        };
        await s.play(options)
            .then(async function () {
                console.log("play() from queue returns at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds())
                await Room.updateOne({ id: room.id }, { $pop: { queue: -1 } }) //remove the next song from the queue after being played
            })
            .catch(err => console.log(err));
    }
    //if the queue is empty, play from default playlist;
    else if (room.default_playlist) {
        await s.getPlaylist(room.default_playlist.id)
            .then(async res => {
                const playlist = res.body.tracks.items;
                var position = Math.floor(Math.random() * playlist.length);
                var nextSongURI = playlist[position].track.uri;
                options = {
                    uris: [nextSongURI],
                };
                await s.play(options).then(() => {
                    console.log("play() from playlist returns at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds())
                })
                    .catch(err => console.log(err));
            });
    }
}


/**
 * POST: update getNowPlaying in the database every two seconds 
 */
getNowPlaying = (req, res) => {
    const room_id = req.params.id;

    Room.findOne({ id: room_id }, (err, room) => {
        //if the room is found
        if (!err && room) {
            var s = new SpotifyWebApi();

            s.setAccessToken(room.access_token); // does getNowPlaying() emit a response if the access_token is not valid?

            //get the current playback state of the Spotify app
            s.getMyCurrentPlaybackState({})
                .then(function (data) { //until the Promise returns
                    const body = data.body;
                    if (JSON.stringify(body) !== "{}" && body.item != null) { //if a song has been played on Spotify
                        const nowPlaying = {
                            playing: true,
                            currentPosition: body.progress_ms,
                            name: body.item.name,
                            albumArt: body.item.album.images[0].url,
                            artists: body.item.artists,
                            duration: body.item.duration_ms,
                        }

                        //update the corresponding document/room in the collection with the nowPlaying object
                        Room.updateOne({ id: room_id }, { nowPlaying: nowPlaying })
                            .then(() => {
                                console.log("Update NowPlaying successfully at room_id: " + room_id)
                            })

                        //check if song is about to end, and play next song
                        if (nowPlaying.playing && nowPlaying.currentPosition === 0) {
                            play(room, s).then(() => {
                                return res.status(200).json({ message: "next song is played or Spotify paused", play: true })
                            });
                        }
                        else return res.status(200).json({ message: "in current song" })
                    }
                    else return res.status(200).json({ message: "Please play a song on your Spotify app" })

                }, function (error) { //if there is error in getting the current playback state
                    const nowPlaying = {
                        playing: false,
                        currentPosition: 0,
                        name: null,
                        albumArt: null,
                        artists: null,
                        duration: 0,
                    }
                    Room.updateOne({ id: room_id }, { nowPlaying: nowPlaying }, (err) => {
                        if (err) return res.status(400).json(err);
                        else return res.status(200).json({ success: true, error: error });
                    })
                });
        }
        else if (err) return res.status(404).json({ err });
        else return res.status(500).json({ error: "No room found with the given id", room_exists: false})
    })
}




module.exports = {
    addRoom,
    getRoom,
    addToQueue,
    removeFromQueue,
    vote,
    playDefault,
    deleteRoom,
    updateToken,
    updateHost,
    getNowPlaying,
}
