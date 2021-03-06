var express = require('express');
var router = express.Router();
var bCrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var BleatCollection = require("../models/BleatSchema");

router.use(passport.initialize());
router.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    BleatCollection.findById(id, function (err, user) {
        done(err, user);
    });
});

var isValidPassword = function (user, password) {
    return bCrypt.compareSync(password, user.password);
};

var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

/* Used to get a persons profile picture and background image to send back to react for rendering on the page */
router.post('/profilePictures', function (req, res, next) {
    console.log("GETTIN DA PICUTRES!");
    BleatCollection.findOne({username:req.body.username},(errors,results)=>
    {
        console.log("FOUND YOU");
        if(errors) res.send(errors);
        else{
            console.log("WE HIT THE BIG LEAGUES");
            res.json({ profilePicture:results.profilePicture, backgroundImage:results.backgroundImage})
        }
    })
});

//Strategy for create a new user in a MERN fullstack project
passport.use("register", new LocalStrategy
(
    {passReqToCallback: true},

    (req, username, password, done) => {
        console.log("Entered Strategy");
        BleatCollection.findOne({username: username}, (err, results) => {
            if (err) {
                console.log("error on startup");
                return done(err);
            }
            if (results) {
                console.log("Error: User Already Exists");
                return done(null, false, {message: "Account Exists"});
            } else {
                console.log("Made it Through strategy");

                var newUser = new BleatCollection();

                newUser.username = username;
                newUser.password = createHash(password);
                newUser.profilePicture = req.body.profilePicture;
                newUser.backgroundImage = req.body.backgroundImage;
                /*newUser.item to save = [req.body.item to save];*/

                newUser.save((err) => {
                    if (err) {
                        console.log("Cannot save User");
                        throw err;
                    }
                });

                console.log("New User Made");

                return done(null, newUser);
            }
        })
    }
));
//Runs the strategy to create the new user and send the info to the server to save
router.post("/addUser",
    passport.authenticate("register",
        {
            failureRedirect: "/user/registerfail"
        }),
    (req, res) => {
        console.log("this is the end");
        res.send("Made it through!");
    }
);
//if the register fails in any way send this message back to let them know it failed
router.get("registerfail", (req, res) => {
    res.send("failed to create user in strat");
});

// Stragety for logging in and making sure information is correct
// Local Stragety {copied from past lecture for times sake} for making sure a user exists and the information entered is correct
passport.use(new LocalStrategy(
    // req is the request of the route that called the strategy
    // username and password are passed by passport by default
    // done is the function to end the strategy (callback function).
    function (username, password, done) {
        console.log("Local Strat");
        // find a user in Mongo with provided username. It returns an error if there is an error or the full entry for that user
        BleatCollection.findOne({username: username}, function (err, user) {
            // If there is a MongoDB/Mongoose error, send the error
            if (err) {
                console.log("1");
                return done(err);
            }
            // If there is not a user in the database, it's a failure and send the message below
            if (!user) {
                console.log("2");
                return done(null, false, {message: 'Incorrect username.'});
            }
            // Check to see if the password typed into the form and the user's saved password is the same.
            if (!isValidPassword(user, password)) {
                console.log("3");
                return done(null, false, {message: 'Incorrect password.'});
            }
            console.log("4");
            console.log(user);
            // null is here because there is not an error
            // user is the results of the findOne function
            return done(null, user, {user: user.username});
        });
    }
));
// runs the local strategy to log the person in currently it tries to save the username to the cookie but unsure if it is working
router.post("/login",
    passport.authenticate("local",
        {
            failureRedirect: "/users/faillogin"
        }),
    (req, res) => {
        req.session.username = req.body.username;
        console.log("Cookie Saved?");
        res.send(req.body.username);
    }
);
// if the login route fails for any reason this is sent back to let them know if failed
router.get("/faillogin", (req, res) => {
    res.send("failed to get through login");
});
// used to let a person log out of an account with this route
router.get("/logout",(req,res)=>
{
    console.log("log is set to out");
    req.session.username = null;
    res.send(null)
});

module.exports = router;
