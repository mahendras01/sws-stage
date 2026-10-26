const { execFileSync } = require('node:child_process');

function hasPythonPackage(packageName) {
  try {
    execFileSync('python3', ['-c', `import ${packageName}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasPythonPackage('pypdf')) {
  console.log('Installing missing Python dependency: pypdf');
  execFileSync('python3', ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
    stdio: 'inherit',
  });
}
