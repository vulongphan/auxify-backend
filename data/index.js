const mongoose = require('mongoose');

mongoose
    .connect('mongodb://3.128.218.1:27017/auxifyDB', { useNewUrlParser: true }) //change from local 127.0.0.1 to www 3.128.218.1
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db