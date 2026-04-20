import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./auth";

const FREELANCER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const FREELANCER_PHOTO_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateFreelancerPhotoUploadUrl = mutation({
  args: {
    contentType: v.string(),
    sizeBytes: v.number(),
    companyWebsite: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.companyWebsite?.trim()) {
      throw new Error("Could not prepare upload. Please try again.");
    }

    if (!FREELANCER_PHOTO_CONTENT_TYPES.has(args.contentType)) {
      throw new Error("Upload a JPG, PNG, or WebP image");
    }

    if (!Number.isFinite(args.sizeBytes) || args.sizeBytes <= 0 || args.sizeBytes > FREELANCER_PHOTO_MAX_BYTES) {
      throw new Error("Photo must be smaller than 2 MB");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});
