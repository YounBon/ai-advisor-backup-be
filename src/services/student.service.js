const mongoose = require("mongoose");
const User = require("../models/user.model");
const ClassMember = require("../models/classMember.model");
const AdvisorClass = require("../models/advisorClass.model");
const Department = require("../models/department.model");
const Major = require("../models/major.model");
const throwError = require("../utils/throwError");

function getDepartmentName(department) {
    if (!department) return null;
    if (typeof department === "object") return department.department_name || null;
    return null;
}

function getMajorName(major) {
    if (!major) return null;
    if (typeof major === "object") return major.major_name || null;
    return null;
}

function toDisplayStudent(user) {
    if (!user) return user;
    return {
        ...user,
        full_name: user.profile?.full_name || null,
        department_name: getDepartmentName(user.org?.department_id),
        major_name: getMajorName(user.org?.major_id),
    };
}

class StudentService {
    async getStudents(body, currentUser) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = { role: "STUDENT" };

        if (body.class_id) {
            const classDoc = await AdvisorClass.findById(body.class_id).select(
                "_id advisor_user_id department_id major_id status"
            );
            if (!classDoc) throwError("class not found", 404);
            if (classDoc.status !== "ACTIVE") throwError("class is not active", 422);
            if (!classDoc.department_id) throwError("class does not have department_id", 422);

            if (currentUser?.role === "ADVISOR") {
                if (String(classDoc.advisor_user_id) !== String(currentUser.userId)) {
                    throwError("forbidden for this class", 403);
                }
            }

            if (body.advisor_user_id && String(classDoc.advisor_user_id) !== String(body.advisor_user_id)) {
                throwError("advisor_user_id does not match class advisor", 422);
            }

            filter["org.department_id"] = classDoc.department_id;
            if (classDoc.major_id) {
                filter["org.major_id"] = classDoc.major_id;
            }

            const activeInThisClass = await ClassMember.find({
                class_id: classDoc._id,
                status: "ACTIVE",
            }).distinct("student_user_id");
            const activeOtherClass = await ClassMember.find({
                status: "ACTIVE",
                class_id: { $ne: classDoc._id },
            }).distinct("student_user_id");
            const excludeStr = new Set([
                ...activeInThisClass.map((id) => String(id)),
                ...activeOtherClass.map((id) => String(id)),
            ]);
            if (excludeStr.size) {
                const excludeIds = [...excludeStr]
                    .filter((id) => mongoose.Types.ObjectId.isValid(id))
                    .map((id) => new mongoose.Types.ObjectId(id));
                if (excludeIds.length) {
                    filter._id = { $nin: excludeIds };
                }
            }
        }

        if (body.search) {
            filter.$or = [
                { username: { $regex: body.search, $options: "i" } },
                { email: { $regex: body.search, $options: "i" } },
                { "student_info.student_code": { $regex: body.search, $options: "i" } },
                { "profile.full_name": { $regex: body.search, $options: "i" } },
            ];
        }

        const [items, total] = await Promise.all([
            User.find(filter)
                .select("_id username email role status profile org student_info createdAt updatedAt")
                .populate("org.department_id", "department_code department_name")
                .populate("org.major_id", "major_code major_name department_id")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
        ]);

        return {
            items: items.map(toDisplayStudent),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getStudentById(id) {
        const filter = { _id: id, role: "STUDENT" };

        const student = await User.findOne(filter)
            .select("_id username email role status profile org student_info createdAt updatedAt")
            .populate("org.department_id", "department_code department_name")
            .populate("org.major_id", "major_code major_name department_id")
            .lean();
        if (!student) throwError("Student not found", 404);
        return toDisplayStudent(student);
    }

    async getMyAdvisor(studentUserId) {
        if (!studentUserId) throwError("student_user_id is required", 422);

        const student = await User.findOne({ _id: studentUserId, role: "STUDENT" }).select(
            "_id org student_info"
        ).populate("org.department_id", "department_code department_name")
            .populate("org.major_id", "major_code major_name");
        if (!student) throwError("Student not found", 404);

        let advisorClass = null;
        let advisorUserId = student.student_info?.advisor_user_id ? String(student.student_info.advisor_user_id) : "";

        const activeMembership = await ClassMember.findOne({
            student_user_id: studentUserId,
            status: "ACTIVE",
        }).select("class_id joined_at");

        if (activeMembership?.class_id) {
            advisorClass = await AdvisorClass.findById(activeMembership.class_id).select(
                "_id class_code class_name advisor_user_id department_id major_id cohort_year status"
            );
            if (advisorClass?.advisor_user_id && !advisorUserId) {
                advisorUserId = String(advisorClass.advisor_user_id);
            }
        }

        let advisor = null;
        if (advisorUserId) {
            advisor = await User.findOne({ _id: advisorUserId, role: "ADVISOR" }).select(
                "_id username email status profile advisor_info org"
            );
        }

        let departmentDisplay = null;
        let majorDisplay = null;

        const deptSource = advisorClass?.department_id || student.org?.department_id;
        const majorSource = advisorClass?.major_id || student.org?.major_id;

        if (deptSource) {
            if (typeof deptSource === 'object' && deptSource.department_name) {
                departmentDisplay = [deptSource.department_code, deptSource.department_name].filter(Boolean).join(" — ");
            } else {
                const dept = await Department.findById(deptSource)
                    .select("department_code department_name")
                    .lean();
                if (dept) {
                    departmentDisplay = [dept.department_code, dept.department_name].filter(Boolean).join(" — ");
                }
            }
        }
        if (majorSource) {
            if (typeof majorSource === 'object' && majorSource.major_name) {
                majorDisplay = [majorSource.major_code, majorSource.major_name].filter(Boolean).join(" — ");
            } else {
                const maj = await Major.findById(majorSource).select("major_code major_name").lean();
                if (maj) {
                    majorDisplay = [maj.major_code, maj.major_name].filter(Boolean).join(" — ");
                }
            }
        }

        return {
            student_user_id: student._id,
            advisor: advisor
                ? {
                    _id: advisor._id,
                    username: advisor.username,
                    email: advisor.email,
                    status: advisor.status,
                    profile: advisor.profile,
                    advisor_info: advisor.advisor_info,
                    org: advisor.org,
                }
                : null,
            advisor_class: advisorClass
                ? {
                    _id: advisorClass._id,
                    class_code: advisorClass.class_code,
                    class_name: advisorClass.class_name,
                    advisor_user_id: advisorClass.advisor_user_id,
                    department_id: advisorClass.department_id,
                    major_id: advisorClass.major_id,
                    department_display: departmentDisplay,
                    major_display: majorDisplay,
                    cohort_year: advisorClass.cohort_year,
                    status: advisorClass.status,
                }
                : null,
        };
    }
}

module.exports = new StudentService();
