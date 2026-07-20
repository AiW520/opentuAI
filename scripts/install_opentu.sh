#!/usr/bin/env bash
set -euo pipefail

# 当脚本作为 Release Asset 上传时，CI 会把 DEFAULT_REPO 替换为实际发布仓库。
# 通过 raw.githubusercontent.com 直接拉取的版本会保留这里的占位默认值，
# 用户可以用 OPENTU_REPO=用户名/仓库名 显式覆盖。
DEFAULT_REPO="tuziapi/opentu"
REPO="${OPENTU_REPO:-$DEFAULT_REPO}"
TAG="${OPENTU_TAG:-latest}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64|aarch64) FILE="Opentu-macos-aarch64.dmg" ;;
      x86_64)        FILE="Opentu-macos-x86_64.dmg" ;;
      *)
        echo "不支持的 macOS 架构: $ARCH" >&2
        echo "请到 https://github.com/${REPO}/releases 手动下载。" >&2
        exit 1
        ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64|amd64)  FILE="Opentu-linux-x86_64.AppImage" ;;
      aarch64|arm64) FILE="Opentu-linux-aarch64.AppImage" ;;
      *)
        echo "不支持的 Linux 架构: $ARCH" >&2
        echo "请到 https://github.com/${REPO}/releases 手动下载。" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "不支持的系统: $OS" >&2
    echo "请到 https://github.com/${REPO}/releases 手动下载。" >&2
    exit 1
    ;;
esac

if [[ "$TAG" == "latest" ]]; then
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${FILE}"
else
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${FILE}"
fi

echo "正在从 ${REPO} 下载 ${FILE} (${TAG}) ..."
if ! curl -fL "$DOWNLOAD_URL" -o "$TMP_DIR/$FILE"; then
  echo "" >&2
  echo "下载失败: $DOWNLOAD_URL" >&2
  echo "" >&2
  echo "请检查:" >&2
  echo "  1. 标签 ${TAG} 是否在 https://github.com/${REPO}/releases 存在" >&2
  echo "  2. 是否需要切换仓库: OPENTU_REPO=用户名/仓库名" >&2
  echo "  3. 网络是否能访问 github.com" >&2
  echo "" >&2
  exit 1
fi

CHECKSUM_URL="${DOWNLOAD_URL}.sha256"
if curl -fsSL "$CHECKSUM_URL" -o "$TMP_DIR/$FILE.sha256"; then
  if command -v shasum >/dev/null 2>&1; then
    (cd "$TMP_DIR" && shasum -a 256 -c "$FILE.sha256")
  elif command -v sha256sum >/dev/null 2>&1; then
    (cd "$TMP_DIR" && sha256sum -c "$FILE.sha256")
  else
    echo "未找到 SHA-256 校验工具，停止安装。" >&2
    exit 1
  fi
else
  echo "正式发布资产缺少 SHA-256 校验文件: $CHECKSUM_URL" >&2
  exit 1
fi

case "$(echo "$FILE" | tr '[:upper:]' '[:lower:]')" in
  *.dmg)
    MOUNT_DIR="$(mktemp -d)"
    hdiutil attach "$TMP_DIR/$FILE" -mountpoint "$MOUNT_DIR" -nobrowse -quiet
    app_path="$(find "$MOUNT_DIR" -name '*.app' -maxdepth 1 | head -n 1)"
    if [[ -z "${app_path:-}" ]]; then
      hdiutil detach "$MOUNT_DIR" -quiet || true
      echo "DMG 中未找到 .app" >&2
      exit 1
    fi
    dest_dir="/Applications"
    [[ ! -w "$dest_dir" ]] && dest_dir="$HOME/Applications"
    mkdir -p "$dest_dir"
    app_name="$(basename "$app_path")"
    rm -rf "$dest_dir/$app_name"
    ditto "$app_path" "$dest_dir/$app_name"
    hdiutil detach "$MOUNT_DIR" -quiet || true
    echo "已安装到 $dest_dir/$app_name"
    echo "应用已通过发布签名与完整性校验；若 macOS 拒绝启动，请停止使用并反馈 Release 信息。"
    ;;
  *.appimage)
    install_root="$HOME/.local/share/opentu"
    bin_root="$HOME/.local/bin"
    install_path="$install_root/opentu.AppImage"
    mkdir -p "$install_root" "$bin_root"
    mv "$TMP_DIR/$FILE" "$install_path"
    chmod +x "$install_path"
    ln -sf "$install_path" "$bin_root/opentu"
    echo "已安装到 $install_path"
    echo "已创建符号链接 $bin_root/opentu"
    echo ""
    echo "AppImage 运行需要系统具备 FUSE 支持。如果启动报错:"
    echo "  - Ubuntu/Debian: sudo apt install libfuse2"
    echo "  - Fedora/RHEL:   sudo dnf install fuse fuse-libs"
    echo "另外还需要 libwebkit2gtk-4.1，多数发行版默认未安装:"
    echo "  - Ubuntu 22.04+: sudo apt install libwebkit2gtk-4.1-0"
    echo "  - 老系统可能要自行编译或升级发行版"
    echo ""
    echo "确保 $bin_root 在 PATH 中后，可直接运行: opentu"
    ;;
esac
