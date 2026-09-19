// Glass Data - ASIN Skill Library Master Controller
// Self-contained, ultra-robust vanilla JavaScript (Works with both HTTP server & direct file:// opening)

import { TASKS_DATABASE, ROOT_DRIVE_URL } from './tasksData.js?v=3';
class SkillLibraryApp {
  constructor() {
    this.tasks = [...TASKS_DATABASE];
    this.filteredTasks = [...TASKS_DATABASE];
    this.currentCategory = 'All';
    this.searchQuery = '';
    this.activeTask = null;
    this.activeClipIndex = 0;

    this.videoPlayer = null;
    this.currentViewerMode = 'hud';
    this.currentViewMode = 'grid';

    // Drive API state
    this.driveService = null;
    this.driveConnected = false;
    this.driveTaskMap = new Map(); // folderId -> real video files

    this.initDOMReferences();
    this.initEventListeners();
    this.renderTaskGrid();
    this.renderFoldersGrid();
    this.startHUDTelemetryClocks();
    this.initCategoryFilters();
    this.initDriveIntegration();
  }

  initDOMReferences() {
    this.taskGridEl = document.getElementById('taskGrid');
    this.searchBoxInput = document.getElementById('searchBoxInput');
    this.categoryFiltersEl = document.getElementById('categoryFilters');
    this.totalTasksCountEl = document.getElementById('totalTasksCount');
    this.totalClipsCountEl = document.getElementById('totalClipsCount');
    this.clockDisplayEl = document.getElementById('clockDisplay');

    // Drive API UI
    this.driveApiBanner = document.getElementById('driveApiBanner');
    this.apiKeyInput = document.getElementById('apiKeyInput');
    this.btnConnectDrive = document.getElementById('btnConnectDrive');
    this.btnCloseBanner = document.getElementById('btnCloseBanner');
    this.driveStatusPill = document.getElementById('driveStatusPill');
    this.driveStatusDot = document.getElementById('driveStatusDot');
    this.driveStatusLabel = document.getElementById('driveStatusLabel');

    this.modalBackdrop = document.getElementById('modalBackdrop');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');
    this.modalFolderPath = document.getElementById('modalFolderPath');
    this.modalFolderDriveLink = document.getElementById('modalFolderDriveLink');
    this.modalDirectDriveBtn = document.getElementById('modalDirectDriveBtn');
    this.tabClipsDriveAllLink = document.getElementById('tabClipsDriveAllLink');
    this.driveEmbedLaunchLink = document.getElementById('driveEmbedLaunchLink');
    this.modalTaskTitle = document.getElementById('modalTaskTitle');
    this.clipsListContainer = document.getElementById('clipsListContainer');
    this.playerCanvas = document.getElementById('playerCanvas');
    this.driveEmbedContainer = document.getElementById('driveEmbedContainer');
    this.playerHudOverlay = document.getElementById('playerHudOverlay');
    this.playerControlsContainer = document.getElementById('playerControlsContainer');
    this.btnModeHUD = document.getElementById('btnModeHUD');
    this.btnModeDrive = document.getElementById('btnModeDrive');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.scrubberTrack = document.getElementById('scrubberTrack');
    this.scrubberFill = document.getElementById('scrubberFill');
    this.timecodeDisplay = document.getElementById('timecodeDisplay');
    this.speedSelectBtn = document.getElementById('speedSelectBtn');

    this.docTitle = document.getElementById('docTitle');
    this.docSummary = document.getElementById('docSummary');
    this.docDetails = document.getElementById('docDetails');

    this.customDriveUrlInput = document.getElementById('customDriveUrlInput');
    this.btnSaveDriveUrl = document.getElementById('btnSaveDriveUrl');

    this.btnViewGrid = document.getElementById('btnViewGrid');
    this.btnViewFolders = document.getElementById('btnViewFolders');
    this.foldersGridEl = document.getElementById('foldersGrid');
    this.gridHeaderLabel = document.getElementById('gridHeaderLabel');
    this.datasetLoadedBadge = document.getElementById('datasetLoadedBadge');

    this.btnPresentationMode = document.getElementById('btnPresentationMode');
    this.btnExportReport = document.getElementById('btnExportReport');
    this.btnImportFolder = document.getElementById('btnImportFolder');
    this.folderFileInput = document.getElementById('folderFileInput');
    this.btnApproveTask = document.getElementById('btnApproveTask');
    this.btnRequestRetake = document.getElementById('btnRequestRetake');
  }

  initEventListeners() {
    this.btnViewGrid?.addEventListener('click', () => this.switchLibraryView('grid'));
    this.btnViewFolders?.addEventListener('click', () => this.switchLibraryView('folders'));

    this.searchBoxInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.applyFilters();
    });

    this.modalCloseBtn?.addEventListener('click', () => this.closeTaskModal());
    this.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) this.closeTaskModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalBackdrop.classList.contains('open')) {
        this.closeTaskModal();
      }
    });

    this.playPauseBtn?.addEventListener('click', () => {
      if (this.videoPlayer) {
        this.videoPlayer.togglePlay();
        this.playPauseBtn.innerHTML = this.videoPlayer.isPlaying ? '❚❚ PAUSE' : '▶ PLAY';
      }
    });

    this.scrubberTrack?.addEventListener('click', (e) => {
      if (!this.videoPlayer) return;
      const rect = this.scrubberTrack.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      this.videoPlayer.seek(pos);
    });

    this.speedSelectBtn?.addEventListener('click', () => {
      if (!this.videoPlayer) return;
      const speeds = [1.0, 1.5, 2.0, 0.5];
      const nextIndex = (speeds.indexOf(this.videoPlayer.playbackRate) + 1) % speeds.length;
      const newSpeed = speeds[nextIndex];
      this.videoPlayer.setSpeed(newSpeed);
      this.speedSelectBtn.textContent = `${newSpeed}x`;
    });

    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const tabTarget = e.currentTarget.dataset.tab;
        
        const tab1 = document.getElementById('tabContentClips');
        const tab2 = document.getElementById('tabContentAnnotations');
        const tab3 = document.getElementById('tabContentManager');
        if (tab1) tab1.style.display = tabTarget === 'clips' ? 'block' : 'none';
        if (tab2) tab2.style.display = tabTarget === 'annotations' ? 'block' : 'none';
        if (tab3) tab3.style.display = tabTarget === 'manager' ? 'block' : 'none';
      });
    });

    this.btnModeHUD?.addEventListener('click', () => this.switchViewerMode('hud'));
    this.btnModeDrive?.addEventListener('click', () => this.switchViewerMode('drive'));

    this.btnSaveDriveUrl?.addEventListener('click', () => {
      if (!this.activeTask) return;
      const val = this.customDriveUrlInput?.value.trim();
      if (val) {
        this.activeTask.driveUrl = val;
        this.updateModalDriveLinks(val);
        alert(`Google Drive link updated for "${this.activeTask.title}"!`);
      }
    });

    this.btnPresentationMode?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
      } else {
        document.exitFullscreen();
      }
    });

    this.btnExportReport?.addEventListener('click', () => this.exportManagerReport());

    this.btnImportFolder?.addEventListener('click', () => {
      this.folderFileInput?.click();
    });

    this.folderFileInput?.addEventListener('change', (e) => {
      this.handleFolderUpload(e.target.files);
    });

    this.btnApproveTask?.addEventListener('click', () => {
      if (this.activeTask) {
        this.activeTask.status = 'Approved';
        this.updateModalStatusBadge();
        this.renderTaskGrid();
        this.renderFoldersGrid();
      }
    });

    this.btnRequestRetake?.addEventListener('click', () => {
      if (this.activeTask) {
        this.activeTask.status = 'Needs Retake';
        this.updateModalStatusBadge();
        this.renderTaskGrid();
        this.renderFoldersGrid();
      }
    });

    // Drive API Banner
    this.btnConnectDrive?.addEventListener('click', () => this.connectDrive());
    this.apiKeyInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.connectDrive(); });
    this.btnCloseBanner?.addEventListener('click', () => {
      if (this.driveApiBanner) this.driveApiBanner.style.display = 'none';
    });
    this.driveStatusPill?.addEventListener('click', () => {
      if (!this.driveConnected && this.driveApiBanner) {
        this.driveApiBanner.style.display = 'flex';
        this.apiKeyInput?.focus();
      }
    });
  }

  // ── Google Drive Integration ──────────────────────────────────────────────

  initDriveIntegration() {
    const savedKey = localStorage.getItem('gDriveApiKey');
    if (savedKey) {
      if (this.apiKeyInput) this.apiKeyInput.value = savedKey;
      this.connectDrive(savedKey, true);
    } else {
      // Show banner on first visit
      if (this.driveApiBanner) this.driveApiBanner.style.display = 'flex';
    }
  }

  setDriveStatus(state, label) {
    if (!this.driveStatusPill) return;
    this.driveStatusPill.className = `drive-status-pill ${state}`;
    if (this.driveStatusLabel) this.driveStatusLabel.textContent = label;
  }

  async connectDrive(key, silent = false) {
    const apiKey = key || this.apiKeyInput?.value?.trim();
    if (!apiKey) {
      if (!silent) alert('Please enter a Google API Key.');
      return;
    }

    this.setDriveStatus('loading', 'DRIVE: CONNECTING...');

    try {
      // Test the key by fetching the root folder metadata
      const testUrl = `https://www.googleapis.com/drive/v3/files/${ROOT_DRIVE_URL.split('/').pop()}?fields=name,id&key=${apiKey}`;
      const res = await fetch(testUrl);
      if (!res.ok && res.status === 403) throw new Error('API key denied. Check Drive API is enabled and key restrictions.');
      if (!res.ok && res.status === 400) throw new Error('Invalid API Key format.');

      this.driveService = new DriveService(apiKey);
      this.driveConnected = true;
      localStorage.setItem('gDriveApiKey', apiKey);

      if (this.driveApiBanner) this.driveApiBanner.style.display = 'none';
      this.setDriveStatus('connected', 'DRIVE: CONNECTED ✓');

      // Load folder list from Drive and merge with tasks
      await this.loadDriveFolders();
    } catch (err) {
      this.driveConnected = false;
      this.setDriveStatus('disconnected', 'DRIVE: ERROR');
      if (!silent) alert(`Drive Connection Failed:\n${err.message}\n\nMake sure:\n1. Drive API is enabled in Google Cloud Console\n2. Your API key has no HTTP referrer restrictions (or allows localhost)\n3. The Drive folder is shared publicly`);
      else {
        // Auto-retry on page load fails: show banner again
        if (this.driveApiBanner) this.driveApiBanner.style.display = 'flex';
      }
    }
  }

  async loadDriveFolders() {
    if (!this.driveService) return;
    const rootId = ROOT_DRIVE_URL.split('/folders/')[1]?.split('?')[0];
    if (!rootId) return;

    this.setDriveStatus('loading', 'DRIVE: LOADING FOLDERS...');
    try {
      const driveFolders = await this.driveService.listFolders(rootId);
      
      // Since API key might return 0 folders for public drives, we DO NOT wipe this.tasks
      if (driveFolders && driveFolders.length > 0) {
        driveFolders.forEach((driveFolder, index) => {
          const match = this.tasks.find(t =>
            t.folderName.toLowerCase().replace(/_/g, ' ') === driveFolder.name.toLowerCase().replace(/_/g, ' ') ||
            t.folderName.toLowerCase() === driveFolder.name.toLowerCase()
          );
          
          if (match) {
            match.driveFolderId = driveFolder.id.trim();
            match.driveUrl = driveFolder.webViewLink || `https://drive.google.com/drive/folders/${driveFolder.id.trim()}?usp=sharing`;
          }
        });
      }

      this.filteredTasks = [...this.tasks];
      this.initCategoryFilters();
      this.applyFilters();
      
      const count = driveFolders ? driveFolders.length : 0;
      if (count === 0) {
        this.setDriveStatus('disconnected', `DRIVE API BLOCKED (0 FOLDERS)`);
      } else {
        this.setDriveStatus('connected', `DRIVE: ${count} FOLDERS ✓`);
      }
    } catch (err) {
      this.setDriveStatus('disconnected', 'DRIVE: ERROR');
      console.warn('loadDriveFolders error:', err);
    }
  }

  async loadFolderVideosForModal(task) {
    // If the task already has clips from tasksData.js (Apps Script sync), use them directly!
    // This completely bypasses the Drive API and works offline.
    if (task.clips && task.clips.length > 0) {
      // Map the static clip data into the same shape as Drive API results
      const videos = task.clips.map(clip => ({
        id: clip.id,
        name: clip.name,
        size: clip.size,
        mimeType: 'video/mp4',
        webViewLink: `https://drive.google.com/file/d/${clip.id}/view`
      }));
      return videos;
    }

    // Fallback: try Drive API if we have a service and folder ID
    if (this.driveService && task.driveFolderId) {
      if (this.driveTaskMap.has(task.driveFolderId)) {
        return this.driveTaskMap.get(task.driveFolderId);
      }
      try {
        const videos = await this.driveService.listVideos(task.driveFolderId);
        this.driveTaskMap.set(task.driveFolderId, videos);
        task.totalClips = videos.length;
        return videos;
      } catch (err) {
        console.warn('loadFolderVideosForModal error:', err);
        return null;
      }
    }

    return null;
  }

  renderDriveClipsList(task, driveVideos) {
    if (!this.clipsListContainer) return;
    this.clipsListContainer.innerHTML = '';

    if (!driveVideos || driveVideos.length === 0) {
      this.clipsListContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.78rem;">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">📂</div>
          No video files found in this Drive folder.
          <br><br>
          <a href="${task.driveUrl}" target="_blank" style="color:var(--accent-cyan);">Open in Google Drive ↗</a>
        </div>`;
        
      // Clear the loading state on the left side too
      if (this.driveEmbedContainer) {
        this.driveEmbedContainer.innerHTML = `
          <div class="drive-video-player-wrap">
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(4, 8, 12, 0.92); color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8rem; gap: 12px; z-index: 5;">
              <span>NO VIDEOS AVAILABLE</span>
            </div>
          </div>
        `;
      }
      return;
    }

    driveVideos.forEach((video, index) => {
      const isFolder = video.mimeType === 'application/vnd.google-apps.folder';
      
      const thumbUrl = isFolder ? '' : `https://drive.google.com/thumbnail?id=${video.id}&sz=w320-h180`;
      const embedUrl = isFolder ? '' : `https://drive.google.com/file/d/${video.id}/preview`;
      // Use the official webViewLink for folders and files
      const viewUrl = video.webViewLink || (isFolder ? `https://drive.google.com/drive/folders/${video.id}?usp=sharing` : `https://drive.google.com/file/d/${video.id}/view`);
      const duration = isFolder ? 'FOLDER' : '--:--';
      const size = isFolder ? '--' : (video.size || '-- MB');

      const clipCard = document.createElement('div');
      clipCard.className = `clip-item-card drive-real-clip tech-corner-box ${index === 0 && !isFolder ? 'active' : ''}`;
      clipCard.id = `clip-item-${index}`;

      clipCard.innerHTML = `
        <div class="clip-thumb-preview" style="width:100px; flex-shrink:0; position:relative; aspect-ratio:16/9; overflow:hidden; background:#061320; display:flex; align-items:center; justify-content:center; border-radius:4px;">
          ${isFolder 
            ? `<div style="font-size:3rem; filter:drop-shadow(0 0 10px rgba(0,240,255,0.4));">📁</div>`
            : `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.8rem; color:rgba(0,240,255,0.3);">🎬</div>
               <img class="clip-drive-thumb" src="${thumbUrl}" alt="Video" onerror="this.outerHTML='<div style=&quot;position:absolute; inset:0; z-index:2; overflow:hidden;&quot;><iframe src=&quot;https://drive.google.com/file/d/${video.id}/preview&quot; style=&quot;width:100%; height:100%; border:none; pointer-events:none;&quot; tabindex=&quot;-1&quot;></iframe></div>'" style="position:relative; z-index:2; width:100%;height:100%;object-fit:cover;display:block;">
               <div class="clip-drive-play-overlay" style="z-index:3;"><div class="clip-play-icon-btn">▶</div></div>`
          }
          <div class="clip-thumb-overlay" style="z-index:4; position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.65rem;padding:1px 5px;font-family:var(--font-mono);">${duration}</div>
        </div>
        <div class="clip-info-text">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:4px;">
            <div class="clip-take-name" title="${video.name}" style="word-break:break-word; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-size:0.75rem; line-height:1.2;">${video.name}</div>
            <div style="display:flex;gap:3px;flex-shrink:0;">
              <a href="${viewUrl}" target="_blank" onclick="event.stopPropagation();" class="drive-btn-small" style="font-size:0.58rem;padding:1px 5px;" title="Open in Google Drive">DRIVE ↗</a>
            </div>
          </div>
          <div class="clip-take-meta">
            <span style="color:var(--accent-cyan);">${size}</span>
            <span class="clip-badge-approved">✓ VERIFIED</span>
          </div>
        </div>
      `;

      clipCard.addEventListener('click', () => {
        if (isFolder) {
          window.open(viewUrl, '_blank');
          return;
        }
        
        this.activeClipIndex = index;
        document.querySelectorAll('.clip-item-card').forEach(c => c.classList.remove('active'));
        clipCard.classList.add('active');
        // Load the video in the Drive embed player
        this.loadDriveVideoInPlayer(embedUrl, video.name);
      });

      this.clipsListContainer.appendChild(clipCard);
    });

    // Auto-load first video if it exists
    const firstVideo = driveVideos.find(v => v.mimeType !== 'application/vnd.google-apps.folder');
    if (firstVideo) {
      const firstEmbedUrl = `https://drive.google.com/file/d/${firstVideo.id}/preview`;
      this.loadDriveVideoInPlayer(firstEmbedUrl, firstVideo.name);
    } else {
      // If only folders exist, show placeholder
      if (this.driveEmbedContainer) {
        this.driveEmbedContainer.innerHTML = `
          <div class="drive-video-player-wrap">
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(4, 8, 12, 0.92); color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8rem; gap: 12px; z-index: 5;">
              <div style="font-size:2rem;">📁</div>
              <span>THIS TASK CONTAINS SUB-FOLDERS</span>
              <span style="font-size:0.65rem;">Click a folder on the right to open it in Google Drive.</span>
            </div>
          </div>
        `;
      }
    }
  }

  loadDriveVideoInPlayer(embedUrl, videoName) {
    // Switch to Drive embed mode
    this.switchViewerMode('drive');

    if (!this.driveEmbedContainer) return;

    // Show a loading state then set the iframe
    this.driveEmbedContainer.innerHTML = `
      <div class="drive-video-player-wrap">
        <div class="drive-video-loading-overlay" id="driveLoadingOverlay">
          <div class="drive-loading-spinner"></div>
          <span>LOADING VIDEO STREAM...</span>
          <span style="font-size:0.65rem;color:var(--text-secondary);">${videoName || ''}</span>
        </div>
        <iframe
          src="${embedUrl}"
          allow="autoplay; fullscreen"
          allowfullscreen
          onload="const ov=document.getElementById('driveLoadingOverlay'); if(ov) ov.style.display='none';"
        ></iframe>
      </div>
    `;
  }



  initCategoryFilters() {
    const categories = ['All', ...new Set(this.tasks.map(t => t.category))];
    if (!this.categoryFiltersEl) return;

    this.categoryFiltersEl.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${cat === this.currentCategory ? 'active' : ''}`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        this.currentCategory = cat;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyFilters();
      });
      this.categoryFiltersEl.appendChild(btn);
    });
  }



  switchLibraryView(mode) {
    this.currentViewMode = mode;
    if (mode === 'grid') {
      this.btnViewGrid?.classList.add('active');
      this.btnViewFolders?.classList.remove('active');
      if (this.taskGridEl) this.taskGridEl.style.display = 'grid';
      if (this.foldersGridEl) this.foldersGridEl.style.display = 'none';
      if (this.gridHeaderLabel) this.gridHeaderLabel.textContent = 'TASK MATRIX // CLICK ANY SKILL CARD TO EXPLORE 10 POV TAKES & ANNOTATIONS';
    } else {
      this.btnViewGrid?.classList.remove('active');
      this.btnViewFolders?.classList.add('active');
      if (this.taskGridEl) this.taskGridEl.style.display = 'none';
      if (this.foldersGridEl) this.foldersGridEl.style.display = 'grid';
      if (this.gridHeaderLabel) this.gridHeaderLabel.textContent = 'GOOGLE DRIVE FOLDERS // MY DRIVE > ROBOT (36 TASK DIRECTORIES)';
    }
  }

  applyFilters() {
    this.filteredTasks = this.tasks.filter(task => {
      const matchCat = this.currentCategory === 'All' || task.category === this.currentCategory;
      const matchSearch = !this.searchQuery || 
        task.title.toLowerCase().includes(this.searchQuery) ||
        task.folderName.toLowerCase().includes(this.searchQuery) ||
        task.category.toLowerCase().includes(this.searchQuery) ||
        task.code.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });

    this.renderTaskGrid();
    this.renderFoldersGrid();
  }

  renderFoldersGrid() {
    if (!this.foldersGridEl) return;
    this.foldersGridEl.innerHTML = '';

    if (this.filteredTasks.length === 0) {
      this.foldersGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary); font-family: var(--font-mono);">
          <div style="font-size: 2rem; color: var(--accent-cyan); margin-bottom: 10px;">⚡</div>
          NO DRIVE FOLDERS FOUND MATCHING "${this.searchQuery.toUpperCase()}"
        </div>
      `;
      return;
    }

    this.filteredTasks.forEach((task) => {
      const folderCard = document.createElement('div');
      folderCard.className = 'drive-folder-card tech-corner-box';
      folderCard.id = `folder-card-${task.id}`;

      const driveUrl = task.driveUrl || `${ROOT_DRIVE_URL}?q=${encodeURIComponent(task.folderName)}`;

      folderCard.innerHTML = `
        <div class="drive-folder-left">
          <div class="drive-folder-icon">📁</div>
          <div class="drive-folder-info">
            <div class="drive-folder-name" title="${task.folderName}">${task.folderName}</div>
            <div class="drive-folder-meta">
              <span>${task.totalClips} videos</span>
              <span>•</span>
              <span style="color: var(--accent-cyan);">${task.category}</span>
            </div>
          </div>
        </div>
        <div class="drive-folder-actions">
          <a href="${driveUrl}" target="_blank" onclick="event.stopPropagation();" class="drive-btn-small" style="font-size: 0.6rem; padding: 3px 6px;" title="Open directly in Google Drive">
            DRIVE ↗
          </a>
          <button class="action-btn" style="font-size: 0.6rem; padding: 3px 8px;" title="Open Folder Details & Video Player">
            VIEW
          </button>
        </div>
      `;

      folderCard.addEventListener('click', () => this.openTaskModal(task));
      this.foldersGridEl.appendChild(folderCard);
    });
  }

  renderTaskGrid() {
    if (!this.taskGridEl) return;
    this.taskGridEl.innerHTML = '';

    if (this.totalTasksCountEl) this.totalTasksCountEl.textContent = `${this.filteredTasks.length} TASKS`;
    const totalClips = this.filteredTasks.reduce((acc, t) => acc + (t.clips?.length || 0), 0);
    if (this.totalClipsCountEl) this.totalClipsCountEl.textContent = `${totalClips} CLIPS`;
    if (this.datasetLoadedBadge) this.datasetLoadedBadge.textContent = `● ${this.filteredTasks.length}/${this.tasks.length} FOLDERS LOADED`;

    if (this.filteredTasks.length === 0) {
      this.taskGridEl.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary); font-family: var(--font-mono);">
          <div style="font-size: 2rem; color: var(--accent-cyan); margin-bottom: 10px;">⚡</div>
          NO TASK FOLDERS FOUND MATCHING QUERY "${this.searchQuery.toUpperCase()}"
        </div>
      `;
      return;
    }

    this.filteredTasks.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'skill-card tech-corner-box';
      card.id = `skill-card-${task.id}`;

      const iconSvg = this.getTaskIconSvg(task.iconType);

      // Map of task IDs to custom local thumbnail images
      const CUSTOM_THUMBS = {
        1:  'images/thumbnails/task_01_fruits_griping_supermarket.jpg',
        2:  'images/thumbnails/task_02_grip_apple.jpg',
        3:  'images/thumbnails/task_03_opening_bottle.jpg',
        4:  'images/thumbnails/task_04_graphs_videos.jpg',
        5:  'images/thumbnails/task_05_robot_bottle_opening.jpg',
        6:  'images/thumbnails/task_06_grip_meta_case.jpg',
        7:  'images/thumbnails/task_07_grip_mouse.jpg',
        8:  'images/thumbnails/task_08_open_coca_cola.jpg',
        9:  'images/thumbnails/task_09_open_close_bottle_new1.jpg',
        10: 'images/thumbnails/task_10_open_close_bottle_new.jpg',
        11: 'images/thumbnails/task_11_3d_test.jpg',
        12: 'images/thumbnails/task_12_open_close_bottle_001.jpg',
        13: 'images/thumbnails/task_13_rayban_case_close.jpg',
        14: 'images/thumbnails/task_14_rayban_case_open.jpg',
        15: 'images/thumbnails/task_15_lock_padlock.jpg',
        16: 'images/thumbnails/task_16_open_padlock.jpg',
        17: 'images/thumbnails/task_17_jabra.jpg',
        18: 'images/thumbnails/task_18_opening_book2.jpg',
        19: 'images/thumbnails/task_19_opening_book.jpg',
        20: 'images/thumbnails/task_20_closing_book.jpg',
        21: 'images/thumbnails/task_21_laptop_bag_close.jpg',
        22: 'images/thumbnails/task_22_laptop_bag_open.jpg',
        23: 'images/thumbnails/task_23_folding_tshirt.jpg',
        24: 'images/thumbnails/task_24_pour_water.jpg',
        25: 'images/thumbnails/task_25_charger_remove.jpg',
        26: 'images/thumbnails/task_26_charger_insert.jpg',
        27: 'images/thumbnails/task_27_turn_on_switch.jpg',
        28: 'images/thumbnails/task_28_load_staple.jpg',
        29: 'images/thumbnails/task_29_uncharging_laptop.jpg',
        30: 'images/thumbnails/task_30_charging_laptop.jpg',
        31: 'images/thumbnails/task_31_turn_off_switch.jpg',
        32: 'images/thumbnails/task_32_unpack_kangaro.jpg',
        33: 'images/thumbnails/task_33_unpack_staples.jpg',
        34: 'images/thumbnails/task_34_pen_open_close.jpg',
        35: 'images/thumbnails/task_35_insert_cable_charger.jpg',
        36: 'images/thumbnails/task_36_take_glass_box.jpg',
        37: 'images/thumbnails/task_37_changing_ac_batteries.jpg',
        38: 'images/thumbnails/task_38_insert_earbuds.jpg',
        39: 'images/thumbnails/task_39_connect_charging_cable.jpg',
        40: 'images/thumbnails/task_40_place_torch_batteries.jpg',
        41: 'images/thumbnails/task_41_remove_cable_charger.jpg',
        42: 'images/thumbnails/task_42_remove_torch_batteries.jpg',
      };

      let cardThumbnailHtml = '';
      const customThumb = CUSTOM_THUMBS[task.id];

      if (customThumb) {
        // Use the custom generated AI image
        cardThumbnailHtml = `
          <img src="${customThumb}" alt="${task.title}" loading="lazy" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:2;">
          <div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%); z-index:3;"></div>
          <div class="play-hover-prompt" style="z-index:4;">
            <div class="play-icon">▶</div>
            <div class="play-label">OPEN FOLDER</div>
          </div>
        `;
      } else if (task.clips && task.clips.length > 0) {
        const firstClipId = task.clips[0].id;
        const thumbUrl = `https://drive.google.com/thumbnail?id=${firstClipId}&sz=w600-h400`;
        cardThumbnailHtml = `
          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:3rem; color:rgba(0,240,255,0.3);">🎬</div>
          <img src="${thumbUrl}" alt="Cover" loading="lazy" onerror="this.outerHTML='<div style=&quot;position:absolute; inset:0; z-index:2; overflow:hidden;&quot;><iframe loading=&quot;lazy&quot; src=&quot;https://drive.google.com/file/d/${firstClipId}/preview&quot; style=&quot;width:100%; height:100%; border:none; pointer-events:none;&quot; tabindex=&quot;-1&quot;></iframe></div>'" style="position:relative; z-index:2; width:100%;height:100%;object-fit:cover;display:block;">
          <div class="play-hover-prompt">
            <div class="play-icon">▶</div>
            <div class="play-label">OPEN FOLDER</div>
          </div>
        `;
      } else {
        cardThumbnailHtml = `
          <canvas class="card-thumbnail-canvas" id="canvas-thumb-${task.id}"></canvas>
          <div class="thumbnail-overlay-grid"></div>
          <div class="thumbnail-icon-watermark">${iconSvg}</div>
          <div class="play-hover-prompt">
            <div class="play-icon">▶</div>
            <div class="play-label">OPEN FOLDER</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-top-bar">
          <div class="card-index">${task.id}</div>
          <div class="rec-indicator">
            <span class="rec-dot"></span>
            <span>REC</span>
          </div>
          <div class="card-clips-badge">${task.totalClips} CLIPS</div>
        </div>

        <div class="card-thumbnail" style="background: ${task.thumbnailGradient};">
          ${cardThumbnailHtml}
        </div>

        <div class="card-bottom-info">
          <div class="card-task-title">${task.title}</div>
          <div class="card-meta-row">
            <span class="card-category-tag">${task.category}</span>
            <span class="card-status-pill" style="
              ${task.status === 'Approved' ? 'color: var(--accent-emerald); border-color: var(--accent-emerald);' : ''}
              ${task.status === 'Needs Retake' ? 'color: var(--accent-red); border-color: var(--accent-red); background: rgba(255,51,68,0.1);' : ''}
            ">${task.status}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => this.openTaskModal(task));
      this.taskGridEl.appendChild(card);

      setTimeout(() => this.drawMiniThumbnail(task.id, task), 10);
    });
  }

  drawMiniThumbnail(id, task) {
    const canvas = document.getElementById(`canvas-thumb-${id}`);
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      const W = 240, H = 140;
      canvas.width = W;
      canvas.height = H;

      // ── Shared background ──────────────────────────────────────────────
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, task.thumbnailGradient ? '#061320' : '#061320');
      bgGrad.addColorStop(1, '#020c16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // subtle grid
      ctx.strokeStyle = 'rgba(0,240,255,0.07)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // corner bracket decorations
      const bL = 8;
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5;
      [[6,6],[W-6,6],[6,H-6],[W-6,H-6]].forEach(([cx,cy]) => {
        const sx = cx < W/2 ? 1 : -1, sy = cy < H/2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+sx*bL,cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+sy*bL); ctx.stroke();
      });

      // ── Draw icon-specific illustration ───────────────────────────────
      const iconType = task.iconType || 'box';
      this.drawTaskIcon(ctx, iconType, W, H, task);

      // ── HUD overlay text ──────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,240,255,0.75)';
      ctx.font = 'bold 7px JetBrains Mono, monospace';
      ctx.fillText('CAM_01 • 4K • 60FPS', 10, 12);

      ctx.fillStyle = 'rgba(0,255,170,0.8)';
      ctx.font = '7px JetBrains Mono, monospace';
      const conf = task.clips?.[0]?.confidence || '99.0%';
      ctx.fillText(`CONF: ${conf}`, W - 60, 12);

      // scan line effect
      for (let sy = 0; sy < H; sy += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, sy, W, 1);
      }
    } catch (e) {
      console.warn('Mini thumbnail render skipped:', e);
    }
  }

  drawTaskIcon(ctx, type, W, H, task) {
    // Polyfill roundRect for older browsers
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, w, h, r) {
        const rr = Math.min(r, w/2, h/2);
        this.moveTo(x + rr, y);
        this.lineTo(x + w - rr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + rr);
        this.lineTo(x + w, y + h - rr);
        this.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        this.lineTo(x + rr, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - rr);
        this.lineTo(x, y + rr);
        this.quadraticCurveTo(x, y, x + rr, y);
        this.closePath();
      };
    }
    const cx = W / 2, cy = H / 2;
    const cyan = '#00f0ff', green = '#00ffaa', orange = '#ff8c00', red = '#ff3344', yellow = '#ffe066', purple = '#c084fc';

    const helpers = {
      glow: (color, size = 12) => { ctx.shadowColor = color; ctx.shadowBlur = size; },
      noGlow: () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; },
      line: (x1, y1, x2, y2, color, lw = 1.5) => {
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      },
      rect: (x, y, w, h, color, fill = false, lw = 1.5) => {
        if (fill) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
        else { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
      },
      arc: (x, y, r, color, fill = false, sa = 0, ea = Math.PI*2) => {
        ctx.beginPath(); ctx.arc(x, y, r, sa, ea);
        if (fill) { ctx.fillStyle = color; ctx.fill(); }
        else { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
      },
      dot: (x, y, r, color) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill(); },
      text: (t, x, y, color, size = 9) => { ctx.fillStyle = color; ctx.font = `bold ${size}px Orbitron, monospace`; ctx.fillText(t, x, y); }
    };

    switch(type) {

      case 'box': {
        // 3D isometric box
        helpers.glow(cyan, 10);
        const bx = cx, by = cy - 5, bw = 50, bh = 35, bd = 18;
        // top face
        ctx.beginPath();
        ctx.moveTo(bx, by - bd/2);
        ctx.lineTo(bx + bw/2, by);
        ctx.lineTo(bx, by + bd/2);
        ctx.lineTo(bx - bw/2, by);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.15)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // right face
        ctx.beginPath();
        ctx.moveTo(bx + bw/2, by);
        ctx.lineTo(bx + bw/2, by + bh);
        ctx.lineTo(bx, by + bh + bd/2);
        ctx.lineTo(bx, by + bd/2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.07)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // left face
        ctx.beginPath();
        ctx.moveTo(bx - bw/2, by);
        ctx.lineTo(bx - bw/2, by + bh);
        ctx.lineTo(bx, by + bh + bd/2);
        ctx.lineTo(bx, by + bd/2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,200,220,0.05)'; ctx.fill();
        ctx.strokeStyle = 'rgba(0,240,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        // tape lines on top
        helpers.line(bx - bw/2, by, bx + bw/2, by, 'rgba(255,224,102,0.5)', 2);
        helpers.line(bx, by - bd/2, bx, by + bd/2, 'rgba(255,224,102,0.5)', 2);
        helpers.noGlow();
        helpers.text('PACKAGE', bx - 26, H - 18, 'rgba(0,240,255,0.5)', 7);
        break;
      }

      case 'stapler': {
        helpers.glow(purple, 8);
        // stapler body
        ctx.beginPath();
        ctx.roundRect(cx - 45, cy - 10, 90, 22, 5);
        ctx.fillStyle = 'rgba(150,80,255,0.2)'; ctx.fill();
        ctx.strokeStyle = purple; ctx.lineWidth = 2; ctx.stroke();
        // stapler top arm
        ctx.beginPath();
        ctx.roundRect(cx - 40, cy - 26, 70, 16, 4);
        ctx.fillStyle = 'rgba(150,80,255,0.15)'; ctx.fill();
        ctx.strokeStyle = 'rgba(192,132,252,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
        // hinge
        helpers.arc(cx + 30, cy - 10, 7, purple);
        // staple slot
        helpers.line(cx - 30, cy - 3, cx + 20, cy - 3, 'rgba(0,240,255,0.6)', 1);
        helpers.noGlow();
        helpers.text('STAPLER', cx - 22, H - 18, 'rgba(192,132,252,0.6)', 7);
        break;
      }

      case 'cable': {
        helpers.glow(orange, 10);
        // cable wire
        ctx.beginPath();
        ctx.moveTo(40, cy);
        ctx.bezierCurveTo(80, cy - 30, 160, cy + 30, 200, cy);
        ctx.strokeStyle = orange; ctx.lineWidth = 3; ctx.stroke();
        // plug head left
        helpers.rect(28, cy - 10, 18, 20, orange, true);
        helpers.rect(28, cy - 10, 18, 20, 'rgba(255,140,0,0.3)');
        helpers.line(22, cy - 5, 28, cy - 5, orange, 2.5);
        helpers.line(22, cy + 5, 28, cy + 5, orange, 2.5);
        // plug head right
        helpers.rect(194, cy - 12, 22, 24, orange, true);
        helpers.rect(194, cy - 12, 22, 24, 'rgba(255,140,0,0.3)');
        helpers.line(216, cy, 222, cy, orange, 3);
        helpers.noGlow();
        helpers.text('BARREL CONN', cx - 30, H - 18, 'rgba(255,140,0,0.6)', 7);
        break;
      }

      case 'switch': {
        helpers.glow(green, 12);
        // wall plate
        ctx.beginPath();
        ctx.roundRect(cx - 30, cy - 40, 60, 75, 6);
        ctx.fillStyle = 'rgba(0,255,170,0.08)'; ctx.fill();
        ctx.strokeStyle = green; ctx.lineWidth = 2; ctx.stroke();
        // switch rocker ON position
        ctx.beginPath();
        ctx.roundRect(cx - 16, cy - 30, 32, 28, 3);
        ctx.fillStyle = 'rgba(0,255,170,0.3)'; ctx.fill();
        ctx.strokeStyle = green; ctx.lineWidth = 1.5; ctx.stroke();
        // ON text
        ctx.fillStyle = green; ctx.font = 'bold 9px monospace';
        ctx.fillText('ON', cx - 7, cy - 11);
        // off zone
        ctx.beginPath();
        ctx.roundRect(cx - 16, cy + 4, 32, 14, 3);
        ctx.fillStyle = 'rgba(0,255,170,0.05)'; ctx.fill();
        ctx.strokeStyle = 'rgba(0,255,170,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,170,0.3)'; ctx.font = '7px monospace';
        ctx.fillText('OFF', cx - 7, cy + 14);
        // glow dot
        helpers.dot(cx, cy - 50, 4, green);
        helpers.noGlow();
        helpers.text('SWITCH', cx - 18, H - 18, 'rgba(0,255,170,0.6)', 7);
        break;
      }

      case 'switch-off': {
        helpers.glow(red, 10);
        // wall plate
        ctx.beginPath();
        ctx.roundRect(cx - 30, cy - 40, 60, 75, 6);
        ctx.fillStyle = 'rgba(255,51,68,0.06)'; ctx.fill();
        ctx.strokeStyle = red; ctx.lineWidth = 2; ctx.stroke();
        // switch rocker OFF position
        ctx.beginPath();
        ctx.roundRect(cx - 16, cy - 2, 32, 28, 3);
        ctx.fillStyle = 'rgba(255,51,68,0.25)'; ctx.fill();
        ctx.strokeStyle = red; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = red; ctx.font = 'bold 9px monospace';
        ctx.fillText('OFF', cx - 9, cy + 17);
        helpers.noGlow();
        helpers.text('SWITCH', cx - 18, H - 18, 'rgba(255,51,68,0.6)', 7);
        break;
      }

      case 'bottle': {
        helpers.glow(cyan, 10);
        // bottle body
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 10);
        ctx.lineTo(cx - 22, cy + 30);
        ctx.lineTo(cx + 22, cy + 30);
        ctx.lineTo(cx + 18, cy - 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.12)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // neck
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 10);
        ctx.lineTo(cx - 10, cy - 30);
        ctx.lineTo(cx + 10, cy - 30);
        ctx.lineTo(cx + 18, cy - 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.1)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // cap
        helpers.rect(cx - 8, cy - 40, 16, 12, 'rgba(0,240,255,0.4)', true);
        helpers.rect(cx - 8, cy - 40, 16, 12, cyan);
        // liquid fill
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 10);
        ctx.lineTo(cx - 21, cy + 28);
        ctx.lineTo(cx + 21, cy + 28);
        ctx.lineTo(cx + 20, cy + 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,200,255,0.25)'; ctx.fill();
        helpers.noGlow();
        helpers.text('BOTTLE', cx - 18, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      case 'water': {
        helpers.glow('#4db8ff', 10);
        // glass vessel
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy - 15);
        ctx.lineTo(cx - 26, cy + 32);
        ctx.lineTo(cx + 26, cy + 32);
        ctx.lineTo(cx + 22, cy - 15);
        ctx.closePath();
        ctx.fillStyle = 'rgba(77,184,255,0.1)'; ctx.fill();
        ctx.strokeStyle = '#4db8ff'; ctx.lineWidth = 1.5; ctx.stroke();
        // pour stream from above
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 40);
        ctx.bezierCurveTo(cx - 8, cy - 25, cx + 8, cy - 20, cx + 4, cy - 15);
        ctx.strokeStyle = 'rgba(77,184,255,0.8)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 40);
        ctx.bezierCurveTo(cx, cy - 25, cx + 12, cy - 20, cx + 8, cy - 15);
        ctx.strokeStyle = 'rgba(77,184,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        // water level fill
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 10);
        ctx.lineTo(cx - 24, cy + 30);
        ctx.lineTo(cx + 24, cy + 30);
        ctx.lineTo(cx + 20, cy + 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(77,184,255,0.3)'; ctx.fill();
        // droplets
        helpers.dot(cx - 15, cy - 28, 2, 'rgba(77,184,255,0.7)');
        helpers.dot(cx + 18, cy - 22, 1.5, 'rgba(77,184,255,0.5)');
        helpers.noGlow();
        helpers.text('POUR WATER', cx - 28, H - 18, 'rgba(77,184,255,0.7)', 7);
        break;
      }

      case 'glass': {
        helpers.glow(cyan, 8);
        // glass tumbler
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 28);
        ctx.lineTo(cx - 24, cy + 28);
        ctx.lineTo(cx + 24, cy + 28);
        ctx.lineTo(cx + 20, cy - 28);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.08)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // liquid inside
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy + 4);
        ctx.lineTo(cx - 22, cy + 26);
        ctx.lineTo(cx + 22, cy + 26);
        ctx.lineTo(cx + 16, cy + 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,200,255,0.3)'; ctx.fill();
        // rim highlight
        helpers.line(cx - 20, cy - 28, cx + 20, cy - 28, 'rgba(0,240,255,0.6)', 2);
        // base
        helpers.rect(cx - 26, cy + 28, 52, 4, 'rgba(0,240,255,0.4)', true);
        helpers.noGlow();
        helpers.text('GLASS', cx - 15, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      case 'apple': {
        helpers.glow('#ff6b6b', 10);
        // apple body
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,107,107,0.2)'; ctx.fill();
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.stroke();
        // left bump of apple top
        ctx.beginPath();
        ctx.arc(cx - 9, cy - 17, 10, Math.PI, 0);
        ctx.fillStyle = 'rgba(255,107,107,0.2)'; ctx.fill();
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.stroke();
        // right bump
        ctx.beginPath();
        ctx.arc(cx + 9, cy - 17, 10, Math.PI, 0);
        ctx.fillStyle = 'rgba(255,107,107,0.2)'; ctx.fill();
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.stroke();
        // stem
        helpers.line(cx, cy - 25, cx + 5, cy - 38, green, 2);
        // leaf
        ctx.beginPath();
        ctx.ellipse(cx + 10, cy - 36, 8, 4, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,170,0.4)'; ctx.fill();
        ctx.strokeStyle = green; ctx.lineWidth = 1; ctx.stroke();
        // shine
        helpers.dot(cx - 10, cy - 2, 4, 'rgba(255,200,200,0.3)');
        helpers.noGlow();
        helpers.text('APPLE', cx - 14, H - 18, 'rgba(255,107,107,0.7)', 7);
        break;
      }

      case 'glasses': {
        helpers.glow(yellow, 10);
        const gy = cy + 5;
        // left lens
        ctx.beginPath();
        ctx.roundRect(cx - 55, gy - 16, 46, 32, 14);
        ctx.fillStyle = 'rgba(255,224,102,0.12)'; ctx.fill();
        ctx.strokeStyle = yellow; ctx.lineWidth = 2; ctx.stroke();
        // right lens
        ctx.beginPath();
        ctx.roundRect(cx + 9, gy - 16, 46, 32, 14);
        ctx.fillStyle = 'rgba(255,224,102,0.12)'; ctx.fill();
        ctx.strokeStyle = yellow; ctx.lineWidth = 2; ctx.stroke();
        // bridge
        helpers.line(cx - 9, gy, cx + 9, gy, yellow, 2);
        // left arm
        helpers.line(cx - 55, gy - 6, cx - 75, gy - 10, yellow, 2);
        // right arm
        helpers.line(cx + 55, gy - 6, cx + 75, gy - 10, yellow, 2);
        // lens shine
        helpers.line(cx - 46, gy - 10, cx - 38, gy - 4, 'rgba(255,224,102,0.4)', 1.5);
        helpers.line(cx + 20, gy - 10, cx + 28, gy - 4, 'rgba(255,224,102,0.4)', 1.5);
        helpers.noGlow();
        helpers.text('RAY-BAN', cx - 20, H - 18, 'rgba(255,224,102,0.7)', 7);
        break;
      }

      case 'earbuds': {
        helpers.glow(purple, 10);
        // left earbud
        helpers.arc(cx - 30, cy, 16, purple);
        ctx.beginPath(); ctx.arc(cx - 30, cy, 16, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(192,132,252,0.15)'; ctx.fill();
        helpers.dot(cx - 30, cy, 6, 'rgba(192,132,252,0.5)');
        helpers.arc(cx - 30, cy, 10, 'rgba(192,132,252,0.4)');
        // right earbud
        helpers.arc(cx + 30, cy, 16, purple);
        ctx.beginPath(); ctx.arc(cx + 30, cy, 16, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(192,132,252,0.15)'; ctx.fill();
        helpers.dot(cx + 30, cy, 6, 'rgba(192,132,252,0.5)');
        helpers.arc(cx + 30, cy, 10, 'rgba(192,132,252,0.4)');
        // cable
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy);
        ctx.bezierCurveTo(cx - 5, cy + 20, cx + 5, cy + 20, cx + 14, cy);
        ctx.strokeStyle = 'rgba(192,132,252,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        // stem on each bud
        helpers.line(cx - 30, cy + 16, cx - 30, cy + 28, purple, 2);
        helpers.line(cx + 30, cy + 16, cx + 30, cy + 28, purple, 2);
        helpers.noGlow();
        helpers.text('EARBUDS', cx - 20, H - 18, 'rgba(192,132,252,0.7)', 7);
        break;
      }

      case 'bag': {
        helpers.glow(orange, 8);
        // bag body
        ctx.beginPath();
        ctx.roundRect(cx - 32, cy - 20, 64, 52, 6);
        ctx.fillStyle = 'rgba(255,140,0,0.12)'; ctx.fill();
        ctx.strokeStyle = orange; ctx.lineWidth = 2; ctx.stroke();
        // handle
        ctx.beginPath();
        ctx.arc(cx, cy - 30, 18, Math.PI, 0);
        ctx.strokeStyle = orange; ctx.lineWidth = 3; ctx.stroke();
        // zipper
        helpers.line(cx - 28, cy - 8, cx + 28, cy - 8, 'rgba(255,224,102,0.6)', 1.5);
        helpers.dot(cx + 4, cy - 8, 3, yellow);
        // pocket
        ctx.beginPath();
        ctx.roundRect(cx - 18, cy + 4, 36, 22, 4);
        ctx.strokeStyle = 'rgba(255,140,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        helpers.noGlow();
        helpers.text('BAG', cx - 10, H - 18, 'rgba(255,140,0,0.7)', 7);
        break;
      }

      case 'book': {
        helpers.glow(cyan, 8);
        // book cover
        ctx.beginPath();
        ctx.roundRect(cx - 35, cy - 38, 70, 76, 3);
        ctx.fillStyle = 'rgba(0,240,255,0.1)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 2; ctx.stroke();
        // spine
        helpers.line(cx - 8, cy - 38, cx - 8, cy + 38, 'rgba(0,240,255,0.5)', 3);
        // pages lines
        for (let li = -25; li <= 25; li += 8) {
          helpers.line(cx - 4, cy + li, cx + 32, cy + li, 'rgba(0,240,255,0.2)', 0.8);
        }
        // title block
        helpers.rect(cx, cy - 28, 28, 8, 'rgba(0,240,255,0.3)', true);
        helpers.rect(cx, cy - 18, 20, 4, 'rgba(0,240,255,0.2)', true);
        helpers.noGlow();
        helpers.text('BOOK', cx - 12, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      case 'lock': {
        helpers.glow(yellow, 12);
        // shackle
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 18, Math.PI, 0);
        ctx.strokeStyle = yellow; ctx.lineWidth = 5; ctx.stroke();
        helpers.line(cx - 18, cy - 14, cx - 18, cy + 2, yellow, 5);
        helpers.line(cx + 18, cy - 14, cx + 18, cy + 2, yellow, 5);
        // body
        ctx.beginPath();
        ctx.roundRect(cx - 26, cy, 52, 40, 5);
        ctx.fillStyle = 'rgba(255,224,102,0.2)'; ctx.fill();
        ctx.strokeStyle = yellow; ctx.lineWidth = 2; ctx.stroke();
        // keyhole
        helpers.dot(cx, cy + 16, 6, 'rgba(255,224,102,0.6)');
        helpers.line(cx, cy + 22, cx, cy + 32, 'rgba(255,224,102,0.6)', 3);
        helpers.noGlow();
        helpers.text('PADLOCK', cx - 20, H - 18, 'rgba(255,224,102,0.7)', 7);
        break;
      }

      case 'mouse': {
        helpers.glow(cyan, 8);
        // mouse body
        ctx.beginPath();
        ctx.moveTo(cx, cy - 35);
        ctx.bezierCurveTo(cx + 22, cy - 35, cx + 26, cy, cx + 24, cy + 28);
        ctx.bezierCurveTo(cx + 20, cy + 40, cx - 20, cy + 40, cx - 24, cy + 28);
        ctx.bezierCurveTo(cx - 26, cy, cx - 22, cy - 35, cx, cy - 35);
        ctx.fillStyle = 'rgba(0,240,255,0.1)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 2; ctx.stroke();
        // center divider
        helpers.line(cx, cy - 35, cx, cy + 5, 'rgba(0,240,255,0.5)', 1.5);
        // scroll wheel
        ctx.beginPath();
        ctx.roundRect(cx - 5, cy - 16, 10, 20, 4);
        ctx.fillStyle = 'rgba(0,240,255,0.3)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1; ctx.stroke();
        // cable
        helpers.line(cx, cy - 35, cx, cy - 55, 'rgba(0,240,255,0.4)', 2);
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 55, 8, Math.PI, 0);
        ctx.strokeStyle = 'rgba(0,240,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
        helpers.noGlow();
        helpers.text('MOUSE', cx - 15, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      case 'pen': {
        helpers.glow(cyan, 8);
        // pen barrel (angled)
        const ang = -0.4;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        // barrel
        ctx.beginPath();
        ctx.roundRect(-50, -7, 95, 14, 5);
        ctx.fillStyle = 'rgba(0,240,255,0.12)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // cap at left
        ctx.beginPath();
        ctx.roundRect(-60, -8, 16, 16, 4);
        ctx.fillStyle = 'rgba(0,240,255,0.3)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 1.5; ctx.stroke();
        // nib at right
        ctx.beginPath();
        ctx.moveTo(45, -5);
        ctx.lineTo(68, 0);
        ctx.lineTo(45, 5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,224,102,0.5)'; ctx.fill();
        ctx.strokeStyle = yellow; ctx.lineWidth = 1.5; ctx.stroke();
        // clip strip
        helpers.line(-50, -10, 30, -10, 'rgba(0,240,255,0.4)', 1);
        ctx.restore();
        helpers.noGlow();
        helpers.text('PEN CAP', cx - 18, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      case 'battery': {
        helpers.glow(green, 10);
        // battery body
        ctx.beginPath();
        ctx.roundRect(cx - 40, cy - 18, 80, 36, 5);
        ctx.fillStyle = 'rgba(0,255,170,0.1)'; ctx.fill();
        ctx.strokeStyle = green; ctx.lineWidth = 2; ctx.stroke();
        // positive terminal
        helpers.rect(cx + 40, cy - 8, 8, 16, 'rgba(0,255,170,0.5)', true);
        helpers.rect(cx + 40, cy - 8, 8, 16, green);
        // charge fill bars
        const bars = 4;
        for (let b = 0; b < bars; b++) {
          const filled = b < 3;
          ctx.beginPath();
          ctx.roundRect(cx - 34 + b * 18, cy - 11, 12, 22, 2);
          ctx.fillStyle = filled ? 'rgba(0,255,170,0.45)' : 'rgba(0,255,170,0.08)';
          ctx.fill();
          ctx.strokeStyle = filled ? green : 'rgba(0,255,170,0.3)';
          ctx.lineWidth = 1; ctx.stroke();
        }
        helpers.noGlow();
        helpers.text('BATTERY', cx - 20, H - 18, 'rgba(0,255,170,0.7)', 7);
        break;
      }

      case 'shirt': {
        helpers.glow(cyan, 8);
        // T-shirt shape
        ctx.beginPath();
        // left sleeve start
        ctx.moveTo(cx - 45, cy - 20);
        ctx.lineTo(cx - 25, cy - 32);
        // left shoulder curve in to neck
        ctx.lineTo(cx - 14, cy - 30);
        ctx.quadraticCurveTo(cx, cy - 20, cx + 14, cy - 30);
        // right shoulder to right sleeve
        ctx.lineTo(cx + 25, cy - 32);
        ctx.lineTo(cx + 45, cy - 20);
        // right sleeve bottom
        ctx.lineTo(cx + 38, cy - 8);
        // body right
        ctx.lineTo(cx + 30, cy - 8);
        ctx.lineTo(cx + 28, cy + 32);
        // bottom
        ctx.lineTo(cx - 28, cy + 32);
        // body left
        ctx.lineTo(cx - 30, cy - 8);
        ctx.lineTo(cx - 38, cy - 8);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,240,255,0.12)'; ctx.fill();
        ctx.strokeStyle = cyan; ctx.lineWidth = 2; ctx.stroke();
        // fold lines
        helpers.line(cx - 10, cy - 8, cx - 10, cy + 32, 'rgba(0,240,255,0.2)', 1);
        helpers.line(cx + 10, cy - 8, cx + 10, cy + 32, 'rgba(0,240,255,0.2)', 1);
        helpers.noGlow();
        helpers.text('T-SHIRT FOLD', cx - 30, H - 18, 'rgba(0,240,255,0.6)', 7);
        break;
      }

      default: {
        // Generic robot arm / HUD reticle fallback
        helpers.glow(cyan, 8);
        helpers.arc(cx, cy, 28, cyan);
        helpers.arc(cx, cy, 18, 'rgba(0,240,255,0.4)');
        helpers.dot(cx, cy, 4, cyan);
        helpers.line(cx, cy - 42, cx, cy - 30, cyan, 1.5);
        helpers.line(cx, cy + 30, cx, cy + 42, cyan, 1.5);
        helpers.line(cx - 42, cy, cx - 30, cy, cyan, 1.5);
        helpers.line(cx + 30, cy, cx + 42, cy, cyan, 1.5);
        helpers.noGlow();
        break;
      }
    }
  }

  getTaskIconSvg(type) {
    const icons = {
      box: '📦',
      bottle: '🍾',
      stapler: '📎',
      switch: '⚡',
      'switch-off': '🔌',
      water: '💧',
      shirt: '👕',
      apple: '🍎',
      glasses: '👓',
      earbuds: '🎧',
      cable: '🔌',
      bag: '🎒',
      book: '📖',
      lock: '🔒',
      mouse: '🖱️',
      pen: '🖊️',
      battery: '🔋',
      glass: '🥛'
    };
    return icons[type] || '🤖';
  }

  switchViewerMode(mode) {
    this.currentViewerMode = mode;
    if (mode === 'hud') {
      this.btnModeHUD?.classList.add('active');
      this.btnModeDrive?.classList.remove('active');
      if (this.playerCanvas) this.playerCanvas.style.display = 'block';
      if (this.driveEmbedContainer) this.driveEmbedContainer.style.display = 'none';
      if (this.playerHudOverlay) this.playerHudOverlay.style.display = 'flex';
      if (this.playerControlsContainer) this.playerControlsContainer.style.display = 'flex';
    } else {
      this.btnModeHUD?.classList.remove('active');
      this.btnModeDrive?.classList.add('active');
      if (this.playerCanvas) this.playerCanvas.style.display = 'none';
      if (this.driveEmbedContainer) this.driveEmbedContainer.style.display = 'flex';
      if (this.playerHudOverlay) this.playerHudOverlay.style.display = 'none';
      if (this.playerControlsContainer) this.playerControlsContainer.style.display = 'none';
    }
  }

  updateModalDriveLinks(driveUrl) {
    if (this.modalFolderDriveLink) this.modalFolderDriveLink.href = driveUrl;
    if (this.modalDirectDriveBtn) this.modalDirectDriveBtn.href = driveUrl;
    if (this.tabClipsDriveAllLink) this.tabClipsDriveAllLink.href = driveUrl;
    if (this.driveEmbedLaunchLink) this.driveEmbedLaunchLink.href = driveUrl;
  }

  openTaskModal(task) {
    this.activeTask = task;
    this.activeClipIndex = 0;

    const driveUrl = task.driveUrl || `https://drive.google.com/drive/folders/${ROOT_DRIVE_URL.split('/').pop()}?usp=sharing`;
    this.updateModalDriveLinks(driveUrl);

    if (this.modalFolderPath) {
      this.modalFolderPath.textContent = task.folderName;
    }
    if (this.modalTaskTitle) {
      this.modalTaskTitle.textContent = `${task.code} - ${task.title}`;
    }
    if (this.customDriveUrlInput) {
      this.customDriveUrlInput.value = driveUrl;
    }

    const tabClipsBtn = document.getElementById('tabClipsButton');
    if (tabClipsBtn) {
      tabClipsBtn.textContent = `VIDEO TAKES (${task.clips ? task.clips.length : 0})`;
    }
    const btnApproveTask = document.getElementById('btnApproveTask');
    if (btnApproveTask) {
      const numClips = task.clips ? task.clips.length : 0;
      btnApproveTask.textContent = `✓ APPROVE TASK (${numClips}/${numClips})`;
    }

    if (this.docTitle) this.docTitle.textContent = task.annotationFile;
    if (this.docSummary) this.docSummary.textContent = `${task.category} • ${task.resolution || '4K UHD'} • ${task.fps || '60 FPS'}`;
    if (this.docDetails) {
      this.docDetails.innerHTML = `
        <strong>Task Description:</strong><br>${task.description}<br><br>
        <strong>POV Capture Metadata:</strong><br>${task.povType || 'Multi-POV'}<br><br>
        <strong>Google Drive Task Link:</strong><br><a href="${driveUrl}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${driveUrl} ↗</a><br><br>
        <strong>Technical Notes:</strong><br>${task.annotationSummary}<br><br>
        <strong>Verification Status:</strong> <span style="color: var(--accent-emerald); font-weight: bold;">${task.status}</span>
      `;
    }

    this.updateModalStatusBadge();
    this.modalBackdrop.classList.add('open');

    // ── Load videos: use pre-loaded clips from tasksData.js OR Drive API ──
    if ((task.clips && task.clips.length > 0) || (this.driveConnected && this.driveService && task.driveFolderId)) {
      // Show loading state in clips list
      if (this.clipsListContainer) {
        this.clipsListContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; gap:12px; color:var(--accent-cyan); font-family:var(--font-mono); font-size:0.78rem;">
            <div class="drive-loading-spinner"></div>
            <span>FETCHING VIDEOS FROM DRIVE...</span>
            <span style="font-size:0.65rem;color:var(--text-secondary);">${task.folderName}</span>
          </div>`;
      }

      // Show Drive embed container with loading state
      this.switchViewerMode('drive');
      if (this.driveEmbedContainer) {
        this.driveEmbedContainer.innerHTML = `
          <div class="drive-video-player-wrap">
            <div class="drive-video-loading-overlay">
              <div class="drive-loading-spinner"></div>
              <span>FETCHING VIDEO LIST...</span>
            </div>
          </div>`;
      }

      // Fetch real videos async
      this.loadFolderVideosForModal(task).then(videos => {
        this.renderDriveClipsList(task, videos);
      });

    } else {
      // ── Fallback: simulated HUD player with hardcoded clips ──
      this.switchViewerMode('hud');
      if (task.clips && task.clips.length > 0) {
        this.renderClipsList(task);
        if (this.videoPlayer) this.videoPlayer.destroy();
        this.videoPlayer = new RobotVideoPlayer(this.playerCanvas, {
          onTimeUpdate: (cur, tot) => this.handlePlayerTimeUpdate(cur, tot)
        });
        this.videoPlayer.loadClip(task, task.clips[0]);
      } else {
        // No clips at all — show Drive folder link
        if (this.clipsListContainer) {
          this.clipsListContainer.innerHTML = `
            <div style="padding:20px; text-align:center; color:var(--text-secondary); font-family:var(--font-mono); font-size:0.78rem;">
              <div style="font-size:1.5rem; margin-bottom:8px;">🔑</div>
              Connect Google Drive API to see real videos<br><br>
              <a href="${driveUrl}" target="_blank" style="color:var(--accent-cyan);">Open in Google Drive ↗</a>
            </div>`;
        }
      }
    }
  }



  renderClipsList(task) {
    if (!this.clipsListContainer) return;
    this.clipsListContainer.innerHTML = '';

    const taskDriveUrl = task.driveUrl || `https://drive.google.com/drive/folders/${ROOT_DRIVE_URL.split('/').pop()}?usp=sharing`;

    task.clips.forEach((clip, index) => {
      const clipCard = document.createElement('div');
      clipCard.className = `clip-item-card tech-corner-box ${index === this.activeClipIndex ? 'active' : ''}`;
      clipCard.id = `clip-item-${index}`;

      clipCard.innerHTML = `
        <div class="clip-thumb-preview">
          <canvas id="clip-thumb-canvas-${index}" class="clip-thumb-img"></canvas>
          <div class="clip-thumb-overlay">${clip.duration}</div>
        </div>
        <div class="clip-info-text">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
            <div class="clip-take-name">Take ${index + 1}: ${clip.name}</div>
            <a href="${taskDriveUrl}" target="_blank" onclick="event.stopPropagation();" class="drive-btn-small" style="font-size: 0.58rem; padding: 1px 5px;" title="Open in Google Drive">
              DRIVE ↗
            </a>
          </div>
          <div class="clip-take-meta">
            <span>${clip.angle}</span>
            <span class="clip-badge-approved">✓ ${clip.status}</span>
          </div>
          <div class="clip-take-meta">
            <span>${clip.size}</span>
            <span style="color: var(--accent-cyan);">${clip.confidence} Conf</span>
          </div>
        </div>
      `;

      clipCard.addEventListener('click', () => {
        this.activeClipIndex = index;
        document.querySelectorAll('.clip-item-card').forEach(c => c.classList.remove('active'));
        clipCard.classList.add('active');
        this.videoPlayer.loadClip(task, clip);
      });

      this.clipsListContainer.appendChild(clipCard);

      setTimeout(() => this.drawClipThumbCanvas(index, clip), 10);
    });
  }

  drawClipThumbCanvas(index, clip) {
    const canvas = document.getElementById(`clip-thumb-canvas-${index}`);
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      canvas.width = 120;
      canvas.height = 75;

      const grad = ctx.createLinearGradient(0, 0, 120, 75);
      grad.addColorStop(0, '#091c2b');
      grad.addColorStop(1, '#03080e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 120, 75);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 20); ctx.lineTo(60, 55);
      ctx.moveTo(35, 37); ctx.lineTo(85, 37);
      ctx.stroke();

      ctx.fillStyle = '#00ffaa';
      ctx.font = '8px monospace';
      ctx.fillText(`TAKE ${index + 1}`, 8, 16);
    } catch (e) {
      console.warn(e);
    }
  }

  handlePlayerTimeUpdate(currentTime, totalDuration) {
    if (!this.scrubberFill || !this.timecodeDisplay) return;
    const pct = (currentTime / totalDuration) * 100;
    this.scrubberFill.style.width = `${pct}%`;

    const formatSec = (s) => {
      const mins = Math.floor(s / 60).toString().padStart(2, '0');
      const secs = Math.floor(s % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    };

    this.timecodeDisplay.textContent = `${formatSec(currentTime)} / ${formatSec(totalDuration)}`;
  }

  updateModalStatusBadge() {
    const badge = document.getElementById('modalStatusBadge');
    if (!badge || !this.activeTask) return;
    badge.textContent = `STATUS: ${this.activeTask.status.toUpperCase()}`;
    if (this.activeTask.status === 'Approved') {
      badge.style.color = 'var(--accent-emerald)';
      badge.style.borderColor = 'var(--accent-emerald)';
    } else if (this.activeTask.status === 'Needs Retake') {
      badge.style.color = 'var(--accent-red)';
      badge.style.borderColor = 'var(--accent-red)';
    }
  }

  closeTaskModal() {
    if (this.videoPlayer) {
      this.videoPlayer.destroy();
    }
    this.modalBackdrop.classList.remove('open');
  }

  startHUDTelemetryClocks() {
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      if (this.clockDisplayEl) this.clockDisplayEl.textContent = timeStr;
    }, 1000);

    setInterval(() => {
      const coordEl = document.getElementById('hudCoords');
      if (coordEl) {
        const x = (13.006 + (Math.random() - 0.5) * 0.05).toFixed(3);
        const y = (-2.362 + (Math.random() - 0.5) * 0.05).toFixed(3);
        const z = (1.278 + (Math.random() - 0.5) * 0.03).toFixed(3);
        coordEl.textContent = `X:${x} Y:${y} Z:${z}`;
      }
    }, 400);
  }

  handleFolderUpload(files) {
    if (!files || files.length === 0) return;

    const folderMap = new Map();
    Array.from(files).forEach(file => {
      const pathParts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : [file.name];
      const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Custom_Task_Folder';

      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName).push(file);
    });

    folderMap.forEach((fileList, folderName) => {
      const newId = this.tasks.length + 1;
      const cleanTitle = folderName.replace(/_/g, ' ');
      
      const newClips = fileList.map((f, idx) => ({
        id: `custom_${newId}_${idx}`,
        name: f.name,
        duration: "00:15",
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        status: "Imported",
        angle: "Local Upload",
        confidence: "99.0%"
      }));

      const newTask = {
        id: newId,
        code: `TASK_${newId.toString().padStart(3, '0')}`,
        title: cleanTitle,
        folderName: folderName,
        category: "Custom Imported",
        status: "In Review",
        totalClips: newClips.length,
        recordedDate: new Date().toISOString().split('T')[0],
        fps: "60 FPS",
        resolution: "4K UHD",
        povType: "Local User Upload POV",
        description: `Imported folder with ${newClips.length} local files.`,
        annotationFile: `${folderName}_Notes.pdf`,
        annotationSummary: `User-imported task package with ${newClips.length} video streams ready for managerial review.`,
        thumbnailGradient: "linear-gradient(135deg, #0f2430 0%, #1f5068 50%, #061117 100%)",
        iconType: "box",
        clips: newClips.length > 0 ? newClips : [
          { id: "c1", name: `${folderName}_take_01.mp4`, duration: "00:12", size: "45MB", status: "Imported", angle: "POV Cam", confidence: "99%" }
        ]
      };

      this.tasks.unshift(newTask);
    });

    this.initCategoryFilters();
    this.applyFilters();
    alert(`Successfully imported ${folderMap.size} task folder(s) with ${files.length} file(s)!`);
  }

  exportManagerReport() {
    const report = {
      system: "Glass Data - ASIN Skill Library",
      exportTimestamp: new Date().toISOString(),
      totalTasks: this.tasks.length,
      totalClips: this.tasks.reduce((sum, t) => sum + (t.clips?.length || 0), 0),
      taskSummary: this.tasks.map(t => ({
        id: t.id,
        code: t.code,
        title: t.title,
        folder: t.folderName,
        category: t.category,
        status: t.status,
        clipsCount: t.clips?.length || 0,
        annotationDoc: t.annotationFile
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ASIN_Robot_Tasks_Manager_Report_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

// Direct self-initializing bootstrap
function bootSkillApp() {
  if (!window.skillApp) {
    window.skillApp = new SkillLibraryApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSkillApp);
} else {
  bootSkillApp();
}
