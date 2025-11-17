// Loads environment variables from .env file
import dotenv from 'dotenv'
dotenv.config();
import nodemailer from 'nodemailer'

// Creates a transporter object with email service configuration
let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,  // SMTP server host
    port: process.env.EMAIL_PORT,  // SMTP server port
    secure: false,   // Use TLS false(preffered)
    auth: {
        user: process.env.EMAIL_USER, //Admin Gmail ID
        pass: process.env.EMAIL_PASS, //Admin Gmail password
    },
})

export default transporter