"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export all schema tables and relations
__exportStar(require("./schema/core"), exports); // Core: tenants, users, departments, sessions
__exportStar(require("./schema/strategy"), exports);
__exportStar(require("./schema/culture"), exports); // Culture: assessments, frameworks
__exportStar(require("./schema/skills"), exports); // Skills: reports, taxonomies, employee skills
__exportStar(require("./schema/performance"), exports); // Performance: goals, reviews, 1-on-1s, talent profiles
__exportStar(require("./schema/agents"), exports);
__exportStar(require("./schema/benchmarking"), exports); // Benchmarking: industry benchmarks, tenant metrics
__exportStar(require("./schema/triggers"), exports);
__exportStar(require("./schema/learning"), exports);
__exportStar(require("./schema/lxp-extended"), exports); // LXP: courses, enrollments, legacy tables
__exportStar(require("./schema/hiring"), exports); // Hiring: requisitions, candidates, interviews
__exportStar(require("./schema/audit"), exports);
__exportStar(require("./schema/payments"), exports); // Payments: subscriptions, demo requests
__exportStar(require("./schema/social-media"), exports); // Social Media: accounts, posts, campaigns
__exportStar(require("./schema/workflows"), exports); // Workflows: automation, actions
__exportStar(require("./schema/consulting"), exports); // Consulting: requests, consultants
//# sourceMappingURL=schema.js.map