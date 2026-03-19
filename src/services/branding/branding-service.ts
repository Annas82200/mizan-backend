/**
 * Branding Service — Full white-label engine for per-tenant customization
 *
 * Manages: logos, colors, fonts, custom domains, email templates.
 * At runtime, CSS variables are injected to completely rebrand the platform.
 */

import { db } from '../../../db/index';
import { tenantBranding, brandAssets, customDomains } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { cacheGetOrSet, invalidateCache } from '../../infrastructure/redis';

export interface BrandingConfig {
  companyName: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  fontFamilySans: string;
  fontFamilyDisplay: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  sidebarLogoUrl: string | null;
  loginBackgroundUrl: string | null;
  customCss: string | null;
  showPoweredBy: boolean;
}

/**
 * Convert hex color to HSL values for CSS variables (Tailwind-compatible)
 */
function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export class BrandingService {
  /**
   * Get branding config for a tenant (with Redis caching)
   */
  async getBranding(tenantId: string): Promise<BrandingConfig> {
    return cacheGetOrSet<BrandingConfig>(
      `branding:${tenantId}`,
      async () => {
        const rows = await db
          .select()
          .from(tenantBranding)
          .where(eq(tenantBranding.tenantId, tenantId))
          .limit(1);

        if (rows.length === 0) {
          return this.getDefaultBranding();
        }

        const brand = rows[0];
        return {
          companyName: brand.companyName,
          primaryColor: brand.primaryColor || '#3d3d4e',
          secondaryColor: brand.secondaryColor || '#555555',
          accentColor: brand.accentColor || '#cc9a00',
          backgroundColor: brand.backgroundColor || '#fafafa',
          surfaceColor: brand.surfaceColor || '#ffffff',
          textPrimaryColor: brand.textPrimaryColor || '#1a1a2e',
          textSecondaryColor: brand.textSecondaryColor || '#6b7280',
          fontFamilySans: brand.fontFamilySans || 'Inter',
          fontFamilyDisplay: brand.fontFamilyDisplay || 'Playfair Display',
          logoUrl: brand.logoUrl,
          logoDarkUrl: brand.logoDarkUrl,
          faviconUrl: brand.faviconUrl,
          sidebarLogoUrl: brand.sidebarLogoUrl,
          loginBackgroundUrl: brand.loginBackgroundUrl,
          customCss: brand.customCss,
          showPoweredBy: brand.showPoweredBy ?? false,
        };
      },
      86400 // Cache for 24 hours (branding rarely changes)
    );
  }

  /**
   * Generate CSS variables for runtime injection in the frontend
   */
  async getCSSVariables(tenantId: string): Promise<string> {
    const brand = await this.getBranding(tenantId);

    return `:root {
  --brand-primary: ${hexToHSL(brand.primaryColor)};
  --brand-secondary: ${hexToHSL(brand.secondaryColor)};
  --brand-accent: ${hexToHSL(brand.accentColor)};
  --brand-background: ${hexToHSL(brand.backgroundColor)};
  --brand-surface: ${hexToHSL(brand.surfaceColor)};
  --brand-text-primary: ${hexToHSL(brand.textPrimaryColor)};
  --brand-text-secondary: ${hexToHSL(brand.textSecondaryColor)};
  --brand-font-sans: '${brand.fontFamilySans}', system-ui, sans-serif;
  --brand-font-display: '${brand.fontFamilyDisplay}', Georgia, serif;
}`;
  }

  /**
   * Update branding for a tenant
   */
  async updateBranding(tenantId: string, updates: Partial<BrandingConfig>): Promise<BrandingConfig> {
    const existing = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    if (existing.length === 0) {
      // Create new branding record
      await db.insert(tenantBranding).values({
        tenantId,
        ...updates,
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(tenantBranding)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    // Invalidate cache
    await invalidateCache(`branding:${tenantId}`);

    return this.getBranding(tenantId);
  }

  /**
   * Verify a custom domain (check DNS records)
   */
  async verifyCustomDomain(tenantId: string, domain: string): Promise<{
    verified: boolean;
    message: string;
    dnsRecords: Array<{ type: string; name: string; value: string }>;
  }> {
    // Generate verification token
    const verificationToken = `mizan-verify-${tenantId.substring(0, 8)}`;

    const dnsRecords = [
      { type: 'CNAME', name: domain, value: 'custom.mizan.app' },
      { type: 'TXT', name: `_mizan.${domain}`, value: verificationToken },
    ];

    // Store domain record
    const existing = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.domain, domain))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(customDomains).values({
        tenantId,
        domain,
        verificationToken,
        dnsRecords,
        status: 'pending',
      });
    }

    return {
      verified: false,
      message: 'Please add the following DNS records to verify domain ownership',
      dnsRecords,
    };
  }

  private getDefaultBranding(): BrandingConfig {
    return {
      companyName: null,
      primaryColor: '#3d3d4e',
      secondaryColor: '#555555',
      accentColor: '#cc9a00',
      backgroundColor: '#fafafa',
      surfaceColor: '#ffffff',
      textPrimaryColor: '#1a1a2e',
      textSecondaryColor: '#6b7280',
      fontFamilySans: 'Inter',
      fontFamilyDisplay: 'Playfair Display',
      logoUrl: null,
      logoDarkUrl: null,
      faviconUrl: null,
      sidebarLogoUrl: null,
      loginBackgroundUrl: null,
      customCss: null,
      showPoweredBy: false,
    };
  }
}
