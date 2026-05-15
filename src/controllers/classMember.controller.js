const classMemberService = require("../services/classMember.service");

class ClassMemberController {
    async addMembers(req, res, next) {
        try {
            const result = await classMemberService.addMembers(req.body, req.user);
            return res.status(200).json({ message: "Add class members successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async listMembers(req, res, next) {
        try {
            const result = await classMemberService.listMembers(req.body, req.user);
            return res.status(200).json({ message: "Get class members successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async removeMembers(req, res, next) {
        try {
            const result = await classMemberService.removeMembers(req.body, req.user);
            return res.status(200).json({ message: "Remove class members successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async transferMembers(req, res, next) {
        try {
            const result = await classMemberService.transferMembers(req.body, req.user);
            return res.status(200).json({ message: "Transfer class members successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async listUnassignedStudents(req, res, next) {
        try {
            const result = await classMemberService.listUnassignedStudents(req.body);
            return res.status(200).json({ message: "Get unassigned students successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ClassMemberController();

