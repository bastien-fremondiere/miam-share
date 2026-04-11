import { Platform } from 'react-native';

// ── Brand Palette ──────────────────────────────────────────────────────────
export const Brand = {
  /** Warm cooking-fire orange — primary CTA, accents */
  primary: '#E8652A',
  /** Herb garden green — success, secondary actions */
  secondary: '#2D9B52',
  /** Saffron / golden spice — accent highlight */
  accent: '#F5A623',
  /** Soft destructive red */
  danger: '#E53935',
} as const;

// ── Semantic Colours (light / dark) ───────────────────────────────────────
export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6C6C70',
    background: '#FBF7F4',
    surface: '#FFFFFF',
    border: '#E5E5EA',
    tint: Brand.primary,
    icon: '#6C6C70',
    tabIconDefault: '#8E8E93',
    tabIconSelected: Brand.primary,
  },
  dark: {
    text: '#F2F2F7',
    textSecondary: '#AEAEB2',
    background: '#1C1C1E',
    surface: '#2C2C2E',
    border: '#3A3A3C',
    tint: Brand.primary,
    icon: '#AEAEB2',
    tabIconDefault: '#636366',
    tabIconSelected: Brand.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
