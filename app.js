var PORT = process.env.PORT || 8888;

//include all neccessary modules
var express = require('express'); 
var request = require('request'); 
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const {port, server_url, client_url, spotify_id, spotify_secret} = require('./config');
const redirect_url = server_url + '/callback'; 

const db = require('./data/index.js');
const auxifyRouter = require('./routes/router');

// var client_id = '98c53852256e4816afb8a2c86d95e913'; // Long's client id
// var client_secret = 'd3cd3fae251f4eceb4751c6cd82c984d'; // Long's client secret
// var server_uri = 'https://auxify-backend.herokuapp.com';
// var redirect_uri = server_uri + '/callback'; // Redirect uri
// var client_uri = 'https://auxify.herokuapp.com';

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

var stateKey = 'spotify_auth_state';
var app = express();
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


app.use(express.static(__dirname + '/public'))
  .use(cors({ origin: true, credentials: true }))
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

        var access_token = body.access_token;
        var refresh_token = body.refresh_token;
        var duration = 3600 * 1000; //the duration in which the access_token will expire (in mili sec)

        var room_id = generateRandomString(4);
        var auxifyOptions = {
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
        const count = 2000;
        var intervalOptions = {
          url: server_url + '/api/nowPlaying/' + room_id,
          headers: { 'Content-Type': 'application/json' },
          json: true,
        }

        function doRequest(options) {
          return new Promise(function (resolve, reject) { 
            request.post(options, function (error, response, body) {
              if (!error) {
                resolve(response);
              }
              else reject(error)
            });
          });
        }

        function getNowPlaying(count) {
          setTimeout(function () {
            // var start_time = new Date().getTime();
            console.log("--------------------------------------------------");
            doRequest(intervalOptions).then(res => { //wait for the Promise in doRequest() to be resolved, which means getNowPlaying has returned
              // var elapsed_time = new Date().getTime() - start_time;
              if (res.body.is_room === false) { // if the room no longer exists
                console.log("getNowPlaying at backend stops");
              }
              else{ //call itself again only if the room still exists, regardless of other errors
                console.log(res.body);
                if (res.body.play === true) count = 3000; //if the current songs finishes, then wait for 3 secs until the next getNowPlaying call
                else count = 2000;
                console.log("getNowPlaying() at backend is called at: " + new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds());
                console.log("--------------------------------------------------" + "\n" + "\n" + "\n");
                getNowPlaying(count)
              }
              
            })
              .catch((error) => console.log(error))
          }, count)
        }

        getNowPlaying(count); //call this function recursively

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
