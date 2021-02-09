const mongoose = require('mongoose');
const {database_url, rs_url} = require('../config');
mongoose
    .connect(rs_url, { useNewUrlParser: true })
    .then(console.log("MongoDB connected"))
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db