const AdvisorClass = require("../models/advisorClass.model");
const User = require("../models/user.model");
const Major = require("../models/major.model");
const throwError = require("../utils/throwError");

const MAX_CLASSES_PER_ADVISOR = 3;

class AdvisorClassService {
    /**
     * Tạo mới hoặc cập nhật lớp cố vấn theo class_code (upsert).
     * - Nếu class_code chưa tồn tại → tạo mới, kiểm tra giới hạn 3 lớp/cố vấn.
     * - Nếu class_code đã tồn tại → cập nhật (không tính vào giới hạn vì lớp đã thuộc cố vấn đó).
     */
    async upsertClass(data, currentUser) {
        const advisorUserId = data.advisor_user_id;
        if (!advisorUserId) throwError("advisor_user_id is required", 422);

        const advisor = await User.findOne({ _id: advisorUserId, role: "ADVISOR" }).select("_id org.department_id");
        if (!advisor) throwError("advisor_user_id must be a valid ADVISOR user", 422);
        if (!advisor.org?.department_id) throwError("advisor does not have department_id", 422);
        if (String(advisor.org.department_id) !== String(data.department_id)) {
            throwError("advisor must belong to class department", 422);
        }

        let orgPayload = {};
        if (data.major_id) {
            const major = await Major.findById(data.major_id).select("_id department_id");
            if (!major) throwError("major not found", 404);
            if (String(major.department_id) !== String(data.department_id)) {
                throwError("major does not belong to department", 422);
            }
            orgPayload = { department_id: data.department_id, major_id: data.major_id };
        } else {
            orgPayload = { department_id: data.department_id, major_id: undefined };
        }

        // Kiểm tra lớp đã tồn tại theo class_code chưa
        const existingClass = await AdvisorClass.findOne({ class_code: data.class_code }).select("_id advisor_user_id");

        if (!existingClass) {
            // Tạo mới → kiểm tra giới hạn 3 lớp/cố vấn
            const currentCount = await AdvisorClass.countDocuments({
                advisor_user_id: advisorUserId,
                status: { $ne: "INACTIVE" },
            });
            if (currentCount >= MAX_CLASSES_PER_ADVISOR) {
                throwError(
                    `advisor already has ${MAX_CLASSES_PER_ADVISOR} active classes (maximum allowed)`,
                    422
                );
            }
        } else {
            // Cập nhật → chỉ cho phép nếu lớp đang thuộc cùng cố vấn
            // (ADMIN có thể chuyển lớp sang cố vấn khác, nhưng phải kiểm tra giới hạn cố vấn mới)
            const isSameAdvisor = String(existingClass.advisor_user_id) === String(advisorUserId);
            if (!isSameAdvisor) {
                // Chuyển lớp sang cố vấn mới → kiểm tra giới hạn cố vấn mới
                const newAdvisorCount = await AdvisorClass.countDocuments({
                    advisor_user_id: advisorUserId,
                    status: { $ne: "INACTIVE" },
                });
                if (newAdvisorCount >= MAX_CLASSES_PER_ADVISOR) {
                    throwError(
                        `target advisor already has ${MAX_CLASSES_PER_ADVISOR} active classes (maximum allowed)`,
                        422
                    );
                }
            }
        }

        const payload = {
            class_code: data.class_code,
            class_name: data.class_name,
            advisor_user_id: advisorUserId,
            ...orgPayload,
            cohort_year: data.cohort_year,
            status: data.status || "ACTIVE",
        };

        const result = await AdvisorClass.findOneAndUpdate(
            { class_code: data.class_code },
            { $set: payload },
            { new: true, upsert: true }
        );

        return result;
    }

    /**
     * Lấy danh sách tất cả lớp cố vấn của một cố vấn.
     * Trả về mảng (có thể 1–3 lớp).
     */
    async getMyClasses(currentUser, body) {
        const advisorUserId = currentUser.role === "ADVISOR" ? currentUser.userId : body.advisor_user_id;
        if (!advisorUserId) throwError("advisor_user_id is required", 422);

        const classes = await AdvisorClass.find({ advisor_user_id: advisorUserId })
            .sort({ createdAt: 1 })
            .lean();

        return classes;
    }
}

module.exports = new AdvisorClassService();
