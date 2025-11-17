import mongoose from "mongoose";


const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        ref: 'User' 
    },
    role: {
        type: String,
        required: true 
    },
    action: {
        type: String,
        required: true 
    },
    timestamp: {
        type: Date,
        default: Date.now, 
        expires: '1d' // Automatically delete documents after 1 day
    }
});

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
