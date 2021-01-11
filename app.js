var PORT = process.env.PORT || 8888;

//include all neccessary modules
var express = require('express'); 
var request = require('request'); 
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var {port, server_url, client_url, spotify_id, spotify_secret} = require('./config');
var db = require('./data/index.js');
var auxifyRouter = require('./routes/router');

const redirect_url = server_url + '/callback'; 

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
    request.post(options, function (error, response, body) {
      if (!error) {
        resolve(response);
      }
      else reject(error)
    });
  });
}

/**
 * a recursive function to update what is currently being played
 * @param {number} count: the time after which getNowPlaying is called again (recursively) if the room still exists 
 * @param {*} options: options to post
 */
var getNowPlaying = function (count, options) {
  // setTimeout calls getNowPlaying again after count seconds
  setTimeout(function () {
    console.log("--------------------------------------------------");
    doRequest(options).then(res => { //wait for the Promise in doRequest() to be resolved, which means getNowPlaying has returned
      if (res.statusCode === 500) { // if the room no longer exists
        console.log("getNowPlaying at backend stops");
      }
      else{ //call itself again only if the room still exists, stops when the room no longer exists
        console.log(res.body);
        if (res.body.play) count = 3000; //if the current songs finishes, then wait for 3 secs until the next getNowPlaying call
        else count = 2000;
        console.log("getNowPlaying() at backend is called at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds());
        console.log("--------------------------------------------------" + "\n" + "\n" + "\n");
        getNowPlaying(count, options)
      }
    })
      .catch((error) => console.log(error))
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
        const duration = 3600 * 1000; //the duration in which the access_token will expire (in mili sec)

        const room_id = generateRandomString(4);
        const count = 2000; //the timeout before function getNowPlaying is being called again

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

        //set up interval for getNowPlaying
        var intervalOptions = {
          url: server_url + '/api/nowPlaying/' + room_id,
          headers: { 'Content-Type': 'application/json' },
          json: true,
        }

        getNowPlaying(count, intervalOptions); //call this function recursively

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

app.use('/api', auxifyRouter);

app.listen(port);
