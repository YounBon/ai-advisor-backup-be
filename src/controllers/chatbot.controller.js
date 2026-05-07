const chatbotService = require("../services/chatbot.service");

class ChatbotController {
    /**
     * POST /api/chatbot/message
     * Body: { message: string, history?: Array }
     */
    async sendMessage(req, res, next) {
        try {
            const studentUserId = req.user.userId;
            const { message, history = [] } = req.body;

            const result = await chatbotService.chat(studentUserId, message, history);

            return res.status(200).json({
                message: "OK",
                data: {
                    reply: result.reply,
                    usage: result.usage,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/chatbot/usage
     * Trả về thống kê số request/ngày cho từng API key (chỉ ADMIN/FACULTY)
     */
    async getUsage(req, res, next) {
        try {
            const stats = chatbotService.getUsageStats();
            return res.status(200).json({ message: "OK", data: stats });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ChatbotController();
