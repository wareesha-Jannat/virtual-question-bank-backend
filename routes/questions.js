import express from 'express';
import QuestionController from '../controllers/QuestionController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

//Public Route
router.get('/getQuestions',  QuestionController.getQuestionPageQuestions )

//Protected Routes
router.post('/addQuestion',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  QuestionController.addQuestion)

router.get('/getQuestionsByAdmin',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  QuestionController.getQuestionsByAdmin )
 
router.put('/updateQuestion/:questionId',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  QuestionController.updateQuestion )

router.delete('/deleteQuestion/:questionId',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}), QuestionController.deleteQuestion)

router.post('/evaluateResponse',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  QuestionController.evaluateResponse)


export default router;