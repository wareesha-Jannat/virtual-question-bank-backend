import rateLimit from "express-rate-limit"

//Generic Limit
// export const generalLimit = rateLimit({
//     windowMs : 15 * 60 * 1000,
//     max : 100,
//     standardHeaders: true,
//     legacyHeaders: true,
//     message : { error : "Too many requests, please try again later"}
// })

//Specific Limit
export const loginLimit = rateLimit({
    windowMs : 15 * 60 * 1000,
    max : 10,
    standardHeaders: true,
    legacyHeaders: true,
    message: {
        error : "Too many login attempts, try again later"
    }
})