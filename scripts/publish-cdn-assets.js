#!/usr/bin/env node

/**
 * CDN 静态资源发布脚本
 * 
 * 只发布静态资源到 npm，不包含 HTML 文件
 * 
 * 安全特性：
 * - 不上传 HTML 文件（避免用户配置泄露）
 * - 不上传 source maps
 * - 不上传敏感配置文件
 * 
 * 用法：
 *   node scripts/publish-cdn-assets.js [--dry-run] [--skip-build] [--otp=123456]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  packageName: 'aitu-app',
  distDir: path.resolve(__dirname, '../dist/apps/web'),
  cdnDir: path.resolve(__dirname, '../dist/deploy/cdn'),
  rootPackageJson: path.resolve(__dirname, '../package.json'),
  // 不上传到 CDN 的文件
  excludePatterns: [
    /\.html$/,           // HTML 文件
    /\.map$/,            // Source maps
    /^init\.json$/,      // 初始化配置
    /^stats\.html$/,     // 构建分析
    /deploy-info\.json/, // 部署信息
  ],
};

// 解析命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipBuild = args.includes('--skip-build');
const otpArg = args.find(arg => arg.startsWith('--otp='));
const otp = otpArg ? otpArg.split('=')[1] : null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

// 执行命令
function exec(command, options = {}) {
  log(`  执行: ${command}`, 'yellow');
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    logError(`命令执行失败: ${command}`);
    return false;
  }
}

// 读取版本号
function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(CONFIG.rootPackageJson, 'utf-8'));
  return pkg.version;
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 检查是否应该排除
function shouldExclude(filename) {
  return CONFIG.excludePatterns.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(filename);
    }
    return filename === pattern;
  });
}

// 复制文件（排除敏感文件）
function copyFilteredFiles(src, dest) {
  ensureDir(dest);
  let copied = 0;
  let excluded = 0;
  
  function processDir(srcDir, destDir, relativePath = '') {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        ensureDir(destPath);
        processDir(srcPath, destPath, relPath);
      } else {
        if (shouldExclude(entry.name)) {
          excluded++;
          // log(`  排除: ${relPath}`);
        } else {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        }
      }
    }
  }
  
  processDir(src, dest);
  return { copied, excluded };
}

// 生成 npm package.json
function generateNpmPackageJson(version) {
  return {
    name: CONFIG.packageName,
    version: version,
    description: 'Opentu static assets for CDN deployment (HTML files not included for security)',
    keywords: [
      'aitu',
      'whiteboard',
      'assets',
      'cdn',
    ],
    homepage: 'https://opentu.ai',
    repository: {
      type: 'git',
      url: 'https://github.com/tuziapi/opentu.git'
    },
    license: 'MIT',
    author: 'ljquan',
    files: ['**/*'],
    publishConfig: {
      access: 'public'
    },
    // 标记这是纯静态资源包
    aituAssets: {
      type: 'cdn-assets',
      htmlIncluded: false,
      note: 'This package contains only static assets (JS, CSS, images, fonts). HTML files are served from your own server for security.'
    }
  };
}

// 生成 README
function generateReadme(version) {
  return `# Opentu CDN Assets

> ⚠️ **安全说明**: 此包仅包含静态资源（JS、CSS、图片、字体），不包含 HTML 文件。HTML 文件应从你自己的服务器提供。

## 版本

当前版本: **${version}**

## CDN 访问

### unpkg
\`\`\`
https://unpkg.com/${CONFIG.packageName}@${version}/assets/index-xxx.js
https://unpkg.com/${CONFIG.packageName}@${version}/assets/index-xxx.css
\`\`\`

### jsDelivr
\`\`\`
https://cdn.jsdelivr.net/npm/${CONFIG.packageName}@${version}/assets/index-xxx.js
https://cdn.jsdelivr.net/npm/${CONFIG.packageName}@${version}/assets/index-xxx.css
\`\`\`

## 使用方式

1. 从你的服务器提供 HTML 文件
2. 修改 HTML 中的资源路径指向 CDN
3. 用户访问你的域名，静态资源从 CDN 加载

## 包含的文件

- \`/assets/\` - JS 和 CSS 文件
- \`/icons/\` - 图标文件
- \`/manifest.json\` - PWA 配置

## 不包含的文件

- \`*.html\` - HTML 文件（安全考虑）
- \`*.map\` - Source maps

## 许可证

MIT License
`;
}

// 主流程
async function main() {
  log('\n🚀 CDN 静态资源发布脚本\n', 'cyan');
  
  if (isDryRun) {
    log('⚠️  DRY RUN 模式 - 不会实际发布\n', 'yellow');
  }
  
  const version = getVersion();
  log(`📦 版本: ${version}`, 'cyan');
  
  // 步骤 1: 构建
  if (!skipBuild) {
    logStep('1/4', '构建项目');
    if (!exec('npm run build:web', { cwd: path.resolve(__dirname, '..') })) {
      logError('构建失败');
      process.exit(1);
    }
    logSuccess('构建完成');
  } else {
    logStep('1/4', '跳过构建');
  }
  
  // 检查构建产物
  if (!fs.existsSync(CONFIG.distDir)) {
    logError(`构建目录不存在: ${CONFIG.distDir}`);
    process.exit(1);
  }
  
  // 步骤 2: 准备 CDN 目录
  logStep('2/4', '准备 CDN 发布目录');
  
  if (fs.existsSync(CONFIG.cdnDir)) {
    fs.rmSync(CONFIG.cdnDir, { recursive: true });
  }
  ensureDir(CONFIG.cdnDir);
  
  // 复制文件（排除敏感文件）
  const { copied, excluded } = copyFilteredFiles(CONFIG.distDir, CONFIG.cdnDir);
  logSuccess(`复制 ${copied} 个文件，排除 ${excluded} 个敏感文件`);
  
  // 步骤 3: 生成 package.json 和 README
  logStep('3/4', '生成 npm 发布文件');
  
  const npmPackage = generateNpmPackageJson(version);
  fs.writeFileSync(
    path.join(CONFIG.cdnDir, 'package.json'),
    JSON.stringify(npmPackage, null, 2)
  );
  logSuccess('生成 package.json');
  
  const readme = generateReadme(version);
  fs.writeFileSync(path.join(CONFIG.cdnDir, 'README.md'), readme);
  logSuccess('生成 README.md');
  
  // 列出排除的文件类型
  log('\n📋 排除的文件类型:', 'cyan');
  log('  - *.html (HTML 文件)');
  log('  - *.map (Source maps)');
  
  // 步骤 4: 发布
  logStep('4/4', '发布到 npm');
  
  if (isDryRun) {
    log('\n📦 DRY RUN - 将要发布的内容:', 'yellow');
    exec(`ls -la "${CONFIG.cdnDir}"`);
    log('\n📄 package.json:', 'yellow');
    console.log(JSON.stringify(npmPackage, null, 2));
  } else {
    let publishCmd = `cd "${CONFIG.cdnDir}" && npm publish --access public --registry https://registry.npmjs.org`;
    
    if (otp) {
      publishCmd += ` --otp=${otp}`;
      log(`  使用 OTP: ${otp.slice(0, 2)}****`);
    }
    
    if (!exec(publishCmd)) {
      logError('发布失败');
      if (!otp) {
        log('\n💡 提示：如果启用了 2FA，请使用 --otp=123456 参数', 'yellow');
      }
      process.exit(1);
    }
    logSuccess('发布成功！');
  }
  
  // 输出访问链接
  log('\n' + '═'.repeat(50), 'green');
  log('🎉 完成！', 'green');
  log('═'.repeat(50), 'green');
  log('\n📌 CDN 访问地址:', 'cyan');
  log(`   unpkg:     https://unpkg.com/${CONFIG.packageName}@${version}/`);
  log(`   jsdelivr:  https://cdn.jsdelivr.net/npm/${CONFIG.packageName}@${version}/`);
  
  log('\n📝 下一步:', 'yellow');
  log('  1. 在你的服务器上部署 HTML 文件');
  log('  2. 修改 HTML 中的资源路径指向 CDN');
  log('  3. 或使用 build-hybrid.js 自动处理\n');
}

main().catch(error => {
  logError(`脚本执行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
