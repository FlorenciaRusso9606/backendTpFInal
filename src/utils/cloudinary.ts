import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadBufferToCloudinary(buffer: Buffer, folder?: string, publicId?: string) {
  return new Promise<any>((resolve, reject) => {
    const options: Record<string, any> = {};
    if (folder) options.folder = folder;
    if (publicId) options.public_id = publicId;
  // allow Cloudinary to detect resource type (image/video/audio)
  options.resource_type = options.resource_type || 'auto';

    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    // Use a Readable stream from the Buffer to avoid streamifier interop issues
    const readable = new Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export function deleteFromCloudinary(publicId: string, resourceType?: string) {
  return new Promise<any>((resolve, reject) => {
    const opts: Record<string, any> = {};
    if (resourceType) opts.resource_type = resourceType;
    cloudinary.uploader.destroy(publicId, opts, (err: any, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function extractPublicIdFromUrl(url: string) {
  try {
    // Example Cloudinary URL formats:
    // https://res.cloudinary.com/<cloud>/image/upload/v123456/<folder>/<public_id>.<ext>
    // https://res.cloudinary.com/<cloud>/video/upload/v123456/<folder>/<public_id>.<ext>
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    // everything after 'upload/' is version (optional) + path/to/public_id.ext
    let rest = parts.slice(uploadIndex + 1).join('/');
    // remove version segment like v12345/
    rest = rest.replace(/^v\d+\//, '');
    // strip file extension if present
    const lastDot = rest.lastIndexOf('.');
    if (lastDot !== -1) rest = rest.substring(0, lastDot);
    // rest is now folder/.../public_id (Cloudinary public id)
    return rest;
  } catch (e) {
    return null;
  }
}