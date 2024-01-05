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

        console.log("File upload on cloudinary: ", response.url);
        return response;
    } catch (error) {
        /**
         * remove the locally saved temp file on failed
         */
        fs.unlinkSync(localfilepath);
        return null;
    }
};

// cloudinary.v2.uploader.upload(
//     "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//     { public_id: "olympic_flag" },
//     function (error, result) {
//         console.log(result);
//     },
// );
