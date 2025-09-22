const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const outDir = path.join(__dirname, 'out');
const webviewOutDir = path.join(outDir, 'webview-ui');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyStaticAssets() {
  ensureDir(webviewOutDir);
  const srcHtml = path.join(__dirname, 'webview-ui', 'index.html');
  const destHtml = path.join(webviewOutDir, 'index.html');
  fs.copyFileSync(srcHtml, destHtml);
}

async function build() {
  ensureDir(outDir);
  copyStaticAssets();

  const extensionContext = await esbuild.context({
    bundle: true,
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    outfile: path.join(outDir, 'extension.js'),
    platform: 'node',
    format: 'cjs',
    sourcemap: true,
    external: ['vscode'],
    target: 'node18',
    logLevel: 'info',
  });

  const webviewContext = await esbuild.context({
    bundle: true,
    entryPoints: [path.join(__dirname, 'webview-ui', 'index.tsx')],
    outfile: path.join(webviewOutDir, 'bundle.js'),
    platform: 'browser',
    format: 'esm',
    sourcemap: true,
    target: 'es2020',
    loader: {
      '.png': 'dataurl',
      '.svg': 'dataurl',
      '.css': 'css',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(isWatch ? 'development' : 'production'),
    },
    logLevel: 'info',
  });

  if (isWatch) {
    await extensionContext.watch();
    await webviewContext.watch();

    const htmlPath = path.join(__dirname, 'webview-ui', 'index.html');
    fs.watch(htmlPath, { persistent: true }, () => {
      try {
        copyStaticAssets();
        console.log('[copy] webview-ui/index.html');
      } catch (error) {
        console.error('Failed to copy index.html', error);
      }
    });

    console.log('Watching for changes...');
  } else {
    await extensionContext.rebuild();
    await webviewContext.rebuild();
    await extensionContext.dispose();
    await webviewContext.dispose();
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
