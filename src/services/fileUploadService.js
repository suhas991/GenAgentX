// src/services/fileUploadService.js

/**
 * Convert file to base64 data URL for inline embedding
 * Since Gemini Files API doesn't support CORS in browsers,
 * we use inline data instead which works for smaller files
 * @param {File} file - The file to convert
 * @returns {Promise<Object>} - File data with base64 content
 */
export const uploadFile = async (file, displayName = null) => {
  // Check file size (Gemini has limits on inline data)
  const maxSize = 20 * 1024 * 1024; // 20MB limit for inline data
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is 20MB for inline uploads. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  const mimeType = file.type || 'application/octet-stream';
  const name = displayName || file.name;

  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Return file metadata compatible with Gemini API
    return {
      name: `inline_${Date.now()}_${file.name}`,
      displayName: name,
      mimeType: mimeType,
      inlineData: base64Data, // base64 string without data URL prefix
      sizeBytes: file.size,
      createTime: new Date().toISOString(),
      isInline: true
    };
  } catch (error) {
    console.error('File conversion error:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
};

/**
 * Convert File to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 encoded string (without data URL prefix)
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Get metadata for an uploaded file
 * For inline files, just return the cached data
 * @param {string} fileName - The name of the file
 * @returns {Promise<Object>} - File metadata
 */
export const getFileMetadata = async (fileName) => {
  // For inline files, metadata is stored locally
  // This function is kept for API compatibility
  return {
    name: fileName,
    isInline: true
  };
};

/**
 * List all uploaded files
 * For inline files, this returns an empty array
 * @returns {Promise<Array>} - Array of file metadata
 */
export const listFiles = async () => {
  // Inline files are not stored on server
  return [];
};

/**
 * Delete an uploaded file
 * For inline files, this is a no-op since files aren't stored on server
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<boolean>}
 */
export const deleteFile = async (fileName) => {
  // No server-side deletion needed for inline files
  return true;
};

/**
 * Check if a file type is supported for multimodal prompts
 * @param {File} file - The file to check
 * @returns {boolean}
 */
export const isMultimodalFileSupported = (file) => {
  const supportedTypes = [
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic',
    'image/heif',
    // Audio
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/aiff',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    // Video
    'video/mp4',
    'video/mpeg',
    'video/mov',
    'video/avi',
    'video/x-flv',
    'video/mpg',
    'video/webm',
    'video/wmv',
    'video/3gpp',
    // Documents
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/x-javascript',
    'text/x-typescript',
    'application/x-typescript',
    'text/csv',
    'text/markdown',
    'text/x-python',
    'application/x-python-code',
    'application/json',
    'text/xml',
    'application/rtf',
    'text/rtf'
  ];

  return supportedTypes.includes(file.type.toLowerCase());
};

/**
 * Get supported file extensions for display
 * @returns {string} - Comma-separated list of extensions
 */
export const getSupportedMultimodalExtensions = () => {
  return 'Images: PNG, JPEG, WEBP, HEIC\n' +
         'Audio: WAV, MP3, AIFF, AAC, OGG, FLAC\n' +
         'Video: MP4, MPEG, MOV, AVI, FLV, MPG, WEBM, WMV, 3GPP\n' +
         'Documents: PDF, TXT, HTML, CSS, JS, TS, CSV, MD, JSON, XML, RTF';
};
