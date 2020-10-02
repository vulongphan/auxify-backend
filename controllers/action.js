const Room = require('../models/room-model');
var SpotifyWebApi = require('spotify-web-api-node');

addRoom = (req, res) => {
    const body = req.body;
    if (!body) {
        return res.status(400).json({
            success: false,
            error: 'You must provide a room',
        })
    }

    const room = new Room(body)

    if (!room) {
        return res.status(400).json({ success: false, error: err })
    }

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
                    const swap = (arr, i, j) => {
                        const temp = arr[i];
                        arr[i] = arr[j];
                        arr[j] = temp;
                    }
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

//combine upVote and downVote to only one function vote
vote = (req, res) => {
    const room_id = req.params.id;
    const index = req.body.index;
    const amount = req.body.amount;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            // i is the index where vote is changed, amount is the number of vote changed
            const sortQueue = (queue, i, amount) => {
                const swap = (arr, i, j) => {
                    const temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
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

playDefault = (req, res) => {
    const room_id = req.params.id;
    const playlist = req.body.default_playlist;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            Room.updateOne({ id: room_id }, { default_playlist: playlist }, (err, room) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({ success: true })
            })
        }
        else if (err) return res.status(404).json({ err })
        else return res.status(400).json({ error: "No room found with the given id" })
    })

}


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

    Room.updateOne({ id: room_id }, { access_token: access_token, end_time: end_time }, (err) => {
        if (err) return res.status(400).json(err);
        else return res.status(200).json({ success: true })
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

//this function is called every 2 secs
getNowPlaying = (req, res) => {
    //get the room_id from request params
    const room_id = req.params.id;

    //the function finds the document in the collection "rooms" in MongoDB database with the given room id
    Room.findOne({ id: room_id }, (err, room) => {

        //define a function to play the next song 
        async function play(room) {
            var options;
            //play the next song in the queue
            if (room.queue.length > 0) {
                options = {
                    uris: [room.queue[0].uri],
                };
                await s.play(options)
                    .then(async function () {
                        console.log("play() from queue returns at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds())
                        await Room.updateOne({ id: room_id }, { $pop: { queue: -1 } }) //remove the next song from the queue after being played
                    })
                    .catch(err => console.log(err));
            }
            //if queue is empty, play from default playlist;
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

        //if the room is found
        if (!err && room) {
            //initiate a SpotifyWebApi object
            var s = new SpotifyWebApi();

            //pass the access token to the api
            s.setAccessToken(room.access_token);

            //get the current playback state of the Spotify app
            s.getMyCurrentPlaybackState({
            })
                .then(function (data) { //until the Promise returns

                    const body = data.body;
                    if (JSON.stringify(body) !== "{}") { //if no song has been played on Spotify
                        // console.log(body);
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
                                console.log("Update NowPlaying successfully")
                            })

                        //check if song is about to end, and play next song
                        //wait until play() finishes
                        if (nowPlaying.playing && nowPlaying.currentPosition === 0) {
                            play(room).then(() => {
                                return res.status(200).json({ message: "next song is played or Spotify paused", play: true })
                            });
                        }
                        else {
                            return res.status(200).json({ message: "in current song" })
                        }

                    }
                    else {
                        return res.status(200).json({ message: "Please play a song on your Spotify app" })
                    }

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
        else if (err) {
            return res.status(404).json({ err });
        }
        else return res.status(400).json({ error: "No room found with the given id" , is_room: false})
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
