// Filename - App.js

const express = require("express"),
mongoose = require("mongoose"),
passport = require("passport"),
LocalStrategy = require("passport-local"),
passportLocalMongoose = require("passport-local-mongoose");
const User = require("./model/User");
const TodoList = require("./model/list");

require("dotenv").config();

let app = express();
app.use(express.static("public"));


mongoose.connect(process.env.MONGO_URI);


app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MongoStore = require('connect-mongo');

app.use(require("express-session")({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }

}));


app.use(passport.initialize());
app.use(passport.session());


passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Add Cache-Control Middleware
app.use((req, res, next) => {
    // Don't cache authenticated pages
    if (req.isAuthenticated()) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else {
        // For public pages, you can still cache
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    next();
});



app.get("/secret", isLoggedIn, async function (req, res) {
    const user = await User.findById(req.user._id);
    res.render("secret", { User: user });
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
app.get("/changePass", isLoggedIn ,function (req, res) {
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

        const newTodoList= new TodoList({
            listName: "Main",
            tasks: []
        });

        await User.register(user, req.body.password);4
        await newTodoList.save();

        const todoListObject = {
        id: newTodoList._id,
        name: newTodoList.listName
        }
        user.tdListIds.push(todoListObject); 
        await user.save();
    
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting...</title>
                <script>
                    // Set success flag and username
                    sessionStorage.setItem('registrationSuccess', 'true');
                    sessionStorage.setItem('registeredUsername', '${req.body.username}');
                    // Redirect to login page
                    window.location.href = '/login';
                </script>
            </head>
            <body>
                <p>Registration successful! Redirecting to login...</p>
            </body>
            </html>
        `);

    } catch (err) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    sessionStorage.setItem('registrationError', 'Registration failed. Username may already exist.');
                    window.location.href = '/register';
                </script>
            </head>
            </html>
        `);
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

        if (!user) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <script>
                        sessionStorage.setItem('resetError', 'User not found');
                        window.location.href = '/forgot-password';
                    </script>
                </head>
                <body>Redirecting...</body>
                </html>
            `);
        }

        await user.setPassword(new_password);
        await user.save();

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    sessionStorage.setItem('passwordResetSuccess', 'true');
                    sessionStorage.setItem('resetUsername', '${username}');
                    window.location.href = '/login';
                </script>
            </head>
            <body>Password updated successfully! Redirecting to login...</body>
            </html>
        `);
    } catch (err) {
        if (!user) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <script>
                        sessionStorage.setItem('resetError', 'User not found');
                        window.location.href = '/forgot-password';
                    </script>
                </head>
                <body>Redirecting...</body>
                </html>
            `);
        }
    }
});


// Showing login form
app.get("/login", function (req, res) {
    res.render("login");

    // to redirect to login page if already authenticated
    // if (!req.isAuthenticated()){
    //     res.render("login");
    // }else{
    //     res.redirect("/loginPage");
    // }
});


app.post("/loginPage", passport.authenticate("local", {
    successRedirect: "/loginPage",
    failureRedirect: "/login?error=invalid"
}));

app.get("/loginPage", isLoggedIn, async function (req, res) {
    try {
        const user = await User.findById(req.user._id);

        const firstTdl = user.tdListIds[0];
        if (firstTdl) {
            return res.redirect("/taskList/" + firstTdl.id);
        }

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Something went wrong" });
    }
});

app.get("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.log('Error destroying session:', err);
            }
            // Clear ALL cookies
            res.clearCookie('connect.sid');
            // Clear any other cookies
            res.clearCookie('loggedIn');
            
            // Prevent caching by setting headers
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            
            // Redirect
            res.redirect('/login');
        });
    });
});

app.get("/check-session", (req, res) => {
    try {
        console.log('Session check - isAuthenticated:', req.isAuthenticated());

        if (req.isAuthenticated() && req.user) {
            res.json({
                authenticated: true,
                user: req.user.username || 'user',
                userId: req.user._id
            });
        } else {
            res.status(401).json({
                authenticated: false,
                message: 'Not authenticated'
            });
        }
    } catch (error) {
        console.error('Error in /check-session:', error);
        // Return 200 with false to prevent frontend errors
        res.status(200).json({
            authenticated: false,
            error: 'server_error'
        });
    }
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


    app.get("/security/:id", isLoggedIn ,async (req, res) => {
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
                    // return res.status(400).send('Incorrect old password.');
                    return res.redirect(`/security/${user._id}?error=invalid`);
                } else {
                    console.error(err);
                    return res.status(500).send('Something went wrong.');
                }
            }
            res.redirect("/login?message=resetSuccess");
            
        })
    });




//ADDED METHODS IN RELATION TO MERGING TO DO LIST, VERY FEW LINES CAN BE FOUND ABOVE
app.get("/taskList/:id", isLoggedIn , async(req, res) => {

    //integrating home.ejs and taskList.ejs

    //extracting user information
    const user = await User.findById(req.user._id);
    const userId = req.user._id;


    //find the specific to do list by its id
    //access its tasks array
    //render the task list page with the tasks array
    const todoList = await TodoList.findById(req.params.id);
    if (!todoList) {
        return res.status(404).send("To-Do List not found");
    }

    const listIdObjectType = new mongoose.Types.ObjectId(req.params.id);

    const availableUsers = await User.find({tdListIds: {$not: {$elemMatch: { id: listIdObjectType }}}});
    const addedUsers = await User.find({tdListIds: {$elemMatch: { id: listIdObjectType }}});


    const userTasks = todoList.tasks;

    res.render("taskList", { tasks: userTasks, users: availableUsers, tdl: todoList, addedUsers: addedUsers, userId: userId, tdl_Array: user.tdListIds});

});


app.post("/createTodoList", async (req, res) => {

    const listName = req.body.newList_Name;
    const userId =  req.body.user_id;
    

    const newTodoList= new TodoList({
            listName: listName,
            tasks: []
    });

    await newTodoList.save();

    // for storing to do list name and id in user
    const todoListObject = {
        id: newTodoList._id,
        name: newTodoList.listName
    }

    const user = await User.findById(
            userId
    );

    if (!user) {
       return res.status(404).json({ success: false, message: "User not found" });
    }

    user.tdListIds.push(todoListObject); 

    await user.save();

    // res.redirect("/loginPage");

     // create added user element
    const addedDiv = document.createElement('div');
    addedDiv.className = 'todolist-item';
    addedDiv.innerHTML = `<button onclick="window.location.href='/taskList/tdl_Array[i].id'"> {name} </button>`;

    document.getElementById('added-users').appendChild(addedDiv);
    

});




app.put("/update-user-TdlArray", async (req, res) => {
    const { userId, todoListId, listName } = req.body;

    const user = await User.findById(
            userId
    );

    if (!user) {
       return res.status(404).json({ success: false, message: "User not found" });
    }

    const tdListIdObject = new mongoose.Types.ObjectId(todoListId);

    const todoListObject = {
        id: tdListIdObject,
        name: listName
    }  
    
    // prevent duplicate entries
    const exists = user.tdListIds.some(tdl => tdListIdObject.equals(tdl.id));
    if (!exists) {
        user.tdListIds.push(todoListObject);
        await user.save();
    } 

    res.json({
        success: true,
        userId,
        username: user.username
    });
}); 


// POST route for adding task
app.post("/addTask", async (req, res) => {
  const taskName = req.body.newTask;
  const tdlId = req.body.tdlId;

  if (taskName) {
    const task = {
        name: taskName, 
        dueDate: undefined,
        dueTime: undefined,
        priority: undefined,
        createdAt: Date.now(),
    };
    const todoList = await TodoList.findById(tdlId);
    if (!todoList) {
        return res.status(404).send("To-Do List not found");
    }
    todoList.tasks.push(task);

    try {
      await todoList.save();
      res.redirect("/taskList/" + tdlId);

    } catch (err) {
      console.error(err);
      res.status(500).send("Could not save task");
    }
  } else {
      res.redirect("/taskList/" + tdlId);
  }
});


//PUT REQUEST for updatign task
app.put("/update-task", async (req, res) => {
  const taskId = req.body.id;
  const newName = req.body.name;
  const tdlId = req.body.tdlId;

  try {

    // const tdlIdObject = new mongoose.Types.ObjectId(tdlId);

    const todoList = await TodoList.findById(tdlId);
    if (!todoList) {
        return res.status(404).send("To-Do List not found");
    }

    todoList.tasks[taskId].name = newName;

    await todoList.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update task" });
  }
});




let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("Server Has Started!");
});
