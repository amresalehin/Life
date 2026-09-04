import fs from 'node:fs';

const photosPath = 'src/components/views/PhotosView.tsx';
const indexPath = 'index.html';

let photos = fs.readFileSync(photosPath, 'utf8');
let index = fs.readFileSync(indexPath, 'utf8');

if (!photos.includes("./../../utils/googlePhotosPicker") && !photos.includes("../../utils/googlePhotosPicker")) {
  photos = photos.replace(
    "import { formatTime } from '../../utils/dataParser';",
    "import { formatTime } from '../../utils/dataParser';\nimport { pickGooglePhotos } from '../../utils/googlePhotosPicker';"
  );
}

if (!photos.includes('isGooglePhotosPicking')) {
  photos = photos.replace(
    "  const [isMounting, setIsMounting] = useState(false);",
    "  const [isMounting, setIsMounting] = useState(false);\n  const [isGooglePhotosPicking, setIsGooglePhotosPicking] = useState(false);\n  const [googlePhotosError, setGooglePhotosError] = useState<string | null>(null);"
  );

  const handler = `\n  const handleGooglePhotosClick = async () => {\n    setGooglePhotosError(null);\n    setIsGooglePhotosPicking(true);\n    setMountProgress(2);\n    setMountStatus('Connecting to Google Photos…');\n    try {\n      const items = await pickGooglePhotos(({ progress, status }) => {\n        setMountProgress(progress);\n        setMountStatus(status);\n      });\n      if (items.length > 0) onMountNewPhotos(items, 'Google Photos');\n      else setGooglePhotosError('No photos were selected.');\n    } catch (error) {\n      console.error('Google Photos Picker failed:', error);\n      setGooglePhotosError(error instanceof Error ? error.message : 'Google Photos could not be connected.');\n    } finally {\n      setIsGooglePhotosPicking(false);\n      setIsMounting(false);\n    }\n  };\n`;
  photos = photos.replace("  const handleLoadDemo = () => {", handler + "  const handleLoadDemo = () => {");

  const button = `\n            <button\n              onClick={handleGooglePhotosClick}\n              disabled={isGooglePhotosPicking}\n              className="w-full px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer"\n            >\n              <div className="flex items-center gap-2">\n                <Cloud className="w-3.5 h-3.5" />\n                <span>{isGooglePhotosPicking ? 'Connecting…' : 'Connect Google Photos'}</span>\n              </div>\n              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">Picker</span>\n            </button>\n`;
  photos = photos.replace("            <button\n              onClick={handleMountDirectoryClick}", button + "            <button\n              onClick={handleMountDirectoryClick}");

  photos = photos.replace(
    "  HardDrive,\n  CheckCircle2,",
    "  HardDrive,\n  Cloud,\n  CheckCircle2,"
  );

  const errorBlock = `\n      {googlePhotosError && (\n        <div className="shrink-0 mx-6 mt-3 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-3">\n          <span>{googlePhotosError}</span>\n          <button onClick={() => setGooglePhotosError(null)} className="font-bold opacity-70 hover:opacity-100">×</button>\n        </div>\n      )}\n`;
  photos = photos.replace("      {/* Secondary People selector bar if people mode active */}", errorBlock + "\n      {/* Secondary People selector bar if people mode active */}");
}

if (!index.includes('accounts.google.com/gsi/client')) {
  index = index.replace(
    '    <script type="module" src="/src/main.tsx"></script>',
    '    <script src="https://accounts.google.com/gsi/client" async></script>\n    <script type="module" src="/src/main.tsx"></script>'
  );
}

fs.writeFileSync(photosPath, photos);
fs.writeFileSync(indexPath, index);
console.log('Google Photos Picker integration applied.');
