//include all neccessary modules
var express = require('express');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var { port, server_url, client_url, spotify_id, spotify_secret } = require('./config');
var db = require('./data/index.js');
var auxifyRouter = require('./routes/router');
const Room = require('./models/room-model');
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
      .catch((error) => console.log(error))
  }, count)
}


/**
 * a recursive function to check for new rooms in the database and call getNowPlayingHelper() on the respective room
 * @param {Array} prev_room_ids: an array of room ids in the database from the previous call
 * @param {number} count: the time after which getNowPlayingHelper() is called again
*/

var getNowPlaying = async function (prev_room_ids, count) {
  const rooms = await Room.find();
  let cur_room_ids = [];
  let new_room_ids = [];
  for (i = 0; i < rooms.length; i++) {
    let room_id = rooms[i].id;
    if (!prev_room_ids.includes(room_id)) new_room_ids.push(room_id);
    cur_room_ids.push(room_id);
  }
  for (i = 0; i < new_room_ids.length; i++) {
    let room_id = new_room_ids[i];
    // console.log("New room_id: ", room_id);
    getNowPlayingHelper(2000, room_id);
  }
  setTimeout(function () {
    getNowPlaying(cur_room_ids, count);
  }, count)
}

/**
 * a recursive function to check access_token for all the rooms in database in each call 
 * @param {*} count: the time after which the function gets called again
 */

var updateAccessToken = function (count) {
  setTimeout(async function () {
    let rooms = await Room.find();
    for (i = 0; i < rooms.length; i++) {
      console.log("Calling updateAccessToken for room_id at: ", rooms[i].id);
      let end_time = rooms[i].end_time;
      if (Date.now() >= end_time) {
        let room_id = rooms[i].id;
        let refresh_token = rooms[i].refresh_token;
        let authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          headers: { 'Authorization': 'Basic ' + (new Buffer(spotify_id + ':' + spotify_secret).toString('base64')) },
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
    updateAccessToken(count);
  }, count)
}

/**
 * a recursive function to remove songs in queue that are expired
 */

var updateQueue = function (count) {
  setTimeout(async function () {
    let rooms = await Room.find();
    for (i = 0; i < rooms.length; i++) {
      console.log("Calling updateQueue for room_id at: ", rooms[i].id);
      let room_id = rooms[i].id;
      let queue = rooms[i].queue;
      for (j = 0; j < queue.length; j++) {
        let expire_time = queue[j].expire_time;
        if (Date.now() >= expire_time) {
          console.log("song expired");
          queue.splice(j, 1);
          Room.updateOne({ id: room_id }, { queue: queue }, (err) => {
            if (err) console.log(err);
          })
        }
      }
    }
    updateQueue(count);
  }, count)

}

var stateKey = 'spotify_auth_state';
var app = express();
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

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
        'Authorization': 'Basic ' + (new Buffer(spotify_id + ':' + spotify_secret).toString('base64'))
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

getNowPlaying([], 2000); // call getNowPlaying recursively every 2 secs

updateQueue(10000); // call updateQueue recursively every 10 secs

updateAccessToken(2000); //call updateAccessToken recursively every 2 secs

app.use('/api', auxifyRouter);

app.listen(port);






