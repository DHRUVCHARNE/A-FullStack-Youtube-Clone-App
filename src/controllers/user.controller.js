import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
   } catch (error) {
      throw new ApiError(
         500,
         "Something went Wrong while generating refresh and access token"
      );
   }
};

const registerUser = asyncHandler(async (req, res) => {
   //get user details from frontend
   const { fullName, email, username, password } = req.body;
   //console.log("email:", email);
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

   let coverImageLocalPath;
   if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
   ) {
      coverImageLocalPath = req.files.coverImage[0].path;
   }

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
      avatar: avatar?.url,
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

const loginUser = asyncHandler(async (req, res) => {
   const { email, username, password } = req.body;
   console.log(email);
   if (!username && !email)
      throw new ApiError(400, "Username or Email is required");

   const user = await User.findOne({
      $or: [{ email }, { username }],
   });

   if (!user) throw new ApiError(404, "User not found");

   const isPasswordValid = await user.isPasswordCorrect(password);

   if (!isPasswordValid) throw new ApiError(401, "Password is incorrect");

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
   );

   const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );

   const options = {
      //Makes Cookies secure and modifiable only from server and not by client frontend
      httpOnly: true,
      secure: true,
   };

   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
            200,
            {
               user: loggedInUser,
               accessToken,
               refreshToken,
            },
            "User logged in Successfully!"
         )
      );
});

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined,
         },
      },
      { new: true }
   );

   const options = {
      httpOnly: true,
      secure: true,
   };

   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

   if (incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Request");
   }
   try {
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      );

      const user = await User.findById(decodedToken?._id);

      if (!user) throw new ApiError(401, "Invalid Refresh Token");

      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh Token Expired");
      }

      const options = {
         httpOnly: true,
         secure: true,
      };

      const { accessToken, newRefreshToken } =
         await generateAccessAndRefreshTokens(user._id);

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(
               200,
               { accessToken, refreshToken: newRefreshToken },
               "Refreshed Access Token"
            )
         );
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Refresh Token");
   }
});

export { registerUser, loginUser, logoutUser };
