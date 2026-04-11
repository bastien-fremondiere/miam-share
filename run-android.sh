#!/usr/bin/env bash
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

AVD="Pixel_7"

# ── 1. Start emulator headlessly if not already running ──────────────────────
if adb devices 2>/dev/null | grep -q "emulator"; then
  echo "✅ Emulator already running"
else
  echo "🚀 Starting $AVD headlessly..."
  "$ANDROID_HOME/emulator/emulator" "@$AVD" \
    -gpu off \
    -no-snapshot-load \
    -no-audio \
    > /tmp/emu-"$AVD".log 2>&1 &
  echo "   PID $! — logs at /tmp/emu-$AVD.log"
fi

# ── 2. Wait for full boot ─────────────────────────────────────────────────────
echo "⏳ Waiting for Android to finish booting..."
adb wait-for-device > /dev/null 2>&1

for i in $(seq 1 60); do
  BOOTED=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
  if [[ "$BOOTED" == "1" ]]; then
    echo "✅ Android booted!"
    break
  fi
  echo -n "."
  sleep 3
done

if [[ "$BOOTED" != "1" ]]; then
  echo ""
  echo "❌ Emulator did not boot in time. Check /tmp/emu-$AVD.log"
  exit 1
fi
echo ""

# ── 3. Dismiss lock screen ────────────────────────────────────────────────────
adb shell input keyevent 82 2>/dev/null || true
sleep 1

# ── 4. Build and install ──────────────────────────────────────────────────────
echo "🔨 Building and installing app..."
npx expo run:android --no-bundler || npx expo run:android
