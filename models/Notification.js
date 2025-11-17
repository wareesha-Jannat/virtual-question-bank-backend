import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    
    title : {type : String, required : true},
    message : {type: String, required : true},
    receiverId : {type : [mongoose.Schema.Types.ObjectId] , ref : "User", required : true},
    createdAt : {type : Date , default: Date.now,  expires: '30d'},//Automatically deletes document after 30 days
    isReadBy: { type: [mongoose.Schema.Types.ObjectId], default: [] } // Array of ObjectIds
   
});
 const Notification = mongoose.model("Notification", notificationSchema);

 export default Notification