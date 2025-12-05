//User.js
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  password: String,
  securityQuestion: String,
  securityAnswer: String,
  tdListIds: { type: Array, default: [] }
});

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);
