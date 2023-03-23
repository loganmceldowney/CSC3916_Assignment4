var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var ReviewSchema = new Schema({
    ReviewerName: {
        type: String,
        required: true,
        trim: true
    },
    Quote: {
        type: String,
        required: true,
        trim: true
    },
    Rating: {
        type: Number,
        required: true,
        trim: true
    },
    MovieName: {
        type: String,
        required: true,
        trim: true
    }
});


module.exports = mongoose.model('Review', ReviewSchema);
