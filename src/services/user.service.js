const User = require("../models/user.model");
const Major = require("../models/major.model");
const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const throwError = require("../utils/throwError");
const { pick } = require("lodash");

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

function toDisplayUser(user) {
    if (!user) return user;
    return {
        ...user,
        full_name: user.profile?.full_name || null,
        department_name: getDepartmentName(user.org?.department_id),
        major_name: getMajorName(user.org?.major_id),
    };
}

class UserService {
    async createUser(body) {
        const hasDepartmentId = !!body.org?.department_id;
        const hasMajorId = !!body.org?.major_id;
        if (hasDepartmentId !== hasMajorId) {
            throwError("org.department_id and org.major_id must be provided together", 422);
        }

        let orgPayload;
        if (hasDepartmentId && hasMajorId) {
            const major = await Major.findById(body.org.major_id).select("_id department_id");
            if (!major) throwError("major not found", 404);

            if (String(major.department_id) !== String(body.org.department_id)) {
                throwError("major does not belong to department", 422);
            }

            orgPayload = {
                department_id: body.org.department_id,
                major_id: body.org.major_id,
            };
        }

        const payload = {
            username: body.username,
            email: body.email,
            password_hash: body.password,
            profile: {
                full_name: body.profile?.full_name,
            },
            org: orgPayload,
            role: body.role,
            status: "ACTIVE",
        };

        if (body.role === "STUDENT") {
            payload.student_info = {
                student_code: body.student_info?.student_code,
            };
        }

        if (body.role === "ADVISOR") {
            payload.advisor_info = {
                staff_code: body.advisor_info?.staff_code,
                title: body.advisor_info?.title,
            };
        }

        try {
            const createdUser = await User.create(payload);
            return pick(createdUser, ["_id", "username", "email", "role", "status", "profile", "org", "student_info", "advisor_info"]);
        } catch (error) {
            if (error?.code === 11000) {
                throwError("Email or username or student_code already in use", 409);
            }
            throw error;
        }
    }

    async getUsers(body) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = {};
        if (body.role) filter.role = body.role;
        if (body.status) filter.status = body.status;
        if (body.search) {
            filter.$or = [
                { username: { $regex: body.search, $options: "i" } },
                { email: { $regex: body.search, $options: "i" } },
                { "profile.full_name": { $regex: body.search, $options: "i" } },
            ];
        }

        const [items, total] = await Promise.all([
            User.find(filter)
                .select("_id username email role status profile org student_info advisor_info createdAt updatedAt")
                .populate("org.department_id", "department_code department_name")
                .populate("org.major_id", "major_code major_name department_id")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
        ]);

        return {
            items: items.map(toDisplayUser),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    /**
     * Full user profile (no password) + lớp cố vấn & cố vấn chủ nhiệm.
     * ADVISOR: chỉ xem sinh viên thuộc lớp ACTIVE do mình phụ trách.
     */
    async getUserInfo(body, currentUser) {
        const targetUserId = body.user_id;
        if (!targetUserId) throwError("user_id is required", 422);

        const requesterRole = currentUser?.role;
        const requesterId = currentUser?.userId;
        if (!requesterId) throwError("unauthorized", 401);

        if (requesterRole === "ADVISOR") {
            const advisorClass = await AdvisorClass.findOne({
                advisor_user_id: requesterId,
                status: "ACTIVE",
            }).select("_id");
            if (!advisorClass) throwError("advisor has no active class", 403);

            const inClass = await ClassMember.findOne({
                class_id: advisorClass._id,
                student_user_id: targetUserId,
                status: "ACTIVE",
            }).select("_id");
            if (!inClass) throwError("student is not in your advisory class", 403);
        } else if (!["ADMIN", "FACULTY"].includes(requesterRole)) {
            throwError("forbidden", 403);
        }

        const user = await User.findById(targetUserId)
            .select("-password_hash -token_version")
            .populate("org.department_id", "department_code department_name")
            .populate("org.major_id", "major_code major_name department_id")
            .populate(
                "student_info.advisor_user_id",
                "username email profile.full_name advisor_info"
            )
            .lean();

        if (!user) throwError("user not found", 404);

        const memberRows = await ClassMember.find({ student_user_id: targetUserId })
            .populate({
                path: "class_id",
                select: "class_code class_name status cohort_year advisor_user_id department_id major_id",
                populate: [
                    {
                        path: "advisor_user_id",
                        select: "username email profile.full_name advisor_info",
                    },
                    {
                        path: "department_id",
                        select: "department_code department_name",
                    },
                    {
                        path: "major_id",
                        select: "major_code major_name",
                    },
                ],
            })
            .sort({ createdAt: -1 })
            .lean();

        const advisor_class_memberships = memberRows.map((m) => {
            const cls = m.class_id;
            const adv = cls?.advisor_user_id;
            return {
                membership_status: m.status,
                joined_at: m.joined_at,
                class: cls
                    ? {
                          _id: cls._id,
                          class_code: cls.class_code,
                          class_name: cls.class_name,
                          status: cls.status,
                          cohort_year: cls.cohort_year,
                          department_name: getDepartmentName(cls.department_id),
                          major_name: getMajorName(cls.major_id),
                      }
                    : null,
                advisor: adv
                    ? {
                          _id: adv._id,
                          username: adv.username,
                          email: adv.email,
                          profile: adv.profile,
                          advisor_info: adv.advisor_info,
                      }
                    : null,
            };
        });

        return {
            ...toDisplayUser(user),
            advisor_class_memberships,
        };
    }

    /** Текущий пользователь по JWT (любая активная роль). */
    async getMe(currentUser) {
        const userId = currentUser?.userId;
        if (!userId) throwError("unauthorized", 401);

        const user = await User.findById(userId)
            .select("-password_hash -token_version")
            .populate("org.department_id", "department_code department_name")
            .populate("org.major_id", "major_code major_name department_id")
            .lean();

        if (!user) throwError("user not found", 404);
        return user;
    }

    /** Обновление собственного профиля (без смены роли/email/username). */
    async updateMyProfile(body, currentUser) {
        const userId = currentUser?.userId;
        if (!userId) throwError("unauthorized", 401);

        const user = await User.findById(userId);
        if (!user) throwError("user not found", 404);

        const { profile } = body;
        if (!profile || typeof profile !== "object") {
            throwError("profile is required", 422);
        }

        const $set = {};
        if (profile.full_name !== undefined) {
            const v = String(profile.full_name).trim();
            if (!v) throwError("profile.full_name cannot be empty", 422);
            $set["profile.full_name"] = v;
        }
        if (profile.phone !== undefined) {
            $set["profile.phone"] = profile.phone == null ? "" : String(profile.phone).trim();
        }
        if (profile.address !== undefined) {
            $set["profile.address"] = profile.address == null ? "" : String(profile.address).trim();
        }

        if (Object.keys($set).length === 0) {
            throwError("no profile fields to update", 422);
        }

        await User.findByIdAndUpdate(userId, { $set }, { new: true });

        return this.getMe(currentUser);
    }
}

module.exports = new UserService();
