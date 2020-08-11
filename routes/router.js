const express = require('express');

const action = require('../controllers/action');

const router = express.Router();

router.post('/room', action.addRoom);
router.get('/room/:id', action.getRoom);
router.post('/addQueue/:id', action.addToQueue);
router.get('/removeQueue/:id', action.removeFromQueue);
router.post('/upVote/:id', action.upVote);
router.post('/downVote/:id', action.downVote);
router.post('/playlist/:id', action.playDefault);
router.get('/deleteRoom/:id',action.deleteRoom);

module.exports = router;
