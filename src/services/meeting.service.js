const Meeting = require("../models/meeting.model");
const Feedback = require("../models/feedback.model");
const AdvisorClass = require("../models/advisorClass.model");
const ClassMember = require("../models/classMember.model");
const Term = require("../models/term.model");
const path = require("path");
const cloudinary = require("../config/cloudinary");
const throwError = require("../utils/throwError");

class MeetingService {
    normalizeDownloadFilename(originalname, fallbackFormat) {
        const parsed = path.parse(String(originalname || ""));
        const baseName = String(parsed.name || "meeting-file")
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120);
        const extension = String((fallbackFormat || parsed.ext || "").replace(/^\./, "")).toLowerCase();
        return extension ? `${baseName || "meeting-file"}.${extension}` : baseName || "meeting-file";
    }

    buildDownloadUrl(publicId) {
        if (!publicId) return "";
        return cloudinary.url(publicId, {
            resource_type: "raw",
            type: "upload",
            secure: true,
            flags: "attachment",
        });
    }

    normalizeMeetingFile(meeting) {
        const data = meeting?.toObject ? meeting.toObject() : meeting;
        if (!data?.file?.public_id) return data;
        const fallbackFormat = data.file.format || String(data.file.original_name || "").split(".").pop()?.toLowerCase();
        const downloadFilename = this.normalizeDownloadFilename(data.file.original_name, fallbackFormat);
        data.file.download_url = this.buildDownloadUrl(data.file.public_id);
        data.file.original_name = data.file.original_name || downloadFilename;
        return data;
    }

    async listMyMeetings(body, studentUserId) {
        if (!studentUserId) throwError("student_user_id is required", 422);

        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = { student_user_ids: studentUserId };
        const [items, total] = await Promise.all([
            Meeting.find(filter)
                .sort({ meeting_time: -1 })
                .skip(skip)
                .limit(limit)
                .populate("class_id", "class_code class_name")
                .populate("advisor_user_id", "profile.full_name advisor_info.staff_code advisor_info.title email")
                .select(
                    "_id class_id advisor_user_id term_id meeting_time meeting_end_time notes_summary summary_model file createdAt"
                ),
            Meeting.countDocuments(filter),
        ]);

        return {
            items: items.map((item) => this.normalizeMeetingFile(item)),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async listAdvisorMeetings(body, advisorUserId) {
        if (!advisorUserId) throwError("advisor_user_id is required", 422);

        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = { advisor_user_id: advisorUserId };
        const [items, total] = await Promise.all([
            Meeting.find(filter)
                .sort({ meeting_time: -1 })
                .skip(skip)
                .limit(limit)
                .populate("class_id", "class_code class_name")
                .populate(
                    "student_user_ids",
                    "username email profile.full_name student_info.student_code"
                )
                .select(
                    "_id class_id student_user_ids advisor_user_id term_id meeting_time meeting_end_time notes_summary summary_model file createdAt"
                ),
            Meeting.countDocuments(filter),
        ]);

        return {
            items: items.map((item) => this.normalizeMeetingFile(item)),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getInfoMeeting(body, studentUserId) {
        if (!studentUserId) throwError("student_user_id is required", 422);

        const page = Number(body.page || 1);
        const limit = Number(body.limit || 20);
        const skip = (page - 1) * limit;

        const filter = { student_user_ids: studentUserId };
        const [meetings, total] = await Promise.all([
            Meeting.find(filter)
                .sort({ meeting_time: -1 })
                .skip(skip)
                .limit(limit)
                .populate("class_id", "class_code class_name")
                .populate("advisor_user_id", "profile.full_name advisor_info.staff_code advisor_info.title email")
                .select("_id class_id advisor_user_id meeting_time meeting_end_time"),
            Meeting.countDocuments(filter),
        ]);

        const meetingIds = meetings.map((item) => item._id);
        const stats = await Feedback.aggregate([
            {
                $match: {
                    student_user_id: studentUserId,
                    meeting_id: { $in: meetingIds },
                },
            },
            {
                $group: {
                    _id: "$meeting_id",
                    feedback_count: { $sum: 1 },
                    latest_submitted_at: { $max: "$submitted_at" },
                },
            },
        ]);

        const statMap = new Map(
            stats.map((item) => [String(item._id), item])
        );

        const items = meetings.map((meeting) => {
            const classObj = meeting.class_id;
            const advisorObj = meeting.advisor_user_id;
            const classId = classObj?._id ? String(classObj._id) : String(meeting.class_id || "");
            const advisorId = advisorObj?._id
                ? String(advisorObj._id)
                : String(meeting.advisor_user_id || "");
            const classCode = classObj?.class_code || "";
            const className = classObj?.class_name || "";
            const advisorName = advisorObj?.profile?.full_name || "";
            const advisorEmail = advisorObj?.email || "";
            const advisorStaffCode = advisorObj?.advisor_info?.staff_code || "";
            const stat = statMap.get(String(meeting._id));

            return {
                meeting_id: String(meeting._id),
                class_id: classId,
                advisor_user_id: advisorId,
                class_label: [classCode, className].filter(Boolean).join(" — ") || classId || "—",
                advisor_label: advisorName || advisorId || "—",
                meeting_time: meeting.meeting_time,
                meeting_end_time: meeting.meeting_end_time,
                feedback_count: stat?.feedback_count || 0,
                latest_submitted_at: stat?.latest_submitted_at || null,
            };
        });

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

    async uploadMeetingFile(file) {
        if (!file?.buffer) return null;
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throwError("cloudinary env is missing", 500);
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "meetings/files",
                    resource_type: "raw",
                    use_filename: true,
                    unique_filename: true,
                    overwrite: false,
                    filename_override: file.originalname,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(file.buffer);
        });

        const formatByMime = {
            "application/pdf": "pdf",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        };
        const resolvedFormat =
            formatByMime[file.mimetype] ||
            uploadResult.format ||
            String(file.originalname || "").split(".").pop()?.toLowerCase();
        const originalName = String(file.originalname || "").trim();
        const downloadFilename = this.normalizeDownloadFilename(originalName, resolvedFormat);
        const downloadUrl = this.buildDownloadUrl(uploadResult.public_id);
        const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));

        return {
            url: uploadResult.secure_url,
            preview_url: uploadResult.secure_url,
            download_url: downloadUrl,
            public_id: uploadResult.public_id,
            original_name: originalName || downloadFilename,
            mime_type: file.mimetype,
            file_size: fileSizeMb,
            format: resolvedFormat,
        };
    }

    async createMeeting(data, advisorUserId, meetingFile) {
        if (!advisorUserId) throwError("advisor_user_id is required", 422);

        const advisorClass = await AdvisorClass.findOne({
            _id: data.class_id,
            advisor_user_id: advisorUserId,
            status: "ACTIVE",
        }).select("_id");
        if (!advisorClass) throwError("class_id is invalid for this advisor", 403);

        const studentIds = Array.from(new Set((data.student_user_ids || []).map(String)));
        if (!studentIds.length) throwError("student_user_ids is required", 422);

        const activeMembers = await ClassMember.find({
            class_id: data.class_id,
            student_user_id: { $in: studentIds },
            status: "ACTIVE",
        }).select("student_user_id");

        if (activeMembers.length !== studentIds.length) {
            throwError("all student_user_ids must be active members of class_id", 422);
        }
        if (data.term_id) {
            const term = await Term.findById(data.term_id).select("_id");
            if (!term) throwError("term_id is invalid", 422);
        }

        let filePayload = null;
        if (meetingFile) {
            try {
                filePayload = await this.uploadMeetingFile(meetingFile);
            } catch (error) {
                throwError(error?.message || "upload file to cloudinary failed", 502);
            }
        }

        const created = await Meeting.create({
            class_id: data.class_id,
            student_user_ids: studentIds,
            advisor_user_id: advisorUserId,
            term_id: data.term_id,
            meeting_time: data.meeting_time,
            meeting_end_time: data.meeting_end_time,
            notes_raw: data.notes_raw,
            notes_summary: data.notes_summary,
            summary_model: data.summary_model || "T5",
            file: filePayload,
        });

        return this.normalizeMeetingFile(created);
    }
}

module.exports = new MeetingService();
