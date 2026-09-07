const form = document.querySelector('#download-form');
const input = document.querySelector('#url-input');
const message = document.querySelector('#form-message');
const resultCard = document.querySelector('#result-card');
const resultPreview = document.querySelector('#result-preview');
const previewType = document.querySelector('#preview-type');
const resultDescription = document.querySelector('#result-description');
const resultHost = document.querySelector('#result-host');
const resultFormat = document.querySelector('#result-format');
const fileBadge = document.querySelector('#file-badge');
const saveButton = document.querySelector('#save-button');
const recentList = document.querySelector('#recent-list');
let previewObjectUrl;

const directMediaPattern = /\.(?:jpg|jpeg|png|webp|gif|mp4|mov|webm)(?:[?#].*)?$/i;
const instagramPattern = /^https?:\/\/(?:www\.)?instagram\.com\//i;
const recentKey = 'instasnap-recent-links';

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function formatName(url) {
  const path = new URL(url).pathname.split('/').filter(Boolean);
  return path.at(-1) || 'instagram-media';
}

function addRecent(url) {
  const items = JSON.parse(localStorage.getItem(recentKey) || '[]').filter(item => item !== url);
  items.unshift(url);
  localStorage.setItem(recentKey, JSON.stringify(items.slice(0, 3)));
  renderRecent();
}

function renderRecent() {
  const items = JSON.parse(localStorage.getItem(recentKey) || '[]');
  if (!items.length) {
    recentList.innerHTML = '<p class="empty-state">Your last three links will appear here.</p>';
    return;
  }
  recentList.innerHTML = items.map(url => {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return `<div class="recent-item"><span title="${url}">${url}</span><small>${host}</small></div>`;
  }).join('');
}

function clearPreviewObjectUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = undefined;
  }
}

function showVideoPreview(src, label = 'VIDEO PREVIEW') {
  clearPreviewObjectUrl();
  resultPreview.innerHTML = `<video controls playsinline preload="metadata" src="${src}"></video>`;
  previewType.textContent = label;
}

function showDirectMedia(url) {
  const parsed = new URL(url);
  const extension = (parsed.pathname.match(/\.([a-z0-9]+)$/i) || [,'media'])[1].toUpperCase();
  const isImage = /^(JPG|JPEG|PNG|WEBP|GIF)$/.test(extension);
  if (isImage) {
    clearPreviewObjectUrl();
    resultPreview.innerHTML = `<img src="${url}" alt="Media preview" />`;
    previewType.textContent = `${extension} PREVIEW`;
  } else {
    showVideoPreview(url, `${extension} PREVIEW`);
  }
  resultDescription.textContent = `A direct ${extension} file was found. The save action below keeps the source URL intact. If the host blocks browser downloads, open the source and save it from there.`;
  resultHost.textContent = parsed.hostname.replace(/^www\./, '');
  resultFormat.textContent = extension;
  fileBadge.textContent = extension;
  saveButton.href = url;
  saveButton.download = formatName(url);
  saveButton.removeAttribute('aria-disabled');
  saveButton.onclick = null;
  resultCard.classList.remove('is-hidden');
}

function showInstagramLink(url) {
  resultPreview.innerHTML = '<div class="preview-placeholder"><span class="preview-cross">+</span><span>LINK RECEIVED</span></div>';
  previewType.textContent = 'INSTAGRAM LINK';
  resultDescription.textContent = 'Resolving the public media file. This can take a moment, and only works for content you own or have permission to download.';
  resultHost.textContent = 'instagram.com';
  resultFormat.textContent = 'POST LINK';
  fileBadge.textContent = 'LINK';
  saveButton.removeAttribute('href');
  saveButton.removeAttribute('download');
  saveButton.setAttribute('aria-disabled', 'true');
  saveButton.onclick = event => {
    event.preventDefault();
    resolveInstagramMedia(url);
  };
  resultCard.classList.remove('is-hidden');
}

async function resolveInstagramMedia(url) {
  saveButton.classList.add('is-loading');
  saveButton.querySelector('span').textContent = 'Resolving...';
  setMessage('Downloading the original media...');
  try {
    const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || 'The media could not be downloaded.');
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (blob.type.startsWith('video/')) {
      showVideoPreview(objectUrl);
      previewObjectUrl = objectUrl;
      resultFormat.textContent = blob.type.split('/')[1].toUpperCase();
      fileBadge.textContent = 'VIDEO';
      resultDescription.textContent = 'Your video is ready to preview. Use the player controls below, then save the original file.';
    } else if (blob.type.startsWith('image/')) {
      clearPreviewObjectUrl();
      resultPreview.innerHTML = `<img src="${objectUrl}" alt="Downloaded media preview" />`;
      previewObjectUrl = objectUrl;
      previewType.textContent = 'IMAGE PREVIEW';
      resultFormat.textContent = blob.type.split('/')[1].toUpperCase();
      fileBadge.textContent = 'IMAGE';
    }
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'instasnap-media';
    link.click();
    setMessage('Download started.');
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    saveButton.classList.remove('is-loading');
    saveButton.querySelector('span').textContent = 'Save original';
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const value = input.value.trim();
  let url;
  try {
    url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    setMessage('Enter a complete http(s) URL to continue.', true);
    input.focus();
    return;
  }

  addRecent(url.href);
  setMessage(directMediaPattern.test(url.pathname) ? 'Direct media found.' : 'Link received.');
  if (directMediaPattern.test(url.pathname)) {
    showDirectMedia(url.href);
  } else if (instagramPattern.test(url.href)) {
    showInstagramLink(url.href);
  } else {
    showDirectMedia(url.href);
    resultDescription.textContent = 'This URL does not look like an Instagram post, but it can still be used when it points directly to a media file.';
  }
});

input.addEventListener('input', () => {
  if (message.classList.contains('error')) setMessage('');
});

renderRecent();
