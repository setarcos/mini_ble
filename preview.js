require('dotenv').config();
const ci = require('miniprogram-ci');

(async () => {
  const project = new ci.Project({
    appid: process.env.APPID,
    type: 'miniProgram',
    projectPath: process.cwd(),
    privateKeyPath: 'key/private.wxa9d13c0e644c1707.key',
    ignores: [
      'node_modules/**/*',      // 忽略node_modules
      'upload.js',              // 忽略上传脚本
      'preview.js',             // 忽略预览脚本
      'key/*',                  // 忽略所有密钥文件（安全考虑）
      '*.md',                   // 忽略文档文件
      '.git/**/*',              // 忽略git目录
      '*.log',                  // 忽略日志文件
    ],
  });

  const previewResult = await ci.preview({
    project,
    version: '1.2.1',
    desc: '预览测试',
    setting: {
      es6: true,
      minify: true,
    },
    qrcodeFormat: 'image',
    qrcodeOutputDest: './preview.jpg',
  });

  console.log('预览二维码已生成: ./preview.jpg');
})();
