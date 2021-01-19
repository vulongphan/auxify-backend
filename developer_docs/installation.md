# Manual Installation.
Note: The installation steps assume you are using Window or MacOS.

Follow these steps to run in development mode:
1. Fork this repository and [auxify-frontend](https://github.com/vulongphan/auxify-frontend) into your own GitHub account and clone it to your local computer.

2. Install Node.js and MongoDB (if you do not already have them in your system). You can use [nvm](https://github.com/nvm-sh/nvm) for Node.js. Read the instructions on how to install nvm and node.js.
For MongoDB, please check [MongoDB Installation](https://docs.mongodb.com/manual/installation/).

3. Navigate into the project folder and install all its necessary dependencies with npm.

```
$ cd auxify-backend
$ npm install
```
or with yarn
```
$ cd auxify-backend
$ yarn install
```

5. You need to create an `.env` file in the root directory by first copy the content of `.env.example`
`$ cp .env.example .env` for MacOS
`$ copy .env.example .env` for Windows

6. You need to update `.env` with your own Spotify ID and Spotify Secret. Please go to [Spotify for Developers](https://developer.spotify.com/dashboard/) and log in with your account.
Then go to dashboard and click on "Create a new app". Here you can choose to name your own app, however, you must have the correct redirect URIs. 
Your `redirect_uri` is `server_url` + `/callback`.
For example, if you choose to develop locally and your `SERVER_URL` is `http://localhost:8888` in `.env` then your `redirect_uri` is `http://localhost:8888/callback`.
After you have created an app on dashboard, you will get your own spotify-id and secret to fill in `.env`.

7. Start MongoDB service if you have not already. If you install MongoDB with homebrew, you can run the following command with brew
`$ brew services start mongodb-community@4.4`

8. If you want to set an expire time for a room (currently in deployment we set a 4 hour expiry for each room), run:
```
$ mongo
$ use auxifyDB
$ db.rooms.ensureIndex( { "createdAt": 1 }, { expireAfterSeconds: 14400 } )

```

9. Open two terminal windows (one for backend and one for frontend) and navigate each to the correct folder.
