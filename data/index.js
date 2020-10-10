const mongoose = require('mongoose');
const atlas = "mongodb+srv://vulongphan:Arsenal1205@auxifydb.7hwxx.mongodb.net/auxifyDB?retryWrites=true&w=majority";
mongoose
    .connect(atlas, { useNewUrlParser: true })
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db