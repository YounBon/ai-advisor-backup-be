const authService = require("../services/auth.service");

class AuthController {
    async login(req, res, next) {
        try {
            const userData = req.body;
            const result = await authService.login(userData);
            return res.status(200).json({ message: "Đăng nhập thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const result = await authService.refresh(req.body.refresh_token);
            return res.status(200).json({ message: "Làm mới phiên đăng nhập thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const result = await authService.logout({
                currentUser: req.user,
                refreshToken: req.body.refresh_token,
                allDevices: req.body.all_devices,
            });
            return res.status(200).json({ message: "Đăng xuất thành công", data: result });
        } catch (error) {
            next(error);
        }
    }

    /** Trả về thông tin user hiện tại dựa trên token — dùng để verify token còn hợp lệ */
    async me(req, res, next) {
        try {
            return res.status(200).json({ message: "Lấy thông tin người dùng thành công", data: req.user });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
