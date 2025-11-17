import mongoose from 'mongoose'

const userRefreshTokenSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique : true},
    token: {type : String, required: true, unique: true},
    createdAt: {type: Date, default: Date.now, expires: '1d'}
});

//Model
const UserRefreshTokenModel = mongoose.model("userRefreshToken", userRefreshTokenSchema);

export default UserRefreshTokenModel;
