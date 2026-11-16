import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    
    title : {type : String, required : true},
    message : {type: String, required : true},
    receiverId : {type : mongoose.Schema.Types.ObjectId , ref : "User", required : true},
    createdAt : {type : Date , default: Date.now},//Automatically deletes document after 30 days
    isReadBy: { type: Boolean, default: false }
   
});
 const Notification = mongoose.model("Notification", notificationSchema);

 export default Notification