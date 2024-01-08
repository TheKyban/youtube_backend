import { Router } from "express";
import {
    login,
    logout,
    refreshAccessToken,
    register,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    register,
);

router.route("/login").post(login);

// secured routes
router.route("/logout").get(verifyJWT, logout);
router.route("/refresh-token").post(refreshAccessToken);

export default router;
