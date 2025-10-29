// Filename - App.js

const express = require("express"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    passportLocalMongoose =
        require("passport-local-mongoose");
const User = require("./model/User");
let app = express();
app.use(express.static("public"));


mongoose.connect("mongodb+srv://user0:1@cluster0.k1nidqh.mongodb.net/");
// mongodb+srv://user0:EdOzq96aLvip7zQz@cluster0.muf5gu3.mongodb.net/

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MongoStore = require('connect-mongo');
app.use(require("express-session")({
  secret: "Rusty is a dog",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb+srv://user0:1@cluster0.k1nidqh.mongodb.net/",
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }

}));


app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




// Showing home page
app.get("/", function (req, res) {
    res.render("home");
});

// Showing register form
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/forgot-password", function (req, res) {
    res.render("forgot-password");
});

//isLoggedIn
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

app.get("/verify-security", function (req, res) {
    res.render("verify-security");
});
app.get("/changePass", function (req, res) {
    res.render("changePass");
});


// Handling user signup
app.post("/register", async (req, res) => {
    try {

        //password is handled by passport-local-mongoose
        const user = new User({
            username: req.body.username,
            name: req.body.name,
            securityQuestion: req.body.security_question,
            securityAnswer: req.body.security_answer
        });
        await User.register(user, req.body.password);

        res.redirect("/login?registered=success");
    } catch (err) {
        res.redirect("/register?registered=failed");
    }
});

app.post("/forgot-password", async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        return res.redirect("/forgot-password?error=user_not_found");
    }

    res.render("verify-security", { username, securityQuestion: user.securityQuestion });
});

app.post("/verify-answer", async (req, res) => {
    const { username, security_answer } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
        return res.render("forgot-password");
    }

    if (user.securityAnswer !== security_answer) {
        return res.render("verify-security", {
            username,
            securityQuestion: user.securityQuestion,
            error: "Incorrect answer. Try again!"
        });
    }

    res.render("reset-password", { username });
});

app.post("/reset-password", async (req, res) => {
    try {
        const { username, new_password } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.send("User not found");

        await user.setPassword(new_password);
        await user.save();

        res.redirect("/login?message=resetSuccess");
    } catch (err) {
        console.error(err);
        res.send("Error updating password");
    }
});


// Showing login form
app.get("/login", function (req, res) {
    res.render("login");
});




//examine isLoggedIn
app.get("/loginPage", isLoggedIn, async function (req, res) {
    try {
        const user = await User.findById(req.user._id);
        // const user = await User.findOne(req.user.username);
        res.render("secret", { User: user });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Something went wrong" });
    }
});

// app.post("/login", passport.authenticate("local", {     //figure out why not woring

app.post("/loginPage", passport.authenticate("local", {
    successRedirect: "/loginPage",
    failureRedirect: "/login?error=invalid"
}));


app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

//try not logging in
app.put("/updateName", isLoggedIn, async (req, res) => {
    try {
        const { id, name } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { username: name },
            { new: true } // returns updated document
        );
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Re-login the user to refresh session data
        req.login(updatedUser, (err) => {
            if (err) {
                console.error("Error re-logging user:", err);
                return res.status(500).json({ success: false, message: "Re-login failed" });
            }
            res.json({ success: true, user: updatedUser });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not update username" });
    }
});

app.put("/updateProfileName", isLoggedIn, async (req, res) => {
    try {
        const { id, name } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name: name },
            { new: true } // returns updated document
        );
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // Re-login the user to refresh session data
        req.login(updatedUser, (err) => {
            if (err) {
                console.error("Error re-logging user:", err);
                return res.status(500).json({ success: false, message: "Re-login failed" });
            }
            res.json({ success: true, user: updatedUser });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Could not update username" });
    }
});


    app.get("/security/:id", async (req, res) => {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send("User not found");
        res.render("security", { user });
    }); 

    app.post("/changePassword", async (req, res) => {

        oldPassword = req.body.old_password;
        newPassword = req.body.new_password;
        const user = await User.findById(req.body.user_id);
        user.changePassword(oldPassword, newPassword, (err) => {
            if (err) {
                if (err.name === 'IncorrectPasswordError') {
                    return res.status(400).send('Incorrect old password.');
                } else {
                    console.error(err);
                    return res.status(500).send('Something went wrong.');
                }
            }
            res.redirect("/login?registered=success");
            
        })
    });



let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("Server Has Started!");
});