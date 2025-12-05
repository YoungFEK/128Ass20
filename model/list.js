//list.js
const mongoose = require("mongoose");


const toDoListSchema = new mongoose.Schema({
  listName: { type: String, default: "none" }, 
  tasks: { type: Array, default: [] }
});

module.exports = mongoose.model("TodoList", toDoListSchema);
