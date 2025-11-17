import mongoose from "mongoose";

const supportRequestSchema = new mongoose.Schema({
    userId : {type : mongoose.Schema.Types.ObjectId , ref : "User"},
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array to store all admins
    respondedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subject : {type : String, required : true },
    message : {type: String, required : true},
    responseText : {type: String},
    status : {type: String, required : true},
}, {timestamps : true});
 const SupportRequest = mongoose.model("SupportRequest", supportRequestSchema);
 export default SupportRequest;