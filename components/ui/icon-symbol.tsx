// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  // App-specific
  'fork.knife': 'restaurant',
  'calendar': 'calendar-today',
  'lightbulb': 'lightbulb',
  'doc.richtext': 'picture-as-pdf',
  'plus': 'add',
  'trash': 'delete',
  'trash.fill': 'delete',
  'square.and.arrow.up': 'share',
  'star.fill': 'star',
  'magnifyingglass': 'search',
  'line.3.horizontal.decrease': 'filter-list',
  'arrow.up.arrow.down': 'swap-vert',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle': 'warning',
  'info.circle': 'info',
  'wand.and.stars': 'auto-awesome',
  'arrow.clockwise': 'refresh',
  'link': 'link',
  'doc.on.clipboard': 'content-paste',
  'shuffle': 'shuffle',
  'moon.stars.fill': 'nights-stay',
  'fork.knife.circle': 'restaurant',
  'person.crop.circle': 'account-circle',
  'person.crop.circle.fill': 'account-circle',
  'arrow.right.square': 'logout',
  'sparkles': 'auto-awesome',
  'calendar.badge.checkmark': 'event-available',
  'square.and.arrow.up.fill': 'share',
  'doc.text': 'description',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
