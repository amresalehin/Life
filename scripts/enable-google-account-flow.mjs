import fs from 'node:fs';

const path = 'src/components/views/PhotosView.tsx';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes("../../utils/googleSignIn")) {
  source = source.replace(
    "import { pickGooglePhotos } from '../../utils/googlePhotosPicker';",
    "import { pickGooglePhotos } from '../../utils/googlePhotosPicker';\nimport { getStoredGoogleAccount, signInWithGoogle, signOutGoogle, type GoogleAccount } from '../../utils/googleSignIn';"
  );
}

if (!source.includes('googleAccount')) {
  source = source.replace(
    "  const [googlePhotosError, setGooglePhotosError] = useState<string | null>(null);",
    "  const [googlePhotosError, setGooglePhotosError] = useState<string | null>(null);\n  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(() => getStoredGoogleAccount());"
  );

  source = source.replace(
    "  const folderInputRef = useRef<HTMLInputElement>(null);",
    `  useEffect(() => {\n    const handleAccountChange = (event: Event) => {\n      setGoogleAccount((event as CustomEvent<GoogleAccount | null>).detail || null);\n    };\n    window.addEventListener('life-google-account-changed', handleAccountChange);\n    return () => window.removeEventListener('life-google-account-changed', handleAccountChange);\n  }, []);\n\n  const folderInputRef = useRef<HTMLInputElement>(null);`
  );

  const oldHandler = `  const handleGooglePhotosClick = async () => {\n    setGooglePhotosError(null);\n    setIsGooglePhotosPicking(true);\n    setIsMounting(true);\n    setMountProgress(2);\n    setMountStatus('Connecting to Google Photos…');\n    try {\n      const items = await pickGooglePhotos(({ progress, status }) => {\n        setMountProgress(progress);\n        setMountStatus(status);\n      });\n      if (items.length > 0) onMountNewPhotos(items, 'Google Photos');\n      else setGooglePhotosError('No photos were selected.');\n    } catch (error) {\n      console.error('Google Photos Picker failed:', error);\n      setGooglePhotosError(error instanceof Error ? error.message : 'Google Photos could not be connected.');\n    } finally {\n      setIsGooglePhotosPicking(false);\n      setIsMounting(false);\n    }\n  };`;

  const newHandler = `  const handleGooglePhotosClick = async () => {\n    setGooglePhotosError(null);\n    setIsGooglePhotosPicking(true);\n    setIsMounting(true);\n    setMountProgress(2);\n    try {\n      let account = googleAccount;\n      if (!account) {\n        setMountStatus('Signing in with Google…');\n        account = await signInWithGoogle();\n        setGoogleAccount(account);\n      }\n\n      setMountStatus('Opening Google Photos…');\n      const items = await pickGooglePhotos(({ progress, status }) => {\n        setMountProgress(progress);\n        setMountStatus(status);\n      });\n      if (items.length > 0) onMountNewPhotos(items, 'Google Photos');\n      else setGooglePhotosError('No photos were selected.');\n    } catch (error) {\n      console.error('Google Photos flow failed:', error);\n      setGooglePhotosError(error instanceof Error ? error.message : 'Google sign-in or Google Photos could not be completed.');\n    } finally {\n      setIsGooglePhotosPicking(false);\n      setIsMounting(false);\n    }\n  };`;

  if (source.includes(oldHandler)) source = source.replace(oldHandler, newHandler);

  const buttonPattern = /            <button\n              onClick=\{handleGooglePhotosClick\}[\s\S]*?            <\/button>\n/;
  const button = `            <button\n              onClick={handleGooglePhotosClick}\n              disabled={isGooglePhotosPicking}\n              className="w-full px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all cursor-pointer"\n            >\n              <div className="flex items-center gap-2 min-w-0">\n                <Cloud className="w-3.5 h-3.5 shrink-0" />\n                <span className="truncate">{isGooglePhotosPicking ? 'Connecting…' : googleAccount ? 'Open Google Photos' : 'Continue with Google'}</span>\n              </div>\n              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono shrink-0">{googleAccount ? (googleAccount.email || 'Connected') : 'Sign in'}</span>\n            </button>\n            {googleAccount && (\n              <button\n                onClick={() => signOutGoogle()}\n                className="w-full px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg text-[11px] font-medium text-left transition-colors cursor-pointer"\n              >\n                Sign out of Google\n              </button>\n            )}\n`;
  source = source.replace(buttonPattern, button);
}

fs.writeFileSync(path, source);
console.log('Google account-first Photos flow applied.');
