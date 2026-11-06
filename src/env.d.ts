interface ImportMetaEnv {
  /** GoatCounter site code (the "xyz" in xyz.goatcounter.com). Analytics stay off without it. */
  readonly VITE_GOATCOUNTER_CODE?: string
  /** Cloudflare Web Analytics site token. Off without it. */
  readonly VITE_CF_ANALYTICS_TOKEN?: string
  /** AdSense publisher ID (ca-pub-…). No ads without it. */
  readonly VITE_ADSENSE_CLIENT?: string
  /** AdSense ad unit IDs: below the calculator, and below the filing guide. */
  readonly VITE_ADSENSE_SLOT_CALCULATOR?: string
  readonly VITE_ADSENSE_SLOT_FILING?: string
}
