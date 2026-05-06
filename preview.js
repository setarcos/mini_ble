require('dotenv').config();
const ci = require('miniprogram-ci');
const fs = require('fs');

(async () => {
  // 读取 project.config.json
  const configPath = 'project.config.json';
  let config = {};
  let originalAppid = '';

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
    originalAppid = config.appid || '';

    // 如果环境变量中有 APPID，临时替换
    if (process.env.APPID) {
      config.appid = process.env.APPID;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('临时替换 appid 为:', process.env.APPID);
    }
  } catch (err) {
    console.warn('读取 project.config.json 失败:', err.message);
  }

  const project = new ci.Project({
    appid: process.env.APPID,
    type: 'miniProgram',
    projectPath: process.cwd(),
    privateKeyPath: 'key/private.key',
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

  // 恢复 project.config.json
  try {
    if (originalAppid !== '') {
      config.appid = originalAppid;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('已恢复 appid 为:', originalAppid);
    }
  } catch (err) {
    console.warn('恢复 project.config.json 失败:', err.message);
  }
})();
