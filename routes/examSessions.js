import express from 'express';
import ExamSessionController from '../controllers/ExamSessionController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

router.post('/startExam',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  ExamSessionController.startExam)

router.post('/finishExam',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  ExamSessionController.finishExam)


export default router;