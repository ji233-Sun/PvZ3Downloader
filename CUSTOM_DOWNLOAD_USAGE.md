# Custom Download Feature - Usage Guide

## Overview

The PvZ3 Downloader now supports custom download mode, allowing users to download resources from different versions of the game, including the International version.

## Features

### Standard Mode (Default)
- Downloads from the Chinese version CDN
- Automatically fetches catalog.json from the standard URL
- No additional configuration required

### Custom Mode
- Supports custom catalog.json sources (file upload or URL)
- Allows specification of custom base CDN URL
- Ideal for International version and other game variants

## How to Use Custom Mode

### Step 1: Select Custom Mode
1. Open the PvZ3 Downloader application
2. In the download form, find the "Download Mode" dropdown
3. Select "⚙️ Custom Mode" from the options

### Step 2: Choose Catalog Source

#### Option A: Upload Local Catalog File
1. Select "Upload Local File" from the "Catalog Source" dropdown
2. Click the "📄 Select catalog.json" button
3. Browse and select your local catalog.json file
4. The filename will appear in the input field

#### Option B: Use Catalog URL
1. Select "Use URL" from the "Catalog Source" dropdown
2. Enter the complete URL to the catalog.json file
   - Example: `https://pvz3cdn.example.com/intl_prod/client-assets/iOS/catalog.json`

### Step 3: Enter Base URL
1. In the "Resource Base URL" field, enter the CDN base URL
2. This URL should be the root URL where game assets are hosted
   - Example: `https://pvz3cdn.example.com/intl_prod/client-assets`

### Step 4: Configure Other Settings
1. Select your platform (iOS or Android)
2. Choose the download directory
3. Set the maximum concurrent downloads (1-50)
4. Configure other options as needed

### Step 5: Start Download
1. Click "🚀 Start Download" button
2. The downloader will:
   - Load the catalog from your specified source
   - Parse the resource list
   - Download all assets using your custom base URL

## Configuration Persistence

Your custom mode settings are automatically saved and will be restored when you reopen the application:
- Download mode (Standard/Custom)
- Catalog source type (File/URL)
- Catalog URL (if using URL source)
- Custom base URL

## Example: Downloading PvZ3 International Version

### Prerequisites
1. Obtain the catalog.json file for the International version
   - This can be extracted from the game files or provided by the game distributor
2. Know the CDN base URL for the International version

### Configuration
1. Download Mode: Custom
2. Catalog Source: Upload Local File (or URL if available)
3. Catalog File: Browse to your downloaded catalog.json
4. Base URL: `https://pvz3-international-cdn.example.com/prod/assets`
   (Replace with the actual International version CDN URL)
5. Platform: iOS or Android (as appropriate)

### Notes
- The base URL should NOT include the platform directory (iOS/Android)
- The base URL should NOT include a trailing slash
- Make sure the catalog.json file is from the correct version and platform

## Troubleshooting

### "Please provide catalog.json URL"
- Make sure you've entered a valid URL in the catalog URL field when using URL source

### "Please provide resource base URL"
- The custom base URL field is required in custom mode
- Enter the complete CDN base URL

### "Invalid catalog URL" or "Invalid base URL"
- Check that your URLs are properly formatted
- URLs should start with http:// or https://
- Ensure there are no extra spaces

### Download fails with 404 errors
- Verify that the base URL is correct
- Check that the catalog.json contains the correct placeholder patterns
- Ensure the CDN server is accessible

## Technical Details

### Placeholder Replacement
The downloader looks for these placeholders in the catalog.json internal IDs:
- `{AppSettingsJson.AddressablesCdnServerBaseUrl}`
- `{UnityEngine.AddressableAssets.Addressables.RuntimePath}`

These placeholders are replaced with your custom base URL during download.

### Supported Catalog Sources
1. **Local File**: Upload a catalog.json file from your computer
2. **URL**: Provide a direct link to a catalog.json file

The catalog.json file should follow the Unity Addressables format with an `m_InternalIds` array.

## API for Developers

The custom download feature is exposed through the IPC interface:

```javascript
window.electronAPI.startDownload({
  platform: 'iOS',
  outputDir: '/path/to/download',
  concurrent: 10,
  createSubFolder: true,
  customConfig: {
    mode: 'custom',
    catalogSource: 'file', // or 'url'
    catalogFilePath: '/path/to/catalog.json', // for file source
    catalogUrl: 'https://example.com/catalog.json', // for URL source
    baseUrl: 'https://cdn.example.com/assets'
  }
})
```
