

require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var mongoose = require('mongoose')
var Movie = require('./Movies');
var Review = require('./reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

mongoose.Promise = global.Promise;
const uri = process.env.DB;

mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}).
catch(err => console.log(err));

console.log("connected to mongo atlas (users)");

function getJSONObjectForMovie(req) {
    var json = {
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.send({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.send({ success: false, message: 'A user with that username already exists.'});
                else
                    console.log(err);
                    return;
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    console.log(userNew);

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            console.log(err);
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

// GET movies gets all the movies in the database
router.get('/movies', (req, res) => {
    Movie.find({}, function(err, movies) {
        if (err) {
            console.log(err);
            res.send(err);
        }

        var movieMap = {};

        movies.forEach(function(movie) {
            movieMap[movie._id] = movie;
        })

        res.json({success: true, movies: movieMap});
    })
});

// POST movies adds a movie to the database
router.post('/movies', (req, res) => {

    if (!req.body.Title || !req.body.YearReleased || !req.body.Genre || (req.body.Actors < 3)) {
        res.send({success: false, msg: 'Please include a title, year, genre, and at least 3 actors.'})
    }

    const movie = new Movie();

    movie.Title = req.body.Title;
    movie.YearReleased = req.body.YearReleased;
    movie.Genre = req.body.Genre;
    movie.Actors = req.body.Actors;

    movie.save(function(err) {
        if (err) {
            res.send(err);
            console.log(err);
        }

        res.json({success: true, movie: movie});
    })
});

// get a single movie by ID
router.get('/movies/:id', (req,res) => {
    const movie = new Movie();

    Movie.findById(req.params._id, movie, function (err) {
        if (err) {
            res.send(err);
            console.log(err);
        }

        res.json({success: true, movie: movie})
    })
})

router.put('/movies/:id', (req, res) => {

    const movie = new Movie();

    movie.Title = req.body.Title;
    movie.YearReleased = req.body.YearReleased;
    movie.Genre = req.body.Genre;
    movie.Actors = req.body.Actors;

    Movie.findByIdAndUpdate(req.params._id, movie, function (err) {
        if (err) {
            res.send(err);
            console.log(err);
        }

        res.json({success:true, movieupdated: movie});
    });

});

router.delete('/movies/:id', (req, res) => {

    Movie.findByIdAndDelete(req.params._id, function (err) {
        if (err) {
            res.send(err);
            console.log(err);
        }

        res.json({success: true, message: "movie deleted"});
    });

});

// GET movies gets all the movies with their reviews (fetchMovies)
router.get('/moviereviews', (req, res) => {

    // should be a bool
    var togglereviews = req.query.reviews;

    console.log(togglereviews)


    if (togglereviews) {
        //show movies + reviews (join db's using $lookup)
        
        Movie.aggregate([{
            $lookup:
            {
                from: "reviews",
                localField: "Title",
                foreignField: "MovieName",
                as: "Reviews"
            }},
            {$out: "reviews"}
        ]).exec(function (err, res){
                if (err) {
                    res.send(err);
                }
            });


        // show movies, reviews should show as well
        Movie.find({}, function (err, movies) {
            if (err) {
                console.log(err);
                res.send(err);
            }

            var movieMap = {};

            movies.forEach(function (movie) {
                movieMap[movie._id] = movie;
            })

            res.json({
                success: true,
                movies: movieMap
            });
        });
    

    } else {
        // just show movies
        Movie.find({}, function (err, movies) {
            if (err) {
                console.log(err);
                res.send(err);
            }

            var movieMap = {};

            movies.forEach(function (movie) {
                movieMap[movie._id] = movie;
            })

            res.json({
                success: true,
                movies: movieMap
            });
        })
    }


});

// GET movie gets one movie with the review by ID (fetchMovie)
router.get('/moviereviews/:id', (req, res) => {

    // should be a bool
    var togglereviews = req.query.reviews;

    var id = req.params.id;
    console.log(id);

    if (togglereviews) {
        //show movies + reviews (join db's using $lookup)
        
        Movie.aggregate([{
            $lookup:
            {
                from: "reviews",
                localField: "Title",
                foreignField: "MovieName",
                as: "Reviews"
            }},
            {$out: "reviews"}
        ]).exec(function (err, res){
                if (err) {
                    res.send(err);
                }
            });


        // show movies, reviews should show as well
        Movie.findById(id, function (err, movie) {
            if (err) {
                console.log(err);
                res.send(err);
            }

            res.json({
                success: true,
                movie: movie
            });
        });

    }else{
        res.json({
            success: false,
            msg: "set reviews=true in query params"
        });
    }


});


// POST reviews adds a review to the database, given that the movie exists
router.post('/movies/reviews', (req, res) => {

    if (!req.body.ReviewerName || !req.body.Quote || !req.body.Rating || !req.body.MovieName) {
        res.send({
            success: false,
            msg: 'Please include a ReviewerName, quote, rating, and a moviename.'
        })
    }

    const review = new Review();

    review.ReviewerName = req.body.ReviewerName;
    review.Quote = req.body.Quote;
    review.Rating = req.body.Rating;
    review.MovieName = req.body.MovieName;

    // make sure the movie is in the db, if so, save the review for that movie
    Movie.findOne({
        Title: review.MovieName
    }).exec(function (err, mov) {
        if (err) {
            console.log(err);
            res.send(err);
        }

        // make sure mov is not null aka it exists
        if (mov === null) {
            res.json({success: false, msg: "couldn't find movie, check that movie name is correct"})
            return; // throw error, prevent node from continuing on with save, etc.
        }

        // if movie is in database, save review for this movie
        review.save(function (err) {
            if (err) {
                res.send(err);
                console.log(err);
            }

            res.send({
                success: true,
                review: review
            })
        })
    })
});


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


