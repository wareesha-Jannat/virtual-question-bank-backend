import express from 'express';
import NotificationController from '../controllers/NotificationController.js';
import passport from 'passport';
import accessTokenAutoRefresh from '../middlewares/accessTokenAutoRefresh.js';
const router = express.Router();

router.post('/createNotification',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  NotificationController.createNotification)

router.get('/getNotifications',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}),  NotificationController.getNotifications)
 
router.put('/updateNotification/markAsRead/:notificationId',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}), NotificationController.markAsRead )

router.get('/hasUnread',accessTokenAutoRefresh, passport.authenticate( 'jwt', {session: false}), NotificationController.checkUnreadNotifications)


export default router;