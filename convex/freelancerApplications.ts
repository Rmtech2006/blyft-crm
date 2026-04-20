import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING_REVIEW_RESULTS = 100;
const MAX_WORK_LINKS = 8;
const MAX_ROLE_CATEGORIES = 20;
const MAX_SKILLS_PER_CATEGORY = 30;

const TEXT_LIMITS = {
  fullName: 120,
  contact: 180,
  location: 120,
  linkLabel: 80,
  linkUrl: 500,
  storageId: 200,
  roleCategory: 80,
  skill: 80,
  otherSkill: 120,
  experienceNotes: 1200,
  availability: 160,
  expectedRate: 120,
  bestFitWorkType: 180,
};

const roleSkillValidator = v.object({
  category: v.string(),
  skills: v.array(v.string()),
});

const workLinkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

function cleanOptionalText(value: string | undefined, label: string, maxLength: number) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) {
    throw new Error(`${label} is too long`);
  }
  return trimmed;
}

function cleanRequiredText(value: string, label: string, maxLength: number) {
  const trimmed = cleanOptionalText(value, label, maxLength);
  if (!trimmed) throw new Error(`${label} is required`);
  return trimmed;
}

function cleanStringArray(values: string[], label: string, maxItems: number, maxLength: number) {
  if (values.length > maxItems) {
    throw new Error(`Too many ${label.toLowerCase()} entries`);
  }

  return values
    .map((value) => cleanOptionalText(value, label, maxLength))
    .filter((value): value is string => Boolean(value));
}

function normalizeEmail(value: string | undefined) {
  return cleanOptionalText(value, "Email", TEXT_LIMITS.contact)?.toLowerCase();
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function cleanRoleSkills(groups: Array<{ category: string; skills: string[] }>) {
  if (groups.length > MAX_ROLE_CATEGORIES) {
    throw new Error("Too many role category entries");
  }

  return groups
    .map((group) => ({
      category: cleanOptionalText(group.category, "Role category", TEXT_LIMITS.roleCategory),
      skills: cleanStringArray(group.skills, "Skill", MAX_SKILLS_PER_CATEGORY, TEXT_LIMITS.skill),
    }))
    .filter((group): group is { category: string; skills: string[] } => Boolean(group.category));
}

function cleanWorkLinks(links?: Array<{ label: string; url: string }>) {
  if ((links ?? []).length > MAX_WORK_LINKS) {
    throw new Error("Too many work links");
  }

  return (links ?? [])
    .map((link) => ({
      label: cleanOptionalText(link.label, "Link label", TEXT_LIMITS.linkLabel) || "Work link",
      url: cleanOptionalText(link.url, "Link URL", TEXT_LIMITS.linkUrl),
    }))
    .filter((link) => link.url)
    .map((link) => ({ ...link, url: normalizeUrl(link.url!) }));
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
    await requireRole(ctx, ["SUPER_ADMIN"]);

    const applications = await ctx.db
      .query("freelancerApplications")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .take(MAX_PENDING_REVIEW_RESULTS);

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
    companyWebsite: v.optional(v.string()),
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
    if (args.companyWebsite?.trim()) {
      throw new Error("Could not submit application. Please try again.");
    }

    const now = Date.now();
    const fullName = cleanRequiredText(args.fullName, "Full name", TEXT_LIMITS.fullName);
    const email = normalizeEmail(args.email);
    const whatsapp = cleanOptionalText(args.whatsapp, "WhatsApp", TEXT_LIMITS.contact);
    const roleCategories = cleanStringArray(
      args.roleCategories,
      "Role category",
      MAX_ROLE_CATEGORIES,
      TEXT_LIMITS.roleCategory
    );
    const roleSkills = cleanRoleSkills(args.roleSkills);
    const workLinks = cleanWorkLinks(args.workLinks);

    if (!email && !whatsapp) {
      throw new Error("Email or WhatsApp is required");
    }
    if (roleCategories.length === 0) {
      throw new Error("Select at least one role category");
    }

    const recentPending = await ctx.db
      .query("freelancerApplications")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .take(50);

    const hasRecentDuplicate = recentPending.some((application) => {
      if (now - application.submittedAt > ONE_DAY_MS) return false;
      return Boolean(
        (email && application.email?.toLowerCase() === email) ||
        (whatsapp && application.whatsapp === whatsapp)
      );
    });

    if (hasRecentDuplicate) {
      throw new Error("Application already received recently");
    }

    return await ctx.db.insert("freelancerApplications", {
      fullName,
      photoStorageId: cleanOptionalText(args.photoStorageId, "Photo storage ID", TEXT_LIMITS.storageId),
      email,
      whatsapp,
      phone: cleanOptionalText(args.phone, "Phone", TEXT_LIMITS.contact),
      location: cleanOptionalText(args.location, "Location", TEXT_LIMITS.location),
      portfolioUrl: cleanOptionalText(args.portfolioUrl, "Portfolio URL", TEXT_LIMITS.linkUrl),
      behanceUrl: cleanOptionalText(args.behanceUrl, "Behance URL", TEXT_LIMITS.linkUrl),
      linkedinUrl: cleanOptionalText(args.linkedinUrl, "LinkedIn URL", TEXT_LIMITS.linkUrl),
      workLinks,
      roleCategories,
      roleSkills,
      otherSkill: cleanOptionalText(args.otherSkill, "Other skill", TEXT_LIMITS.otherSkill),
      experienceNotes: cleanOptionalText(args.experienceNotes, "Experience notes", TEXT_LIMITS.experienceNotes),
      availability: cleanOptionalText(args.availability, "Availability", TEXT_LIMITS.availability),
      expectedRate: cleanOptionalText(args.expectedRate, "Expected rate", TEXT_LIMITS.expectedRate),
      bestFitWorkType: cleanOptionalText(args.bestFitWorkType, "Best-fit work type", TEXT_LIMITS.bestFitWorkType),
      status: "PENDING",
      submittedAt: now,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("freelancerApplications") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["SUPER_ADMIN"]);

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
    await requireRole(ctx, ["SUPER_ADMIN"]);

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
