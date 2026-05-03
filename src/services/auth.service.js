const userModel = require("../models/user.model");
const { randomUUID } = require("crypto");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const throwError = require("../utils/throwError");
const { pick } = require("lodash");

class AuthService {
    async login(userData) {
        const user = await userModel
            .findOne({ email: userData.email })
            .select("+password_hash");
        if (!user) throwError("Email hoặc mật khẩu không đúng", 401);

        const isMatch = await user.comparePassword(userData.password);
        if (!isMatch) throwError("Email hoặc mật khẩu không đúng", 401);
        if (user.status !== "ACTIVE") throwError("Tài khoản chưa được kích hoạt", 403);
            const loginAt = new Date();
            await userModel.updateOne(
                { _id: user._id },
                { $set: { last_login_at: loginAt } }
            );
            user.last_login_at = loginAt;

        const accessJti = randomUUID();
        const refreshJti = randomUUID();

        const tokenPayload = {
            userId: user._id,
            role: user.role,
            tokenVersion: user.token_version || 0,
        };
        const accessToken = signAccessToken(tokenPayload, accessJti);
        const refreshToken = signRefreshToken(tokenPayload, refreshJti);

        const safeUser = pick(user, ["_id", "username", "email", "role", "status", "last_login_at"]);

        return {
            user: safeUser,
            token_type: "Bearer",
            access_token: accessToken,
            refresh_token: refreshToken,
            access_expires_in: process.env.JWT_EXPIRES_IN || "7d",
            refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "15d",
        };
    }

    async refresh(rawRefreshToken) {
        let decoded;
        try {
            decoded = verifyRefreshToken(rawRefreshToken);
        } catch (error) {
            throwError("Phiên đăng nhập không hợp lệ", 401);
        }

        if (decoded.token_type !== "refresh") throwError("Loại token làm mới không hợp lệ", 401);

        const user = await userModel.findById(decoded.userId).select("_id role status username email last_login_at token_version");
        if (!user) throwError("Không tìm thấy người dùng", 401);
        if (user.status !== "ACTIVE") throwError("Tài khoản chưa được kích hoạt", 403);
        if (Number(decoded.tokenVersion) !== Number(user.token_version || 0)) {
            throwError("Phiên đăng nhập đã hết hạn hoặc bị thu hồi", 401);
        }

            await userModel.updateOne(
                { _id: user._id },
                { $inc: { token_version: 1 } }
            );
            user.token_version = (user.token_version || 0) + 1;

        const accessJti = randomUUID();
        const refreshJti = randomUUID();
        const tokenPayload = {
            userId: user._id,
            role: user.role,
            tokenVersion: user.token_version,
        };
        const accessToken = signAccessToken(tokenPayload, accessJti);
        const refreshToken = signRefreshToken(tokenPayload, refreshJti);

        const safeUser = pick(user, ["_id", "username", "email", "role", "status", "last_login_at"]);
        return {
            user: safeUser,
            token_type: "Bearer",
            access_token: accessToken,
            refresh_token: refreshToken,
            access_expires_in: process.env.JWT_EXPIRES_IN || "7d",
            refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "15d",
        };
    }

    async logout({ currentUser, refreshToken, allDevices }) {
        const user = await userModel.findById(currentUser.userId).select("_id token_version");
        if (!user) throwError("Không tìm thấy người dùng", 401);

        if (refreshToken) {
            let decoded;
            try {
                decoded = verifyRefreshToken(refreshToken);
            } catch (error) {
                throwError("Phiên đăng nhập không hợp lệ", 401);
            }

            if (decoded.token_type !== "refresh") throwError("Loại token làm mới không hợp lệ", 401);
            if (String(decoded.userId) !== String(currentUser.userId)) {
                throwError("Token không thuộc tài khoản hiện tại", 403);
            }
            if (Number(decoded.tokenVersion) !== Number(user.token_version || 0)) {
                throwError("Phiên đăng nhập đã hết hạn hoặc bị thu hồi", 401);
            }
        }

            await userModel.updateOne(
                { _id: user._id },
                { $inc: { token_version: 1 } }
            );
            user.token_version = (user.token_version || 0) + 1;

        return { logged_out: true, all_devices: Boolean(allDevices) };
    }
}

module.exports = new AuthService();
