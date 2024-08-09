import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
export const registerUser = asyncHandler(async (req, res) => {
   //get user details from frontend
   const { fullName, email, username, password } = req.body;
   console.log("email:", email);
   if (
      [fullName, email, username, password].some(
         (field) => field?.trim() === ""
      )
   ) {
      throw new ApiError("All Fields are required", 400);
   }
   //check if user already exists
   const existingUser = await User.findOne({
      $or: [{ email }, { username }],
   });
   if (existingUser) {
      throw new ApiError("User already exists", 409);
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   if (!avatar) {
      throw new ApiError(400, "Avatar file is required");
   }

   const user = await User.create({
      fullName,
      email,
      username: username.toLowerCase(),
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
   });

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken" //This unselects these two fields and selects all other
   );
   if (!createdUser) {
      throw new ApiError(500, "Failed to create user");
   }

   return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});
