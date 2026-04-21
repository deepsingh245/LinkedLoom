import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp = require("sharp");

const SIZES = [
  { prefix: "200x200", width: 200, height: 200 },
  { prefix: "400x400", width: 400, height: 400 },
  { prefix: "800x800", width: 800, height: 800 },
];

export const generateResizedImages = onObjectFinalized(
  {
    cpu: 2,
    memory: "1GiB",
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Exit if this is triggered on a file that is not an image.
    if (!contentType?.startsWith("image/")) {
      console.log("This is not an image.");
      return;
    }

    // Exit if the image is already a resized version.
    if (filePath.includes("resized/")) {
      console.log("Already a resized image.");
      return;
    }

    // Only process attachments
    if (!filePath.includes("/attachments/")) {
      console.log("Not an attachment, skipping.");
      return;
    }

    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);

    // Download file from bucket.
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);

    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log("Image downloaded locally to", tempFilePath);

    // Generate and upload each size
    for (const size of SIZES) {
      const resizedFileName = `${path.parse(fileName).name}_${size.prefix}.webp`;
      const tempResizedFilePath = path.join(os.tmpdir(), resizedFileName);
      
      const resizedPathInStorage = path.join("resized", fileDir, resizedFileName);

      try {
        await sharp(tempFilePath)
          .resize(size.width, size.height, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 75 })
          .toFile(tempResizedFilePath);

        console.log(`Created resized image at ${tempResizedFilePath}`);

        // Upload to Firebase Storage
        await bucket.upload(tempResizedFilePath, {
          destination: resizedPathInStorage,
          metadata: {
            contentType: "image/webp",
            cacheControl: "public,max-age=31536000",
            metadata: {
              originalPath: filePath,
            },
          },
        });

        console.log(`Uploaded resized image to ${resizedPathInStorage}`);
      } catch (err) {
        console.error(`Failed to resize/upload ${size.prefix}`, err);
      } finally {
        // Clean up temp resized file
        if (fs.existsSync(tempResizedFilePath)) {
          fs.unlinkSync(tempResizedFilePath);
        }
      }
    }

    // Clean up original temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
);
