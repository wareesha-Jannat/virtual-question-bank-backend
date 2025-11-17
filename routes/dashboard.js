import express from 'express';
import DashboardController from '../controllers/DashboardController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

router.get('/dashboardData',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  DashboardController.dashboardData)

router.get('/dashboardDataStudent',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  DashboardController.studentDashboardData)


export default router;