import express from 'express';
import AnalyticsAndReportingController from '../controllers/AnalyticsAndReportingController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

router.post('/reportingData',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  AnalyticsAndReportingController.reportingData)

router.get('/analyticsData',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  AnalyticsAndReportingController.analyticsData)
 
router.get('/performanceData',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}), AnalyticsAndReportingController.performanceData)


export default router;