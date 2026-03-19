import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const domainStatusEnum = pgEnum('domain_status', ['pending', 'verified', 'failed', 'active']);
export const assetTypeEnum = pgEnum('brand_asset_type', ['logo', 'favicon', 'login_bg', 'sidebar_logo', 'email_header', 'email_footer', 'custom']);

export const tenantBranding = pgTable('tenant_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().unique(),
  companyName: varchar('company_name', { length: 255 }),
  // Colors (stored as hex)
  primaryColor: varchar('primary_color', { length: 7 }).default('#3d3d4e'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#555555'),
  accentColor: varchar('accent_color', { length: 7 }).default('#cc9a00'),
  backgroundColor: varchar('background_color', { length: 7 }).default('#fafafa'),
  surfaceColor: varchar('surface_color', { length: 7 }).default('#ffffff'),
  textPrimaryColor: varchar('text_primary_color', { length: 7 }).default('#1a1a2e'),
  textSecondaryColor: varchar('text_secondary_color', { length: 7 }).default('#6b7280'),
  // Typography
  fontFamilySans: varchar('font_family_sans', { length: 255 }).default('Inter'),
  fontFamilyDisplay: varchar('font_family_display', { length: 255 }).default('Playfair Display'),
  // Assets
  logoUrl: varchar('logo_url', { length: 1024 }),
  logoDarkUrl: varchar('logo_dark_url', { length: 1024 }),
  faviconUrl: varchar('favicon_url', { length: 1024 }),
  sidebarLogoUrl: varchar('sidebar_logo_url', { length: 1024 }),
  loginBackgroundUrl: varchar('login_background_url', { length: 1024 }),
  // Email branding
  emailFromName: varchar('email_from_name', { length: 255 }),
  emailFromAddress: varchar('email_from_address', { length: 255 }),
  emailHeaderHtml: text('email_header_html'),
  emailFooterHtml: text('email_footer_html'),
  // Custom CSS overrides (advanced)
  customCss: text('custom_css'),
  // Layout preferences
  sidebarStyle: varchar('sidebar_style', { length: 50 }).default('default'), // default, compact, minimal
  dashboardLayout: varchar('dashboard_layout', { length: 50 }).default('default'),
  // Feature visibility
  showPoweredBy: boolean('show_powered_by').default(false),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const brandAssets = pgTable('brand_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  brandingId: uuid('branding_id').notNull().references(() => tenantBranding.id, { onDelete: 'cascade' }),
  assetType: assetTypeEnum('asset_type').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 1024 }).notNull(),
  fileSize: varchar('file_size', { length: 50 }),
  mimeType: varchar('mime_type', { length: 100 }),
  metadata: jsonb('metadata').default('{}'),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customDomains = pgTable('custom_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  status: domainStatusEnum('status').notNull().default('pending'),
  sslCertificateId: varchar('ssl_certificate_id', { length: 255 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  verifiedAt: timestamp('verified_at'),
  dnsRecords: jsonb('dns_records').default('[]'), // [{type, name, value}]
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const tenantBrandingRelations = relations(tenantBranding, ({ many }) => ({
  assets: many(brandAssets),
}));

export const brandAssetsRelations = relations(brandAssets, ({ one }) => ({
  branding: one(tenantBranding, { fields: [brandAssets.brandingId], references: [tenantBranding.id] }),
}));
