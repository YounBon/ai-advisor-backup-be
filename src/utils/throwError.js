module.exports = (message, statusCode = 404) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    throw err;
};
