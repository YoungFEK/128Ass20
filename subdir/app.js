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


mongoose.connect("mongodb+srv://axong:dbpass123@cluster0.5i0maha.mongodb.net/myDB");
// mongodb+srv://user0:EdOzq96aLvip7zQz@cluster0.muf5gu3.mongodb.net/

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(require("express-session")({
    // study if may time, if wala then delete
    secret: "Rusty is a dog",
    resave: false,
    saveUninitialized: false
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

// Showing secret page
app.get("/secret", isLoggedIn, function (req, res) {
    res.render("secret");
});

// Showing register form
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/forgot-password", function (req, res) {
    res.render("forgot-password");
});

app.get("/verify-security", function (req, res) {
    res.render("verify-security");
});
app.get("/changePass", function (req, res) {
    res.render("changePass");
});


// Handling user signup
app.post("/register", async (req, res) => {
    try {
        await User.create({
            username: req.body.username,
            password: req.body.password,
            securityQuestion: req.body.security_question,
            securityAnswer: req.body.security_answer
        });

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


        user.password = new_password;

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

app.get("/loginPage", function (req, res) {
    res.render("login");
});




// Handling user login
app.post("/loginPage", async function (req, res) {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user) {
            const result = req.body.password === user.password;
            if (result) {
                res.render("secret", {User: user});
            } else {
                res.status(400).json({ error: "password doesn't match" });
            }
        } else {
            res.status(400).json({ error: "User doesn't exist" });
        }
    } catch (error) {
        res.status(400).json({ error });
    }
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/login");
}

let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("Server Has Started!");
});



// ----------------------
//PUT REQUEST for updatign task
app.put("/updateName", async (req, res) => {
  const taskId = req.body.id;
  const newName = req.body.name;

  try {
    await User.findByIdAndUpdate(taskId, { username: newName });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update task" });
  }
});