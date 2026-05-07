const advisorClassService = require("../services/advisorClass.service");

class AdvisorClassController {
    async upsertClass(req, res, next) {
        try {
            const result = await advisorClassService.upsertClass(req.body, req.user);
            return res.status(200).json({ message: "Upsert advisor class successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getMyClass(req, res, next) {
        try {
            const result = await advisorClassService.getMyClasses(req.user, req.body);
            return res.status(200).json({ message: "Get advisor classes successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdvisorClassController();
