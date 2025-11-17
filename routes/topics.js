import express from 'express';
import TopicController from '../controllers/TopicController.js';
const router = express.Router();
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';


//Public Route
router.get('/', TopicController.getTopics )

//Protected Routes
router.post('/addTopic',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  TopicController.addTopic)
router.delete('/deleteTopic/:topicId',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  TopicController.deleteTopic)


export default router;