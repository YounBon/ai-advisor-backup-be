const notificationService = require("../services/notification.service");

class NotificationController {
    async markAsRead(req, res, next) {
        try {
            const result = await notificationService.markAsRead(req.body, req.user);
            return res.status(200).json({ message: "Marked as read successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async listNotifications(req, res, next) {
        try {
            const result = await notificationService.listNotifications(req.body, req.user);
            return res.status(200).json({ message: "Get notifications successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async generateAlerts(req, res, next) {
        try {
            const result = await notificationService.generateAlerts(req.body, req.user);
            return res.status(200).json({ message: "Generate notifications successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
