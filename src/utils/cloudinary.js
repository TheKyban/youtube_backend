import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if (!localfilepath) return null;

        /**
         * Upload the file on cloudinary
         */
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto",
        });

        /**
         * File has successfully uploaded
         */

        fs.unlinkSync(localfilepath);
        return response;
    } catch (error) {
        /**
         * remove the locally saved temp file on failed
         */
        fs.unlinkSync(localfilepath);
        return null;
    }
};

export { uploadOnCloudinary };
