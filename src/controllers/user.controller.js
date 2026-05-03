const userService = require("../services/user.service");

class UserController {
    async createUser(req, res, next) {
        try {
            const result = await userService.createUser(req.body);
            return res.status(201).json({ message: "Create user successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getUsers(req, res, next) {
        try {
            const result = await userService.getUsers(req.body);
            return res.status(200).json({ message: "Get users successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getUserInfo(req, res, next) {
        try {
            const result = await userService.getUserInfo(req.body, req.user);
            return res.status(200).json({ message: "Get user info successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getMe(req, res, next) {
        try {
            const result = await userService.getMe(req.user);
            return res.status(200).json({ message: "Get current user successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            const result = await userService.changePassword(req.body, req.user);
            return res.status(200).json({ message: "Đổi mật khẩu thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateMyProfile(req, res, next) {
        try {
            const result = await userService.updateMyProfile(req.body, req.user);
            return res.status(200).json({ message: "Profile updated successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
