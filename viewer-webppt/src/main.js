import { parse, setFontDecoder } from '@web-ppt/core';
import { eotToTtf } from 'mtx-decompressor';
import { Viewer } from '@web-ppt/viewer-core';

// Kích hoạt giải mã font nhúng .fntdata (MicroType Express sang TrueType)
setFontDecoder(eotToTtf);

// DOM Elements
const welcomeView = document.getElementById('welcomeView');
const presentationView = document.getElementById('presentationView');
const stage = document.getElementById('stage');
const stageWrapper = document.getElementById('stageWrapper');
const presTitle = document.getElementById('presTitle');
const sidebar = document.getElementById('sidebar');
const sidebarCount = document.getElementById('sidebarCount');
const thumbList = document.getElementById('thumbList');
const btnToggleSidebar = document.getElementById('btnToggleSidebar');

// Dock & Nav Elements
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnPlayStep = document.getElementById('btnPlayStep');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnDockFullscreen = document.getElementById('btnDockFullscreen');
const btnClosePresentation = document.getElementById('btnClosePresentation');
const btnMediaJump = document.getElementById('btnMediaJump');
const mediaJumpText = document.getElementById('mediaJumpText');
const currentSlideNum = document.getElementById('currentSlideNum');
const totalSlideNum = document.getElementById('totalSlideNum');

// Dropdown & Input Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const btnSamplesDropdown = document.getElementById('btnSamplesDropdown');
const samplesMenu = document.getElementById('samplesMenu');
const brandHome = document.getElementById('brandHome');

// Loading & Help Modals
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');
const loadingText = document.getElementById('loadingText');
const btnHelp = document.getElementById('btnHelp');
const btnCloseHelp = document.getElementById('btnCloseHelp');
const modalHelp = document.getElementById('modalHelp');

// Application State
let currentViewer = null;
let currentPres = null;
let currentFontStyles = [];
let mediaSlideIndices = [];
let currentMediaPointer = 0;

// Show Loading State
function showLoading(title = 'Đang tải bài giảng...', subtitle = 'Đang xử lý cấu trúc XML và tài nguyên') {
  loadingTitle.textContent = title;
  loadingText.textContent = subtitle;
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

// Inject Embedded Fonts into Document
function injectEmbeddedFonts(pres) {
  currentFontStyles.forEach(style => style.remove());
  currentFontStyles = [];

  if (!pres.embeddedFonts || pres.embeddedFonts.length === 0) return;

  const styleEl = document.createElement('style');
  let cssText = '';

  pres.embeddedFonts.forEach(font => {
    if (font.family && font.src) {
      cssText += `
        @font-face {
          font-family: '${font.family}';
          src: url('${font.src}');
          font-weight: ${font.bold ? 'bold' : 'normal'};
          font-style: ${font.italic ? 'italic' : 'normal'};
        }
      `;
    }
  });

  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);
  currentFontStyles.push(styleEl);
}

// Detect slides containing Video or Audio
function scanMediaSlides(pres) {
  const indices = [];
  pres.slides.forEach((slide, idx) => {
    const hasMedia = slide.elements && slide.elements.some(el => el.type === 'video' || el.type === 'audio');
    if (hasMedia) indices.push(idx);
  });
  return indices;
}

// Load and Parse Presentation from ArrayBuffer
async function loadPresentation(buffer, displayName = 'Presentation') {
  showLoading(`Đang phân tích "${displayName}"...`, 'Giải nén cấu trúc OOXML & font nhúng vào RAM');
  try {
    const t0 = performance.now();
    const pres = await parse(buffer);
    const duration = Math.round(performance.now() - t0);

    // Clean up previous viewer
    if (currentViewer) {
      currentViewer.destroy();
      currentViewer = null;
    }
    stage.innerHTML = '';

    // Inject fonts
    injectEmbeddedFonts(pres);

    // Initialize Viewer with stage, pres
    currentViewer = new Viewer(stage, pres);

    currentPres = pres;
    mediaSlideIndices = scanMediaSlides(pres);
    currentMediaPointer = 0;

    // Update Header and Counter
    presTitle.textContent = displayName;
    presTitle.title = displayName;
    totalSlideNum.textContent = pres.slides.length;
    currentSlideNum.textContent = '1';
    sidebarCount.textContent = `${pres.slides.length} slides`;

    // Setup Media Jump Button
    if (mediaSlideIndices.length > 0) {
      btnMediaJump.style.display = 'inline-flex';
      mediaJumpText.textContent = `Slide ${mediaSlideIndices[0] + 1} (${mediaSlideIndices.length} Media)`;
      btnMediaJump.title = `Nhảy tới slide chứa Media (có ${mediaSlideIndices.length} slide)`;
    } else {
      btnMediaJump.style.display = 'none';
    }

    // Render Thumbnails
    renderThumbnails(pres);

    // Listen to Viewer Slide Changes
    currentViewer.onChange = (idx) => {
      currentSlideNum.textContent = idx + 1;
      updateActiveThumbnail(idx);
    };

    // Switch view to presentation mode
    welcomeView.style.display = 'none';
    presentationView.style.display = 'flex';
    hideLoading();
  } catch (err) {
    console.error('Error loading presentation:', err);
    hideLoading();
    alert(`Không thể đọc file PowerPoint: ${err.message}`);
  }
}

// Render Slide Thumbnails
function renderThumbnails(pres) {
  thumbList.innerHTML = '';
  pres.slides.forEach((slide, idx) => {
    const item = document.createElement('div');
    item.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
    item.dataset.slideIndex = idx;

    const hasMedia = mediaSlideIndices.includes(idx);
    const mediaBadge = hasMedia ? '<span style="color:#f87171;">🎬 Media</span>' : '';

    item.innerHTML = `
      <div class="thumb-header">
        <span>Slide ${idx + 1}</span>
        ${mediaBadge}
      </div>
      <div class="thumb-preview-box" id="thumb-preview-${idx}">
        <span style="font-size:11px; color:#64748b;">${idx + 1}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      if (currentViewer) {
        currentViewer.goTo(idx);
      }
    });

    thumbList.appendChild(item);
  });
}

function updateActiveThumbnail(activeIdx) {
  const items = thumbList.querySelectorAll('.thumb-item');
  items.forEach((item, idx) => {
    if (idx === activeIdx) {
      item.classList.add('active');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// Load presentation from URL
async function loadFromUrl(url, displayName = null) {
  const name = displayName || url.split('/').pop().split('?')[0] || 'Presentation';
  showLoading(`Đang tải "${name}"...`, 'Tải dữ liệu bài giảng từ server/CDN');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải file ${url}`);
    const buffer = await res.arrayBuffer();
    await loadPresentation(buffer, name);
  } catch (err) {
    hideLoading();
    alert(`Lỗi tải bài giảng: ${err.message}`);
  }
}

// Close current presentation and return to Welcome Screen
function closePresentation() {
  if (currentViewer) {
    currentViewer.destroy();
    currentViewer = null;
  }
  currentPres = null;
  stage.innerHTML = '';
  thumbList.innerHTML = '';
  presTitle.textContent = 'Chưa mở bài giảng';
  presentationView.style.display = 'none';
  welcomeView.style.display = 'flex';
}

// Toggle Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const elem = stageWrapper || document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

// Event Listeners: Navigation
btnPrev.addEventListener('click', () => currentViewer?.prev());
btnNext.addEventListener('click', () => currentViewer?.next());
btnPlayStep.addEventListener('click', () => {
  if (currentViewer) {
    if (!currentViewer.playNextAnimation()) currentViewer.next();
  }
});
btnFullscreen.addEventListener('click', toggleFullscreen);
btnDockFullscreen.addEventListener('click', toggleFullscreen);
btnClosePresentation.addEventListener('click', closePresentation);
brandHome.addEventListener('click', (e) => {
  if (presentationView.style.display !== 'none') {
    e.preventDefault();
    closePresentation();
  }
});

// Sidebar Toggle
btnToggleSidebar.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Media Jump button
btnMediaJump.addEventListener('click', () => {
  if (!currentViewer || mediaSlideIndices.length === 0) return;
  const targetSlide = mediaSlideIndices[currentMediaPointer];
  currentViewer.goTo(targetSlide);
  currentMediaPointer = (currentMediaPointer + 1) % mediaSlideIndices.length;
  mediaJumpText.textContent = `Slide ${mediaSlideIndices[currentMediaPointer] + 1}`;
});

// File Input Picker
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  await loadPresentation(buffer, file.name);
  fileInput.value = '';
});

// Drag & Drop
if (dropZone) {
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await loadPresentation(buffer, file.name);
  });
}

// Window Drag & Drop
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (e.target.closest('#dropZone')) return;
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith('.pptx') || file.name.endsWith('.zip'))) {
    const buffer = await file.arrayBuffer();
    await loadPresentation(buffer, file.name);
  }
});

// Dropdown Menu Toggle
btnSamplesDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
  samplesMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-wrapper')) {
    samplesMenu.classList.remove('open');
  }
});

// Sample click handlers (Dropdown and Welcome cards)
document.querySelectorAll('[data-sample]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const samplePath = el.dataset.sample;
    const sampleName = el.querySelector('h4')?.textContent || el.querySelector('strong')?.textContent || 'Mẫu bài giảng';
    samplesMenu.classList.remove('open');
    loadFromUrl(samplePath, sampleName);
  });
});

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
  // If help modal is open
  if (modalHelp.style.display === 'flex') {
    if (e.key === 'Escape') modalHelp.style.display = 'none';
    return;
  }

  if (presentationView.style.display === 'none' || !currentViewer) return;

  switch (e.key) {
    case 'ArrowRight':
    case 'PageDown':
      e.preventDefault();
      currentViewer.next();
      break;
    case ' ':
      e.preventDefault();
      if (!currentViewer.playNextAnimation()) currentViewer.next();
      break;
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      currentViewer.prev();
      break;
    case 'f':
    case 'F':
      if (document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        toggleFullscreen();
      }
      break;
    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      break;
  }
});

// Help Modal
btnHelp.addEventListener('click', () => modalHelp.style.display = 'flex');
btnCloseHelp.addEventListener('click', () => modalHelp.style.display = 'none');
modalHelp.addEventListener('click', (e) => {
  if (e.target === modalHelp) modalHelp.style.display = 'none';
});

// URL Param Handler on Init
async function init() {
  const params = new URLSearchParams(window.location.search);
  const fileParam = params.get('file') || params.get('url');
  const folderParam = params.get('folder');
  const sampleParam = params.get('sample');
  const isEmbed = params.get('embed') === 'true';

  if (isEmbed) {
    document.querySelector('.topbar')?.style.setProperty('display', 'none');
    document.getElementById('sidebar')?.style.setProperty('display', 'none');
    const dock = document.getElementById('floatingDock');
    if (dock) dock.style.bottom = '12px';
  }

  if (folderParam) {
    // Local server streaming compatibility
    await loadFromUrl(`/api/v1/xml-folder/${encodeURIComponent(folderParam)}/stream`, `Folder: ${folderParam}`);
  } else if (fileParam) {
    await loadFromUrl(fileParam);
  } else if (sampleParam) {
    await loadFromUrl(`samples/${sampleParam}.pptx`, `Sample: ${sampleParam}`);
  }
  // Otherwise remains on the clean Welcome Screen for users to drop/open any file!
}

window.addEventListener('DOMContentLoaded', init);
