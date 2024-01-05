// const asyncHandler = (fn) => {
//     return async (req, res, next) => {
//         try {
//             return await fn(req, res, next);
//         } catch (error) {
//             res.status(err.code || 500).json({
//                 success: false,
//                 message: err.message,
//             });
//         }
//     };
// };

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => next(error));
    };
};

export default asyncHandler;
