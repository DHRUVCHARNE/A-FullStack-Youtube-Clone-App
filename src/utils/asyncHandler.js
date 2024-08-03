//Code using Promises
export const asyncHandler = (requestHandler) => {
   return (req, res, next) => {
      Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
   };
};
//Simple Implementation: export const asyncHandler = () => {}
//Higher order function defined below in javascript
//This is a function which recieves or returns a function fn here is received as a function parameter
// export const asyncHandler = (fn) => async (err,req,res,next) => {
//     try {
//         await fn(err,req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
