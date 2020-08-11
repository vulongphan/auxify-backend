const Room = require('../models/room-model');

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
                    Room.updateOne({ id: room_id }, { $push: { queue: song } },
                        (err) => {
                            if (err) return res.status(404).json({ err });
                            else return res.status(200).json({ success: true });
                        });
                }
            })
        } else if (err) {
            res.status(404).json({err});
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

upVote = (req, res) => {
    const room_id = req.params.id;
    const index = req.body.index;

    Room.findOne({ id: room_id }, (err, room) => {
        if (!err && room) {
            const swap = (arr, i, j) => {
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
            const queue = room.queue;
            queue[index].vote += 1;
            if (index > 0 && queue[index].vote > queue[index - 1].vote) {
                swap(queue, index, index - 1);
            }
            Room.updateOne({ id: room_id }, { queue: queue }, (err) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({ success: true });
            })
        }
    })
}

downVote = (req, res) => {
    const room_id = req.params.id;
    const index = req.body.index;

    Room.findOne({id: room_id}, (err, room) => {
        if (!err && room){
            const swap = (arr, i, j) => {
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
            const queue = room.queue;
            queue[index].vote -= 1;
            if (index < queue.length - 1 && queue[index].vote < queue[index + 1].vote){
                swap(queue, index, index + 1);
            }
            Room.updateOne({id: room_id}, {queue: queue}, (err) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({success: true});
            })
        }
    })
}

playDefault = (req, res) => {
    const room_id = req.params.id;
    const playlist = req.body.default_playlist;

    Room.findOne({id: room_id}, (err, room) => {
        if (!err && room) {
            Room.updateOne({id: room_id}, {default_playlist: playlist }, (err, room) => {
                if (err) return res.status(400).json(err);
                else return res.status(200).json({success: true})
            })
        }
        else if (err) return res.status(404).json({ err })
        else return res.status(400).json ({ error: "No room found with the given id"})
    })

}

deleteRoom = (req, res) => {
    const room_id = req.params.id;

    Room.findOne({id: room_id}, (err, room) => {
        if (!err && room) {
            Room.deleteOne({id: room_id}, (err) => {
                if (err) return res.status(404).json({err});
                else return res.status(200).json({success: true})
            })
        }
        else if (err) return res.status(404).json({err});
        else return res.status(400).json({error: "No room found with the given id"})

    })
}

/*
pickEndtime = (req, res) => {
    const end_time = req.body.end_time;
    const room_id = req.params.id;

    Room.findOne({id: room_id}, (err, room) => {
        if (!err && room) {
            Room.updateOne({id: room_id}, {end_time: end_time}, (err) => {
                if (err) return res.status(400).json({err});
                else return res.status(200).json({success: true})
            })
        }
        else if (err) return res.status(404).json({err})
        else return res.status(400).json({error: "No room found with the given id"})
    })
}
*/

module.exports = {
    addRoom,
    getRoom,
    addToQueue,
    removeFromQueue,
    upVote,
    downVote,
    playDefault,
    deleteRoom,
    //pickEndtime
}
