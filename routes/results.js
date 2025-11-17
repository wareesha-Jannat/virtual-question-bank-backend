import express from 'express';
import ResultController from '../controllers/ResultController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

router.get('/getResults',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  ResultController.getResultsByUser)

router.post('/detailResult',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  ResultController.getDetailResult)

router.post('/getSingleResult',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  ResultController.getSingleResult)


export default router;