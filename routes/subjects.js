import express from 'express';
import SubjectController from '../controllers/SubjectController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

//Public Route
router.get('/', SubjectController.getSubjects )

//Protected Routes
router.post('/createSubject',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  SubjectController.createSubject)

router.delete('/deleteSubject/:subjectId',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  SubjectController.deleteSubject)


export default router;