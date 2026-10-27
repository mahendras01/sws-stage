const { execFileSync } = require('node:child_process');

function runCommand(command, args, options = {}) {
  try {
    execFileSync(command, args, { stdio: 'inherit', ...options });
    return true;
  } catch {
    return false;
  }
}

function hasPythonPackage(pythonCommand, packageName) {
  try {
    execFileSync(pythonCommand, ['-c', `import ${packageName}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensurePip(pythonCommand) {
  const candidates = [
    [pythonCommand, ['-m', 'pip', '--version']],
    [pythonCommand, ['-m', 'ensurepip', '--upgrade', '--user']],
    [pythonCommand, ['-m', 'ensurepip', '--upgrade']],
  ];

  for (const [command, args] of candidates) {
    if (runCommand(command, args, { stdio: 'ignore' })) {
      return true;
    }
  }

  for (const command of ['sudo', '']) {
    const aptCommand = command ? [command, 'apt-get', 'update'] : ['apt-get', 'update'];
    const installCommand = command ? [command, 'apt-get', 'install', '-y', 'python3-pip'] : ['apt-get', 'install', '-y', 'python3-pip'];

    if (runCommand(aptCommand[0], aptCommand.slice(1), { stdio: 'ignore' }) && runCommand(installCommand[0], installCommand.slice(1), { stdio: 'inherit' })) {
      return true;
    }
  }

  return false;
}

function installRequirements(pythonCommand) {
  const candidates = [
    [pythonCommand, ['-m', 'pip', 'install', '-r', 'requirements.txt']],
    [pythonCommand, ['-m', 'pip', 'install', '--break-system-packages', '-r', 'requirements.txt']],
    [pythonCommand, ['-m', 'pip', 'install', '--user', '-r', 'requirements.txt']],
    ['pip3', ['install', '-r', 'requirements.txt']],
    ['python3', ['-m', 'ensurepip', '--upgrade', '--user']],
  ];

  for (const [command, args] of candidates) {
    if (runCommand(command, args)) {
      return true;
    }
  }

  return false;
}

const pythonCandidates = ['python3', 'python'];
const pythonCommand = pythonCandidates.find((candidate) => {
  try {
    execFileSync(candidate, ['-c', 'import sys; print(sys.executable)'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

if (!pythonCommand) {
  console.error('Python is not installed or not available on PATH.');
  process.exit(1);
}

if (!hasPythonPackage(pythonCommand, 'pypdf')) {
  console.log('Installing missing Python dependency: pypdf');
  if (!ensurePip(pythonCommand)) {
    console.error('Unable to initialize pip for the active Python runtime. Install python3-pip or run Python with ensurepip available.');
    process.exit(1);
  }

  if (!installRequirements(pythonCommand)) {
    console.error('Failed to install Python dependencies from requirements.txt.');
    process.exit(1);
  }
}
