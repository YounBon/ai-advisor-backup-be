module.exports = (err, req, res, next) => {
    if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ message: "file size must be less than or equal to 5MB" });
    }
    
    const response = { message: err.message || "Internal server error" };
    
    // Include additional error data if present (e.g., remainingTime)
    if (err.remainingTime !== undefined) {
        response.remainingTime = err.remainingTime;
    }
    
    res.status(err.statusCode || 500).json(response);
};
