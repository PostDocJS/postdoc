import fs from 'fs';
import path from 'path';

function getProjectNameFromPackageJson() {
  if (!fs.existsSync('package.json')) {
    return null;
  }

  const packageJsonContent = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  );

  return packageJsonContent.name;
}

export {getProjectNameFromPackageJson};
