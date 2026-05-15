const AdvisorClass = require("../models/advisorClass.model");
const User = require("../models/user.model");
const Major = require("../models/major.model");
const ClassMember = require("../models/classMember.model");
const throwError = require("../utils/throwError");

const MAX_CLASSES_PER_ADVISOR = 3;

class AdvisorClassService {

    async deleteClass(classId) {
        if (!classId) throwError("class_id is required", 422);

        const classItem = await AdvisorClass.findById(classId).select("_id status");
        if (!classItem) throwError("Không tìm thấy lớp cố vấn", 404);

        const memberCount = await ClassMember.countDocuments({ class_id: classId });
        if (memberCount > 0) {
            throwError("Không thể xóa lớp còn sinh viên. Hãy chuyển hoặc xóa sinh viên trước.", 422);
        }

        await AdvisorClass.findByIdAndDelete(classId);
        return { deleted: true, class_id: classId };
    }

    async listAllClasses(body) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = {};
        if (body.department_id) filter.department_id = body.department_id;
        if (body.major_id) filter.major_id = body.major_id;
        if (body.status) filter.status = body.status;
        if (body.advisor_user_id) filter.advisor_user_id = body.advisor_user_id;
        if (body.search) {
            filter.$or = [
                { class_code: { $regex: body.search, $options: "i" } },
                { class_name: { $regex: body.search, $options: "i" } },
            ];
        }

        const [items, total] = await Promise.all([
            AdvisorClass.find(filter)
                .populate("advisor_user_id", "_id username email profile.full_name advisor_info")
                .populate("department_id", "_id department_code department_name")
                .populate("major_id", "_id major_code major_name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AdvisorClass.countDocuments(filter),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async changeAdvisor(data) {
        const { class_id, new_advisor_user_id } = data;
        if (!class_id) throwError("class_id is required", 422);
        if (!new_advisor_user_id) throwError("new_advisor_user_id is required", 422);

        const classItem = await AdvisorClass.findById(class_id).select("_id advisor_user_id department_id major_id status");
        if (!classItem) throwError("class not found", 404);

        const advisor = await User.findOne({ _id: new_advisor_user_id, role: "ADVISOR" }).select("_id org.department_id");
        if (!advisor) throwError("new_advisor_user_id must be a valid ADVISOR user", 422);
        if (!advisor.org?.department_id) throwError("advisor does not have department_id", 422);
        if (String(advisor.org.department_id) !== String(classItem.department_id)) {
            throwError("Cố vấn phải thuộc cùng khoa với lớp cố vấn", 422);
        }

        const isSameAdvisor = String(classItem.advisor_user_id) === String(new_advisor_user_id);
        if (!isSameAdvisor) {
            const newAdvisorCount = await AdvisorClass.countDocuments({
                advisor_user_id: new_advisor_user_id,
                status: { $ne: "INACTIVE" },
                _id: { $ne: class_id },
            });
            if (newAdvisorCount >= MAX_CLASSES_PER_ADVISOR) {
                throwError(`Cố vấn này đã phụ trách ${MAX_CLASSES_PER_ADVISOR} lớp (tối đa cho phép)`, 422);
            }
        }

        await AdvisorClass.findByIdAndUpdate(
            class_id,
            { $set: { advisor_user_id: new_advisor_user_id } }
        );

        const updated = await AdvisorClass.findById(class_id)
            .populate("advisor_user_id", "_id username email profile.full_name advisor_info")
            .populate("department_id", "_id department_code department_name")
            .populate("major_id", "_id major_code major_name")
            .lean();

        return updated;
    }

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
            orgPayload = { department_id: data.department_id };
        }

        const existingClass = await AdvisorClass.findOne({ class_code: data.class_code }).select("_id advisor_user_id");

        if (!existingClass) {
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
            const isSameAdvisor = String(existingClass.advisor_user_id) === String(advisorUserId);
            if (!isSameAdvisor) {
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
            ...(data.class_name ? { class_name: data.class_name } : {}),
            advisor_user_id: advisorUserId,
            ...orgPayload,
            ...(data.cohort_year ? { cohort_year: data.cohort_year } : {}),
            status: data.status || "ACTIVE",
        };

        const result = await AdvisorClass.findOneAndUpdate(
            { class_code: data.class_code },
            { $set: payload },
            { new: true, upsert: true }
        );

        return result;
    }

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
