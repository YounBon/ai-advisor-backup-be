const meetingService = require("../services/meeting.service");

class MeetingController {
    async listMyMeetings(req, res, next) {
        try {
            const result = await meetingService.listMyMeetings(req.body, req.user?.userId);
            return res.status(200).json({ message: "Get my meetings successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async listAdvisorMeetings(req, res, next) {
        try {
            const result = await meetingService.listAdvisorMeetings(req.body, req.user?.userId);
            return res.status(200).json({ message: "Get advisor meetings successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async getInfoMeeting(req, res, next) {
        try {
            const result = await meetingService.getInfoMeeting(req.body, req.user?.userId);
            return res.status(200).json({ message: "Get meeting info successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async createMeeting(req, res, next) {
        try {
            const role = req.user?.role;
            const advisorUserId = role === "ADVISOR" ? req.user?.userId : req.body.advisor_user_id;
            const result = await meetingService.createMeeting(req.body, advisorUserId, req.file);
            return res.status(201).json({ message: "Create meeting successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async updateNotes(req, res, next) {
        try {
            const advisorUserId = req.user?.userId;
            const result = await meetingService.updateNotes(req.params.id, req.body, advisorUserId);
            return res.status(200).json({ message: "Update meeting notes successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async archiveMeeting(req, res, next) {
        try {
            const result = await meetingService.archiveMeeting(req.params.id, req.user?.userId);
            return res.status(200).json({ message: "Meeting archived successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async unarchiveMeeting(req, res, next) {
        try {
            const result = await meetingService.unarchiveMeeting(req.params.id, req.user?.userId);
            return res.status(200).json({ message: "Meeting unarchived successfully", data: result });
        } catch (error) {
            next(error);
        }
    }

    async deleteMeeting(req, res, next) {
        try {
            const result = await meetingService.deleteMeeting(req.params.id, req.user?.userId);
            return res.status(200).json({ message: "Meeting deleted successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MeetingController();
