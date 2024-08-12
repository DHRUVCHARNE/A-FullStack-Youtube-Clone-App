import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});

const destroyCloudVideo = async (localFilePath) => {
   try {
      const result = await cloudinary.uploader.destroy(localFilePath, {
         resource_type: "video",
      });
      return true;
   } catch (error) {
      console.error("Error deleting video:", error);
   }
};

const destroyCloudImage = async (localFilePath) => {
   try {
      await cloudinary.uploader.destroy(localFilePath);
      return true;
   } catch (error) {
      return null;
   }
};

export const uploadOnCloudinary = async (localFilePath) => {
   try {
      if (!localFilePath) return null;
      const response = await cloudinary.uploader.upload(localFilePath, {
         resource_type: "auto",
      });
      fs.unlinkSync(localFilePath);
      return response;
   } catch (error) {
      fs.unlinkSync(localFilePath);
      console.log(error);
      return null;
   }
};
