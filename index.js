// index.js 
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); //---------------------------------------------------
app.use(express.static("public"));

mongoose.connect(
  "mongodb+srv://user0:password0@cluster0.1zjppch.mongodb.net/"
);

const taskSchema = {
  name: {
    type: String,
    required: true
  },
  dueDate: Date,
  dueTime: String, 
  // priority: {
    // type: Number,
    // enum: [1, 2, 3], // 1: High, 2: Medium, 3: Low
    // // default: 2,
  // }
  priority: Number,
  createdAt: { type: Date, default: Date.now } 
  
};



const Task = mongoose.model("Task", taskSchema);

app.set("view engine", "ejs");

// GET route
app.get("/", async (req, res) => {
  try {
    let today = new Date();
    let options = { weekday: "long", day: "numeric", month: "long" };
    let day = today.toLocaleDateString("en-US", options);

    const foundTasks = await Task.find({});
    res.render("index", { today: day, tasks: foundTasks });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// POST route for adding task
app.post("/", async (req, res) => {
  const taskName = req.body.newTask;
  if (taskName) {
    const task = new Task({ name: taskName });
    try {
      await task.save();
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Could not save task");
    }
  } else {
    res.redirect("/");
  }
});

// POST route for deleting task
app.post("/delete", async (req, res) => {
  const checkedItemId = req.body.checkbox;
  try {
    await Task.findByIdAndDelete(checkedItemId);
    console.log("Successfully deleted checked item.");
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not delete task");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running at port 3000");
});



  
// });

//PUT REQUEST for updatign task
app.put("/update-task", async (req, res) => {
  const taskId = req.body.id;
  const newName = req.body.name;

  try {
    await Task.findByIdAndUpdate(taskId, { name: newName });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update task" });
  }
});


//PUT REQUEST for updatign date
app.put("/update-date/:id", async (req, res) => {
  const taskId = req.params.id;
  const newDate = req.body.dueDate;

  try {
    await Task.findByIdAndUpdate(taskId, {dueDate: newDate });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update task" });
  }
});


//PUT REQUEST for updatign time
app.put("/update-time/:id", async (req, res) => {
  const taskId = req.params.id;
  const newTime = req.body.dueTime;

  try {
    await Task.findByIdAndUpdate(taskId, {dueTime: newTime });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update task" });
  }
});



app.put("/update-priority/:id", async (req, res) => {
  const taskId = req.params.id;
  const newPriority = req.body.priority;

  try {
    await Task.findByIdAndUpdate(taskId, { priority: newPriority });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not update priority" });
  }
});


app.put("/mark-done/:id", async (req, res) => {
  const taskId = req.params.id;
  try {
    await Task.findByIdAndUpdate(taskId, { priority: 1 }); // Low priority
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Could not mark task as done" });
  }
});

app.get("/sort/:option", async (req, res) => {
    const option = req.params.option;
    let tasks;

    if (option === "1") {
        tasks = await Task.find().sort({ createdAt: 1 }); // oldest first
    } else if (option === "2") {
        tasks = await Task.find().sort({ dueDate: 1 }); // soonest due first
    } else if (option === "3") {
        tasks = await Task.find().sort({ priority: -1 }); // highest priority first
    }

    res.json(tasks); // send back sorted tasks as JSON
});


