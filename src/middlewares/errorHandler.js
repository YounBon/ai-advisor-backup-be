module.exports = (err, req, res, next) => {
    if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ message: "Dung lượng tệp phải nhỏ hơn hoặc bằng 5MB" });
    }

    // Log lỗi để debug
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.path}`, err);
    }

    const response = { message: err.message || "Đã có lỗi xảy ra" };

    if (err.remainingTime !== undefined) {
        response.remainingTime = err.remainingTime;
    }

    res.status(statusCode).json(response);
};
