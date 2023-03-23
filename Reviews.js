var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;


try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//user schema
var ReviewSchema = new Schema({
    title: {type: String, required: true},
    author: {type: String, required: true},
    review: {type: String, required: true},
    score: {type: Number, required: true}
});

//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);
