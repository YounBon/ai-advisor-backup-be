const dashboardService = require("../services/dashboard.service");

class DashboardController {
    async getStudentDashboard(req, res, next) {
        try {
            const result = await dashboardService.getStudentDashboard(req.body, req.user);
            return res.status(200).json({ message: "Get student dashboard successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getAdvisorDashboard(req, res, next) {
        try {
            const result = await dashboardService.getAdvisorDashboard(req.body, req.user);
            return res.status(200).json({ message: "Get advisor dashboard successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getFacultyDashboard(req, res, next) {
        try {
            const result = await dashboardService.getFacultyDashboard(req.body, req.user);
            return res.status(200).json({ message: "Get faculty dashboard successfully", data: result });
        } catch (error) {
            console.error('[FacultyDashboard] Error:', error?.message, error?.stack);
            next(error);
        }
    }
}

module.exports = new DashboardController();
