/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var PORT = process.env.PORT || 8888;
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const db = require('./data/index.js');
const auxifyRouter = require('./routes/router');

var client_id = '98c53852256e4816afb8a2c86d95e913'; // Long's client id
var client_secret = 'd3cd3fae251f4eceb4751c6cd82c984d'; // Long's client secret
var server_uri = 'http://auxify-backend.herokuapp.com';
var redirect_uri = server_uri + '/callback/'; // Redirect uri
var client_uri = 'http://auxify.herokuapp.com';



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

var access_token = null;
var refresh_token = null;
var room_id = null;
var current_time = null;
var duration = 3600; //an hour in sec

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(express.static(__dirname + '/public'))
  .use(cors({origin: true, credentials: true}))
  .use(cookieParser())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())

app.get('/login', function (req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
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
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          console.log(body);
        });

        room_id = generateRandomString(4);

        var auxifyOptions = {
          url: server_uri + '/api/room',
          body: {
            id: room_id,
            access_token: access_token,
            refresh_token: refresh_token,
            queue: [],
            default_playlist: "",
            createdAt: Date.now()/1000
          },
          headers: {'Content-Type' : 'application/json'},
          json: true,
        }


        request.post(auxifyOptions, function (err, res) {
          if (error) console.log(err);
          else console.log(res.body);
        })

        // we can also pass the token to the browser to make requests from there
        res.redirect(client_uri + '/room#' +
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

app.get('/refresh_token', function (req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.use('/api', auxifyRouter);

//console.log('Listening on 8888');
app.listen(PORT);
