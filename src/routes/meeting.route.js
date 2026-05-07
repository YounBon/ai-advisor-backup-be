const express = require("express");
const meetingController = require("../controllers/meeting.controller");
const meetingValidator = require("../validations/meeting.validator");
const validate = require("../middlewares/validate.middleware");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/authorize.middleware");
const uploadMeetingFile = require("../middlewares/uploadMeetingFile.middleware");

const router = express.Router();

router.post(
    "/my",
    authMiddleware,
    authorizeRoles("STUDENT"),
    meetingValidator.listMyMeetingsValidator,
    validate,
    meetingController.listMyMeetings
);

router.post(
    "/my-info",
    authMiddleware,
    authorizeRoles("STUDENT"),
    meetingValidator.listMyMeetingsValidator,
    validate,
    meetingController.getInfoMeeting
);

router.post(
    "/advisor/list",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    meetingValidator.listAdvisorMeetingsValidator,
    validate,
    meetingController.listAdvisorMeetings
);

router.post(
    "/",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    uploadMeetingFile.single("file"),
    meetingValidator.createMeetingValidator,
    validate,
    meetingController.createMeeting
);

router.patch(
    "/:id/notes",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    meetingValidator.updateNotesValidator,
    validate,
    meetingController.updateNotes
);

router.patch(
    "/:id/archive",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    meetingValidator.meetingIdValidator,
    validate,
    meetingController.archiveMeeting
);

router.patch(
    "/:id/unarchive",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    meetingValidator.meetingIdValidator,
    validate,
    meetingController.unarchiveMeeting
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("ADVISOR"),
    meetingValidator.meetingIdValidator,
    validate,
    meetingController.deleteMeeting
);

module.exports = router;
