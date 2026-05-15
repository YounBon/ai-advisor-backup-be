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
}

module.exports = new ChatbotController();
