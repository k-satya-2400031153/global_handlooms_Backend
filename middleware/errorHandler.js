export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Handle Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        message = `Resource not found`;
        statusCode = 404;
    }

    // Handle Mongoose Validation Errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((val) => val.message);
        message = messages.join(', ');
        statusCode = 400;
    }

    // Handle Mongoose Duplicate Key Error
    if (err.code === 11000) {
        message = 'Duplicate field value entered';
        statusCode = 400;
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
