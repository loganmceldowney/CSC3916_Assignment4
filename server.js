

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Review = require('./Reviews');
var Movie = require('./Movies');
var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

// movie routes
router.route('/movies')
    // saving a movie
    .post(authJwtController.isAuthenticated, function (req, res) {
        //console.log(req.body);
        if (!req.body.title || !req.body.year || !req.body.genre || !req.body.actors || req.body.actors < 3) {
            res.json({success: false, message: "An input should contain: Title, year released, Genre, and 3 Actors"});
        } else {
            
            var movie = new Movie();

            movie.title = req.body.title;
            movie.year = req.body.year;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;
            movie.imageURL = req.body.imageURL;

            movie.save(function(err){
                
            if (err) {
                return res.json(err);
                }
            res.json({success: true, msg: 'Movie was saved successfuly.'});
            })
            
        }
    })

    // updating a movie
    .put(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title){
            res.json({success:false, message: "Title is required."});
        }else{      // data provided
            if (req.body.newTitle){    
                Movie.findOneAndUpdate(req.body.title, req.body.newTitle, function(err, movie) {
                    if(err){
                        res.status(403).json({success:false, message: "Error: Could not make a change."});
                    }else{
                        res.status(200).json({success: true, message: "Title has been updated successfully"});
                    }
                });
            }
            if (req.body.newYear){    
                Movie.findOneAndUpdate(req.body.year, req.body.newYear, function(err, movie) {
                    if(err){
                        res.status(403).json({success:false, message: "Error: Could not make a change."});
                    }else{
                        res.status(200).json({success: true, message: "Released year has been updated successfully"});
                    }
                });
            }
            if (req.body.newGenre){    
                Movie.findOneAndUpdate(req.body.genre, req.body.newGenre, function(err, movie) {
                    if(err){
                        res.status(403).json({success:false, message: "Error: Could not make a change."});
                    }else{
                        res.status(200).json({success: true, message: "Genre has been updated successfully"});
                    }
                });
            }
        }
    })

    // deleting a movie
    .delete(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title){
            res.json({success:false, message: "Please provide a title to delete"});
        }else{
            Movie.findOneAndDelete(req.body.title, function(err, movie) {
                if(err){
                    res.status(403).json({success:false, message: "Error: Could not delete this movie"});
                }else if(!movie){
                    res.status(403).json({success: false, message: "Error: No movie matches this movie, does not exist."});
                }else {
                    res.status(200).json({success: true, message: "Movie was deleted successfuly"});
                }
             })
         }

    })

    // getting a movie
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (req.query && req.query.reviews && req.query.reviews === "true") {
            Movie.findOne({title: req.params.title}, function (err, movies) {
                if (err)  throw err;
                else {
                    Movie.aggregate()
                        .lookup({from: 'reviews', localField: 'title', foreignField: 'title', as: 'reviews'})
                        .addFields({avgRating: {$avg: "$reviews.rating"}})
                        .exec(function (err, movies) {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                res.json(movies);
                            }
                        })
                }
            })
        }
    });

// reviews routes
router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        if (!req.body.title || !req.body.author || !req.body.review || !req.body.score) {
            res.json({success: false, message: "An input should contian: title, name of the reviewer, review, and a score"});
        } else {
             Movie.findOne({ title: req.body.title }, (err, movie) => {
                if (err) {
                    return res.status(403).json({ success: false, message: "Error adding a review" });
                } else {
                    if (!movie) {
                        return res.status(403).json({ success: false, message: "movie title not found." });
                    } else {
                        var review = new Review();
                        review.title = req.body.title;
                        review.author = req.body.author;
                        review.review = req.body.review;
                        review.score = req.body.score;
                        review.save(function(err){
                            if (err) {
                                return res.json(err);
                            }
                            res.json({success: true, msg: 'Review was saved successfuly.'});
                        })
                    }
                }
            });
        }
    })
    .get(authJwtController.isAuthenticated, function (req, res) {
        Review.find({}, function(err, reviews) {
                res.json({Review: reviews});
        })
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


