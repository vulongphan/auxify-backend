# Manual Installation.
Note: The installation steps assume you are using Window or MacOS.

Follow these steps to run in development mode:
1. Fork this repository and [auxify-frontend](https://github.com/vulongphan/auxify-frontend) into your own GitHub account and clone it to your local computer if you have not already

2. You need to create an `.env` file in the root directory by first copy the content of `.env.example`
```
$ cp .env.example .env` # for MacOS
$ copy .env.example .env` # for Windows
```

3. Create a [MongoDB Atlas](https://www.mongodb.com/) cluster. You need your connection string for Node.js driver (latest version) to use as value of `MONGODB_RS_STRING` in `.env` file. Instruction can be found [here](https://docs.atlas.mongodb.com/getting-started/)

4. Create a [Pusher App](https://pusher.com/). You will need you app credentials for `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET` and `PUSHER_CLUSTER` in `.env` file

5. Create a [Spotify Developer App](https://developer.spotify.com/dashboard/) by logging in using your Spotify Account. Then go to dashboard and click on "Create a new app". Here you can choose to name your own app; however, you must have the correct Redirect URI which is `http://localhost:8888/callback` 

6. Navigate into the project folder and install all its necessary dependencies with npm (recommended)
```
$ cd auxify-backend
$ npm install
```
or with yarn
```
$ cd auxify-backend
$ yarn install
```

7. (This instruction is for MacOS only) If you want to set an expire time for a room (currently in deployment we set a 4 hour expiry for each room), first install MongoDB using homebrew:
```
$ brew install mongodb/brew/mongodb-community-shell
```
Then establish a connection to your cluster through MongoDB shell:
```
$ mongo your_mongodb_shell_connection_string --username your_user_name # then login with your password
$ use auxifyDB
$ db.rooms.ensureIndex( { "createdAt": 1 }, { expireAfterSeconds: 14400 } )
```

8. Open two terminal windows (one for backend and one for frontend) and navigate each to the correct folder.

