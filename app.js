//include all neccessary modules
var express = require('express');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var { port, server_url, client_url, spotify_id, spotify_secret, pusher_appId, pusher_key, pusher_secret, pusher_cluster } = require('./config');
var db = require('./data/index.js');
var auxifyRouter = require('./routes/router');
const Room = require('./models/room-model');

const mongo = require('mongodb');
const Pusher = require('pusher');

const redirect_url = server_url + '/callback';
const duration = 3600 * 1000; // the duration after which access_token expires


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/**
 * 
 * @param {*} options 
 */
var doRequest = function (options) {
  return new Promise(function (resolve, reject) {
    request.post(options, function (error, response) {
      if (!error) {
        resolve(response);
      }
      else reject(error)
    });
  });
}


/**
 * a recursive function to update what is currently being played for a room
 * @param {number} count: the time after which getNowPlayingHelper() is called again (recursively) if the room still exists 
 * @param {*} room_id: room_id of the room to post
 */
var getNowPlayingHelper = function (count, room_id) {
  // setTimeout calls getNowPlaying again after count seconds
  let nowPlayingOptions = {
    url: server_url + '/api/nowPlaying/' + room_id,
    headers: { 'Content-Type': 'application/json' },
    json: true,
  }
  setTimeout(function () {
    console.log("--------------------------------------------------");
    doRequest(nowPlayingOptions).then(res => { //wait for the Promise in doRequest() to be resolved, which means getNowPlaying has returned
      if (res.statusCode === 500) { // if the room no longer exists
        console.log("getNowPlaying at backend stops at room_id: ", room_id);
      }
      else { //call itself again only if the room still exists, stops when the room no longer exists
        // console.log(res.body);
        if (res.body.play) count = 3000; //if the current songs finishes, then wait for 3 secs until the next getNowPlaying call
        else count = 2000;
        console.log("getNowPlaying() at backend is called at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds() + " at room_id: " + room_id);
        console.log("--------------------------------------------------" + "\n" + "\n" + "\n");
        getNowPlayingHelper(count, room_id);
      }
    })
      .catch((error) => {
        console.log(error);
        getNowPlayingHelper(count, room_id);
      })
  }, count)
}


/**
 * a recursive function to check for new rooms in the database and call getNowPlayingHelper() on the respective room
 * @param {Array} prev_room_ids: an array of room ids in the database from the previous call
 * @param {number} count: the time after which getNowPlayingHelper() is called again
*/

var getNowPlaying = function (prev_room_ids, count) {
  Room.find().then(rooms => {
    let cur_room_ids = new Set();
    let new_room_ids = new Set();
    for (i = 0; i < rooms.length; i++) {
      let room_id = rooms[i].id;
      if (!prev_room_ids.has(room_id)) new_room_ids.add(room_id);
      cur_room_ids.add(room_id);
    }
    for (let room_id of new_room_ids) {
      // console.log("New room_id: ", room_id);
      getNowPlayingHelper(2000, room_id);
    }
    setTimeout(function () {
      getNowPlaying(cur_room_ids, count);
    }, count)
  })
    .catch(err => {
      console.log(err);
      setTimeout(function () {
        getNowPlaying(prev_room_ids, count);
      }, count)
    });
}

/**
 * a function to check access_token for all the rooms in database in each call 
 * @param {*} count: the time after which the function gets called again
 */

var updateAccessToken = async function () {
  Room.find().then(rooms => {
    for (i = 0; i < rooms.length; i++) {
      console.log("Calling updateAccessToken for room_id at: ", rooms[i].id);
      let end_time = rooms[i].end_time;
      if (Date.now() >= end_time) {
        let room_id = rooms[i].id;
        let refresh_token = rooms[i].refresh_token;
        let authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          headers: { 'Authorization': 'Basic ' + (Buffer.from(spotify_id + ':' + spotify_secret).toString('base64')) },
          form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
          },
          json: true
        };
        doRequest(authOptions).then(res => {
          let access_token = res.body.access_token;
          console.log("New access_token for room_id: ", room_id, access_token);
          let tokenOptions = {
            url: server_url + '/api/updateToken/' + room_id,
            body: {
              access_token: access_token,
              end_time: Date.now() + duration
            },
            headers: { 'Content-Type': 'application/json' },
            json: true,
          }
          doRequest(tokenOptions).then(res => {
            // console.log("statusCode from /updateToken: ", res.statusCode);
            if (res.statusCode === 200) {
              console.log("UpdateToken successfully at room_id: ", room_id);
            }
            else {
              console.log(res.body.error);
            }
          })
        })
      }
    }
  })
    .catch(err => console.log(err))
}

var stateKey = 'spotify_auth_state';
var app = express();

const pusher = new Pusher({
  appId: pusher_appId,
  key: pusher_key,
  secret: pusher_secret,
  cluster: pusher_cluster,
  encrypted: true,
});

/**
 * The function listens for changes in database then pushes the changes to Pusher App through the channel that corresponds to the room_id
 */
db.once('open', () => {
  app.listen(port, () => {
    console.log('Node server running on port ', port);
  });

  let roomCollection = db.collection('rooms');
  let changeStream = roomCollection.watch();

  changeStream.on('change', (change) => {
    if (change.operationType === 'update') {
      let id = change.documentKey._id;
      Room.findOne({ '_id': new mongo.ObjectID(id) }, async (err, room) => {
        if (!err && room) {
          let room_id = room.id;
          let channel = 'room' + room_id;
          if (change.updateDescription.updatedFields.nowPlaying !== undefined) {
            pusher.trigger(channel, 'updateNowPlaying', { nowPlaying: room.nowPlaying })
              // .then(res => { console.log(res) })
              .catch(error => console.log(error));
          }
          else if (change.updateDescription.updatedFields.queue !== undefined) {
            pusher.trigger(channel, 'updateQueue', { queue: room.queue })
              // .then(res => { console.log(res) })
              .catch(error => console.log(error));
          }
          else if (change.updateDescription.updatedFields.default_playlist !== undefined) {
            pusher.trigger(channel, 'updateDefaultPlaylist', { default_playlist: room.default_playlist })
              // .then(res => { console.log(res) })
              .catch(error => console.log(error));
          }
        }
        else if (!room) console.log("No room found in database");
        else console.log(err);
      })
    }
  });
});

app.use(cors({ origin: true, credentials: true }))
  .use(cookieParser())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())

app.get('/login', function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state streaming';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotify_id,
      scope: scope,
      redirect_uri: redirect_url,
      state: state
    }));
});

app.get('/callback', function (req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_url,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(spotify_id + ':' + spotify_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        const room_id = generateRandomString(4);

        const auxifyOptions = {
          url: server_url + '/api/room',
          body: {
            id: room_id,
            access_token: access_token,
            refresh_token: refresh_token,
            queue: [],
            default_playlist: "",
            end_time: Date.now() + duration,
          },
          headers: { 'Content-Type': 'application/json' },
          json: true,
        }

        request.post(auxifyOptions, function (err, res) {
          console.log("Sending request to create a new Room...")
          if (error) console.log(err);
          else console.log(res.body);
        })

        // we can also pass the token to the browser to make requests from there
        res.redirect(client_url + '/room#' +
          querystring.stringify({
            room_id: room_id,
          }));

      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

setInterval(updateAccessToken, 2000); // call updateAccessToken non-recursively every 2 secs

getNowPlaying(new Set(), 2000); // call getNowPlaying recursively every 2 secs 

app.use('/api', auxifyRouter);







