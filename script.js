const form = document.querySelector('#download-form');
const input = document.querySelector('#url-input');
const fetchButton = document.querySelector('#fetch-button');
const message = document.querySelector('#form-message');
const resultCard = document.querySelector('#result-card');
const resultVideo = document.querySelector('#result-video');
const resultHint = document.querySelector('#result-hint');
const saveButton = document.querySelector('#save-button');
const anotherButton = document.querySelector('#another-button');

const instagramPattern = /^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/[\w-]+/i;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let currentFile;
let currentObjectUrl;

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function setFetching(isFetching) {
  fetchButton.disabled = isFetching;
  fetchButton.textContent = isFetching ? 'Fetching…' : 'Download';
  input.readOnly = isFetching;
}

function filenameFrom(response) {
  const header = response.headers.get('Content-Disposition') || '';
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : 'igsaver-reel.mp4';
}

function clearResult() {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = undefined;
  currentFile = undefined;
  resultVideo.removeAttribute('src');
  resultVideo.load();
  resultCard.hidden = true;
}

function canShareFile(file) {
  return isMobile && navigator.canShare && navigator.canShare({ files: [file] });
}

function showResult(file) {
  currentFile = file;
  currentObjectUrl = URL.createObjectURL(file);
  resultVideo.src = currentObjectUrl;
  resultHint.textContent = canShareFile(file)
    ? 'Tap Download video, then choose “Save Video” to add it to your Photos.'
    : 'Tap the video to preview it, then save it to your device.';
  resultCard.hidden = false;
}

async function fetchReel(url) {
  const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    let error = 'The reel could not be downloaded.';
    try { error = (await response.json()).error || error; } catch {}
    throw new Error(error);
  }
  const blob = await response.blob();
  return new File([blob], filenameFrom(response), { type: blob.type || 'video/mp4' });
}

function downloadToDevice(file) {
  const link = document.createElement('a');
  link.href = currentObjectUrl;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (fetchButton.disabled) return;
  const value = input.value.trim();
  if (!instagramPattern.test(value)) {
    setMessage('Paste a link to a public Instagram reel, like https://www.instagram.com/reel/…', true);
    input.focus();
    return;
  }

  clearResult();
  setMessage('');
  setFetching(true);
  try {
    showResult(await fetchReel(value));
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setFetching(false);
  }
});

saveButton.addEventListener('click', async () => {
  if (!currentFile) return;
  // On phones the share sheet is the only way a web page can put a video in
  // the Photos/Gallery app ("Save Video" on iOS, "Save to device" on Android).
  if (canShareFile(currentFile)) {
    try {
      await navigator.share({ files: [currentFile] });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  downloadToDevice(currentFile);
});

anotherButton.addEventListener('click', () => {
  clearResult();
  setMessage('');
  input.value = '';
  input.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

input.addEventListener('input', () => {
  if (message.classList.contains('error')) setMessage('');
});
