/* global process */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname behavior for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root path
const ROOT_DIR = path.resolve(__dirname, '..');

function getPackageVersion() {
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function runCommand(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

function main() {
  // Allow overriding the version via CLI argument: node scripts/deploy-ota.js [version]
  let version = process.argv[2];
  if (!version) {
    version = getPackageVersion();
    console.log(`No version specified. Using version from package.json: ${version}`);
  } else {
    console.log(`Using specified version: ${version}`);
  }

  // 1. Build the React application
  console.log('\n--- Step 1: Building React Web App ---');
  try {
    runCommand('npm run build');
  } catch (error) {
    console.error('Build failed. Aborting OTA generation.', error);
    process.exit(1);
  }

  // Define paths
  const publicUpdatesDir = path.join(ROOT_DIR, 'public', 'updates');
  const distUpdatesDir = path.join(ROOT_DIR, 'dist', 'updates');
  const zipFileName = `bundle-${version}.zip`;
  const publicZipPath = path.join(publicUpdatesDir, zipFileName);
  const distZipPath = path.join(distUpdatesDir, zipFileName);
  
  const manifestFileName = 'manifest.json';
  const publicManifestPath = path.join(publicUpdatesDir, manifestFileName);
  const distManifestPath = path.join(distUpdatesDir, manifestFileName);

  // Ensure updates directories exist
  fs.mkdirSync(publicUpdatesDir, { recursive: true });
  fs.mkdirSync(distUpdatesDir, { recursive: true });

  // 2. Create the OTA zip file of the build folder (excluding the updates folder)
  console.log('\n--- Step 2: Packaging Build Directory ---');
  try {
    // We use the Windows native tar command to create a zip file
    const tarCmd = `tar --exclude="updates" -caf "${publicZipPath}" -C dist .`;
    runCommand(tarCmd);
    console.log(`Successfully created ZIP archive: ${publicZipPath}`);
  } catch (error) {
    console.error('Failed to create ZIP package.', error);
    process.exit(1);
  }

  // 3. Write updates manifest file
  console.log('\n--- Step 3: Generating Update Manifest ---');
  const manifestContent = {
    version: version,
    url: `https://golden-acres-projects.web.app/updates/${zipFileName}`,
    releasedAt: new Date().toISOString()
  };

  fs.writeFileSync(publicManifestPath, JSON.stringify(manifestContent, null, 2), 'utf8');
  console.log(`Successfully wrote manifest: ${publicManifestPath}`);

  // 4. Copy current OTA package and manifest to dist/updates/ for immediate deploy
  console.log('\n--- Step 4: Staging files in dist directory ---');
  fs.copyFileSync(publicZipPath, distZipPath);
  fs.copyFileSync(publicManifestPath, distManifestPath);
  console.log('OTA files copied to dist/updates/ directory.');

  console.log('\n=============================================');
  console.log('OTA update packages created successfully!');
  console.log(`Version: ${version}`);
  console.log(`Manifest URL: ${manifestContent.url}`);
  console.log('=============================================');
  console.log('\nTo deploy the update live to your users, run:');
  console.log('  firebase deploy --only hosting');
  console.log('=============================================\n');
}

main();
