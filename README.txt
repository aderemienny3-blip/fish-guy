Fish Guy upload fix
Unzip into the project root (overwrites components/admin/TrackUploadForm.tsx).
PowerShell:  Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-upload-fix.zip" -DestinationPath .
Then: npm run build, git add ., git commit -m "Fix track upload", git push
