const userModel = require("../models/user.model");
const { verifyAccessToken } = require("../utils/jwt");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);
        if (decoded.token_type !== "access") {
            return res.status(401).json({ message: "Invalid access token" });
        }

        const user = await userModel.findById(decoded.userId).select("_id role status token_version");
        if (!user) return res.status(401).json({ message: "User not found" });
        if (user.status !== "ACTIVE") {
            return res.status(403).json({ message: "User is not active" });
        }
        if (Number(decoded.tokenVersion) !== Number(user.token_version || 0)) {
            return res.status(401).json({ message: "Access token has expired or been revoked" });
        }

        req.user = { userId: user._id, role: user.role };
        req.auth = {
            accessTokenJti: decoded.jti,
            accessTokenExp: decoded.exp,
            tokenVersion: decoded.tokenVersion,
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = authMiddleware;
