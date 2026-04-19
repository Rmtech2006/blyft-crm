import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const roleSkillValidator = v.object({
  category: v.string(),
  skills: v.array(v.string()),
});

const workLinkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

function cleanArray(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function cleanRoleSkills(groups: Array<{ category: string; skills: string[] }>) {
  return groups
    .map((group) => ({
      category: group.category.trim(),
      skills: cleanArray(group.skills),
    }))
    .filter((group) => group.category);
}

function cleanWorkLinks(links?: Array<{ label: string; url: string }>) {
  return (links ?? [])
    .map((link) => ({
      label: link.label.trim() || "Work link",
      url: link.url.trim(),
    }))
    .filter((link) => link.url)
    .map((link) => ({ ...link, url: normalizeUrl(link.url) }));
}

function buildSkillList(
  groups: Array<{ category: string; skills: string[] }>,
  otherSkill?: string
) {
  const skills = groups.flatMap((group) => group.skills);
  if (otherSkill?.trim()) skills.push(otherSkill.trim());
  return Array.from(new Set(skills));
}

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db
      .query("freelancerApplications")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .collect();

    return await Promise.all(
      applications.map(async (application) => {
        const photoUrl = application.photoStorageId
          ? await ctx.storage.getUrl(application.photoStorageId)
          : null;

        return {
          ...application,
          id: application._id,
          photoUrl,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    fullName: v.string(),
    photoStorageId: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    behanceUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    workLinks: v.optional(v.array(workLinkValidator)),
    roleCategories: v.array(v.string()),
    roleSkills: v.array(roleSkillValidator),
    otherSkill: v.optional(v.string()),
    experienceNotes: v.optional(v.string()),
    availability: v.optional(v.string()),
    expectedRate: v.optional(v.string()),
    bestFitWorkType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fullName = args.fullName.trim();
    const roleCategories = cleanArray(args.roleCategories);
    const roleSkills = cleanRoleSkills(args.roleSkills);
    const workLinks = cleanWorkLinks(args.workLinks);

    if (!fullName) throw new Error("Full name is required");
    if (!args.email?.trim() && !args.whatsapp?.trim()) {
      throw new Error("Email or WhatsApp is required");
    }
    if (roleCategories.length === 0) {
      throw new Error("Select at least one role category");
    }

    return await ctx.db.insert("freelancerApplications", {
      fullName,
      photoStorageId: args.photoStorageId,
      email: args.email?.trim() || undefined,
      whatsapp: args.whatsapp?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      location: args.location?.trim() || undefined,
      portfolioUrl: args.portfolioUrl?.trim() || undefined,
      behanceUrl: args.behanceUrl?.trim() || undefined,
      linkedinUrl: args.linkedinUrl?.trim() || undefined,
      workLinks,
      roleCategories,
      roleSkills,
      otherSkill: args.otherSkill?.trim() || undefined,
      experienceNotes: args.experienceNotes?.trim() || undefined,
      availability: args.availability?.trim() || undefined,
      expectedRate: args.expectedRate?.trim() || undefined,
      bestFitWorkType: args.bestFitWorkType?.trim() || undefined,
      status: "PENDING",
      submittedAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: { id: v.id("freelancerApplications") },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("Application not found");
    if (application.status !== "PENDING") {
      throw new Error("Application already reviewed");
    }

    const skills = buildSkillList(application.roleSkills, application.otherSkill);
    const now = Date.now();
    const memberId = await ctx.db.insert("teamMembers", {
      fullName: application.fullName,
      photoStorageId: application.photoStorageId,
      phone: application.phone,
      whatsapp: application.whatsapp,
      email: application.email,
      roleTitle: application.roleCategories[0],
      roleCategories: application.roleCategories,
      roleSkills: application.roleSkills,
      otherSkill: application.otherSkill,
      portfolioUrl: application.portfolioUrl,
      behanceUrl: application.behanceUrl,
      linkedinUrl: application.linkedinUrl,
      workLinks: application.workLinks,
      location: application.location,
      type: "FREELANCER",
      status: "ACTIVE",
      department: "Freelance",
      startDate: now,
      availability: application.availability,
      expectedRate: application.expectedRate,
      bestFitWorkType: application.bestFitWorkType,
      compensationMode: "PROJECT_BASED",
      skills,
      performanceNotes: application.experienceNotes,
    });

    await ctx.db.patch(args.id, {
      status: "APPROVED",
      reviewedAt: now,
      approvedTeamMemberId: memberId,
    });

    return memberId;
  },
});

export const reject = mutation({
  args: { id: v.id("freelancerApplications") },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("Application not found");
    if (application.status !== "PENDING") {
      throw new Error("Application already reviewed");
    }

    await ctx.db.patch(args.id, {
      status: "REJECTED",
      reviewedAt: Date.now(),
    });
  },
});
