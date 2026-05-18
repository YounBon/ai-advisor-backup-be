const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const User = require("../models/user.model");
const throwError = require("../utils/throwError");

class ClassMemberService {
    async removeMembers(data, currentUser) {
        const { class_id, student_user_ids } = data;
        if (!class_id) throwError("class_id is required", 422);

        const classItem = await AdvisorClass.findById(class_id).select("_id advisor_user_id status");
        if (!classItem) throwError("class not found", 404);
        if (currentUser.role === "ADVISOR" && String(classItem.advisor_user_id) !== String(currentUser.userId)) {
            throwError("forbidden for this class", 403);
        }

        const studentIds = Array.from(new Set((student_user_ids || []).map(String)));
        if (!studentIds.length) throwError("student_user_ids is required", 422);

        const result = await ClassMember.deleteMany({
            class_id: classItem._id,
            student_user_id: { $in: studentIds },
        });

        return { class_id: classItem._id, removed_count: result.deletedCount };
    }

    async transferMembers(data, currentUser) {
        const { from_class_id, to_class_id, student_user_ids } = data;
        if (!from_class_id) throwError("from_class_id is required", 422);
        if (!to_class_id) throwError("to_class_id is required", 422);
        if (String(from_class_id) === String(to_class_id)) throwError("from_class_id and to_class_id must be different", 422);

        const [fromClass, toClass] = await Promise.all([
            AdvisorClass.findById(from_class_id).select("_id advisor_user_id status department_id major_id"),
            AdvisorClass.findById(to_class_id).select("_id advisor_user_id status department_id major_id"),
        ]);
        if (!fromClass) throwError("source class not found", 404);
        if (!toClass) throwError("target class not found", 404);
        if (toClass.status !== "ACTIVE") throwError("target class is not active", 422);

        const studentIds = Array.from(new Set((student_user_ids || []).map(String)));
        if (!studentIds.length) throwError("student_user_ids is required", 422);

        // Validate students belong to from_class
        const existing = await ClassMember.find({
            class_id: fromClass._id,
            student_user_id: { $in: studentIds },
        }).select("_id student_user_id");
        if (existing.length !== studentIds.length) {
            throwError("some students do not belong to the source class", 422);
        }

        if (fromClass.major_id && toClass.major_id && String(fromClass.major_id) !== String(toClass.major_id)) {
            throwError("target class major does not match source class major", 422);
        }

        // Move members to new class
        await ClassMember.updateMany(
            { class_id: fromClass._id, student_user_id: { $in: studentIds } },
            { $set: { class_id: toClass._id } }
        );

        return {
            from_class_id: fromClass._id,
            to_class_id: toClass._id,
            transferred_count: studentIds.length,
        };
    }

    async listUnassignedStudents(body) {
        const page = Number(body.page || 1);
        const limit = Number(body.limit || 50);
        const skip = (page - 1) * limit;

        const filter = { role: "STUDENT" };
        if (body.department_id) filter["org.department_id"] = body.department_id;
        if (body.major_id) filter["org.major_id"] = body.major_id;
        if (body.search) {
            filter.$or = [
                { "profile.full_name": { $regex: body.search, $options: "i" } },
                { username: { $regex: body.search, $options: "i" } },
                { email: { $regex: body.search, $options: "i" } },
                { "student_info.student_code": { $regex: body.search, $options: "i" } },
            ];
        }

        // Find students who already have a class
        const assignedMembers = await ClassMember.find({}).select("student_user_id").lean();
        const assignedIds = assignedMembers.map(m => String(m.student_user_id));

        filter._id = { $nin: assignedIds };

        const [items, total] = await Promise.all([
            User.find(filter)
                .select("_id username email profile.full_name student_info org status")
                .sort({ "profile.full_name": 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
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

    async addMembers(data, currentUser) {
        const classItem = await AdvisorClass.findById(data.class_id).select("_id advisor_user_id status department_id major_id");
        if (!classItem) throwError("class not found", 404);
        if (classItem.status !== "ACTIVE") throwError("class is not active", 422);
        if (!classItem.department_id) throwError("class does not have department_id", 422);
        if (currentUser.role === "ADVISOR" && String(classItem.advisor_user_id) !== String(currentUser.userId)) {
            throwError("forbidden for this class", 403);
        }

        const studentIds = Array.from(new Set((data.student_user_ids || []).map(String)));
        if (!studentIds.length) throwError("student_user_ids is required", 422);

        const students = await User.find({ _id: { $in: studentIds }, role: "STUDENT" }).select("_id org.department_id org.major_id");
        if (students.length !== studentIds.length) {
            throwError("all student_user_ids must be valid STUDENT users", 422);
        }
        for (const student of students) {
            if (!student.org?.department_id) {
                throwError(`student ${student._id} does not have department_id`, 422);
            }
            if (String(student.org.department_id) !== String(classItem.department_id)) {
                throwError(`student ${student._id} is not in class department`, 422);
            }
            if (classItem.major_id) {
                if (!student.org?.major_id) {
                    throwError(`student ${student._id} does not have major_id`, 422);
                }
                if (String(student.org.major_id) !== String(classItem.major_id)) {
                    throwError(`student ${student._id} is not in class major`, 422);
                }
            }
        }

        const existingRows = await ClassMember.find({ student_user_id: { $in: studentIds } }).select(
            "_id class_id student_user_id"
        );
        const existingByStudent = new Map(existingRows.map((item) => [String(item.student_user_id), item]));
        const classId = String(classItem._id);

        for (const studentId of studentIds) {
            const existing = existingByStudent.get(studentId);
            if (existing && String(existing.class_id) !== classId) {
                throwError(`student ${studentId} already belongs to another class`, 409);
            }
        }

        for (const studentId of studentIds) {
            await ClassMember.updateOne(
                { student_user_id: studentId },
                {
                    $set: {
                        class_id: classItem._id,
                        student_user_id: studentId,
                        status: "ACTIVE",
                    },
                    $setOnInsert: { joined_at: new Date() },
                },
                { upsert: true }
            );
        }

        return {
            class_id: classItem._id,
            added_count: studentIds.length,
        };
    }

    async listMembers(body, currentUser) {
        let classId = body.class_id;
        if (currentUser.role === "ADVISOR") {
            if (!classId) {
                const advisorClass = await AdvisorClass.findOne({
                    advisor_user_id: currentUser.userId,
                    status: "ACTIVE",
                })
                    .sort({ createdAt: 1 })
                    .select("_id");
                if (!advisorClass) throwError("advisor class not found", 404);
                classId = advisorClass._id;
            } else {
                const advisorClass = await AdvisorClass.findOne({
                    _id: classId,
                    advisor_user_id: currentUser.userId,
                }).select("_id");
                if (!advisorClass) throwError("class not found or does not belong to this advisor", 403);
            }
        }
        if (!classId) throwError("class_id is required", 422);

        const page = Number(body.page || 1);
        const limit = Number(body.limit || 50);
        const skip = (page - 1) * limit;

        const memberFilter = { class_id: classId };
        if (body.status) memberFilter.status = body.status;

        // Nếu có search: tìm student_user_id khớp trước, rồi filter ClassMember
        let searchStudentIds = null;
        if (body.search && body.search.trim()) {
            const q = body.search.trim();
            const matchedStudents = await User.find({
                role: "STUDENT",
                $or: [
                    { "profile.full_name": { $regex: q, $options: "i" } },
                    { "student_info.student_code": { $regex: q, $options: "i" } },
                    { email: { $regex: q, $options: "i" } },
                    { username: { $regex: q, $options: "i" } },
                ],
            }).select("_id").lean();
            searchStudentIds = matchedStudents.map((s) => s._id);
            memberFilter.student_user_id = { $in: searchStudentIds };
        }

        const [rows, total] = await Promise.all([
            ClassMember.find(memberFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            ClassMember.countDocuments(memberFilter),
        ]);

        const studentIds = rows.map((item) => item.student_user_id);
        const students = await User.find({ _id: { $in: studentIds } }).select(
            "_id username email profile.full_name student_info org.major_id status"
        );
        const studentMap = new Map(students.map((item) => [String(item._id), item]));

        const items = rows.map((row) => ({
            _id: row._id,
            class_id: row.class_id,
            student_user_id: row.student_user_id,
            joined_at: row.joined_at,
            status: row.status,
            student: studentMap.get(String(row.student_user_id)) || null,
        }));

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
}

module.exports = new ClassMemberService();
