const express = require('express');

const action = require('../controllers/action');

const router = express.Router();

router.post('/room', action.addRoom);
router.get('/room/:id', action.getRoom);
router.post('/addQueue/:id', action.addToQueue);
router.get('/removeQueue/:id', action.removeFromQueue);
router.post('/vote/:id', action.vote);
router.post('/playlist/:id', action.playDefault);
router.get('/deleteRoom/:id',action.deleteRoom);
router.post('/updateToken/:id', action.updateToken);
router.post('/nowPlaying/:id', action.getNowPlaying);

module.exports = router;
