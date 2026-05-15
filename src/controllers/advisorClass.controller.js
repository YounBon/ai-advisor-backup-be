const advisorClassService = require("../services/advisorClass.service");

class AdvisorClassController {
    async deleteClass(req, res, next) {
        try {
            const result = await advisorClassService.deleteClass(req.params.id);
            return res.status(200).json({ message: "Xóa lớp cố vấn thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

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

    async listAllClasses(req, res, next) {
        try {
            const result = await advisorClassService.listAllClasses(req.body);
            return res.status(200).json({ message: "Get all advisor classes successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async changeAdvisor(req, res, next) {
        try {
            const result = await advisorClassService.changeAdvisor(req.body);
            return res.status(200).json({ message: "Change advisor successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdvisorClassController();
