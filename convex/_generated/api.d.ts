/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clients from "../clients.js";
import type * as dashboard from "../dashboard.js";
import type * as files from "../files.js";
import type * as finance from "../finance.js";
import type * as leads from "../leads.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as reimbursements from "../reimbursements.js";
import type * as salesTargets from "../salesTargets.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as team from "../team.js";
import type * as templates from "../templates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clients: typeof clients;
  dashboard: typeof dashboard;
  files: typeof files;
  finance: typeof finance;
  leads: typeof leads;
  notifications: typeof notifications;
  projects: typeof projects;
  reimbursements: typeof reimbursements;
  salesTargets: typeof salesTargets;
  seed: typeof seed;
  settings: typeof settings;
  tasks: typeof tasks;
  team: typeof team;
  templates: typeof templates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
