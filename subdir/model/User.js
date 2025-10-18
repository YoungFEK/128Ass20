// Filename - model/User.js

// const mongoose = require('mongoose')
// const Schema = mongoose.Schema
// const passportLocalMongoose = require('passport-local-mongoose');
// var User = new Schema({
//     username: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true
//     },
//     password: {
//         type: String
//     },
//     securityQuestion: String,
//     securityAnswer: String
// })

// User.plugin(passportLocalMongoose);

// module.exports = mongoose.model('User', User)

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  password: String,
  securityQuestion: String,
  securityAnswer: String
});

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);
