# Auxify Backend
This is the backend repository for [Auxify](https://auxify.herokuapp.com). We have made this repository open-source and look forward to your contribution! 

Auxify a real-time music queueing web application. Spotify Premium users can create listening rooms which other people (not necessarily Spotify users) can join using the room id. In a listening room, everyone can add songs, upvote, downvote songs (to indicate whether they like the songs or not), and report songs (whether they find the song inappropriate).

The backend is built using NodeJS and Express on top of MongoDB integrated with [Pusher](https://pusher.com/channels) to simulate a real-time database. These are the main functionalities of this repository
* Use [Spotify Web API](https://developer.spotify.com/documentation/web-api/) to authenticate Spotify users using [OAuth 2.0 workflow](https://developer.spotify.com/documentation/general/guides/authorization-guide/) which then obtains user’s credentials such as access tokens and refresh tokens to create a listening room 
* Listen to changes in the database and then notify a Pusher App to tell the frontend when to re-render
* Handle routing: when there is an event that happens on the client-side, the client will make specific API calls to the backend, and based on these endpoints, some specific functions need to be executed.

## Welcome!
We welcome all kinds of contribution, whether it is to [provide feedback](https://docs.google.com/forms/d/1aFsASuhUK-H000eXpJtzCVrgXz_-2NoAMvKeYrIqkao/edit), [contribute to the codebase](https://github.com/vulongphan/auxify-backend/tree/master/developer_docs) or [contribute to the documentation](https://github.com/vulongphan/auxify-backend/tree/master/developer_docs)

## Code of Conduct
Please adhere to [open source standard code of conduct](https://opensource.guide/code-of-conduct/)

## Contribution
To start contributing to the repository as a developer, please navigate to [developer_docs](https://github.com/vulongphan/auxify-backend/tree/master/developer_docs)

## Acknowledgements
Auxify was piloted at [New York University Abu Dhabi](https://nyuad.nyu.edu/) and currently has about 1000 users in which about 200 of them use the app daily