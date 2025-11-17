import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {type : String, required : true, trim : true, minlength: 2},
    email : { type : String, required : true, unique : true, trim : true, lowecase : true },
    password : {type : String,  trim : true, minlength: 5 },
    role : {type : String, enum : ["Admin", "Student"], default : "Student"},
    age : { type: Number},
    gender : {type : String, enum : ["Male", "Female", "Other"]},
    practiceQuestionCount : {type:Number , default: undefined},
    correctAnswers:{type:Number, default: undefined},
    isActive: { type: Boolean, default: true },
    lastLogin : {type : Date, default : null }

}, { timestamps : true});

const User = mongoose.model("User", userSchema);

export default User
