module.exports = (err, req, res, next) => {
    if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ message: "Dung lượng tệp phải nhỏ hơn hoặc bằng 5MB" });
    }
    
    const response = { message: err.message || "Đã có lỗi xảy ra" };
    
    // Include additional error data if present (e.g., remainingTime)
    if (err.remainingTime !== undefined) {
        response.remainingTime = err.remainingTime;
    }
    
    res.status(err.statusCode || 500).json(response);
};
