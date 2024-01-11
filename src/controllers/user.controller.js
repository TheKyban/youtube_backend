import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token.",
        );
    }
};

const login = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required.");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exists.");
    }

    const isPasswordVaild = await user.isPasswordCorrect(password);

    if (!isPasswordVaild) {
        throw new ApiError(401, "Invalid user credentials.");
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );
    const options = {
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
                "User logged In Successfully",
            ),
        );
});

const register = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username,email
    // check for image , avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body;
    console.log(fullName, email, username, password);
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === "" || field?.trim() === undefined,
        )
    ) {
        throw new ApiError(400, "All fields are required.");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists.");
    }

    const avatarLocalPath = req?.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (
        req?.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req?.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required.");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username?.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user.",
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully."),
        );
});

const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        },
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options);
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token.");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };
        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken();

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "token refreshed.",
                ),
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token.");
    }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedToChannels",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToChannelsCount: {
                    $size: "$subscribedToChannels",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                subscribers: 1,
                subscribedToChannels: 1,
                subscribersCount: 1,
                subscribedToChannelsCount: 1,
                isSubscribed: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully.",
            ),
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "_id",
                localField: "watchHistory",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "watch history fetched successfully.",
            ),
        );
});

export {
    register,
    login,
    logout,
    refreshAccessToken,
    getUserChannelProfile,
    getWatchHistory,
};
