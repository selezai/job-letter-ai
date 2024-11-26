// DOM Elements
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const letterGenerationBtn = document.querySelector('.generate-letter-btn');
const activityFeed = document.querySelector('.activity-feed');
const letterStatusSection = document.querySelector('.letter-status');

// State Management
let letters = [];
let isGenerating = false;

// Utility Functions
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(new Date(date));
};

const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} slide-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Letter Generation
const generateLetter = async (formData) => {
    try {
        isGenerating = true;
        updateUI();
        
        const response = await fetch('/generate-letter', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to generate letter');
        
        const data = await response.json();
        letters.unshift(data);
        
        showToast('Letter generated successfully!');
        updateActivityFeed();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        isGenerating = false;
        updateUI();
    }
};

// UI Updates
const updateUI = () => {
    // Update loading states
    document.querySelectorAll('.loading-indicator').forEach(el => {
        el.style.display = isGenerating ? 'block' : 'none';
    });
    
    // Update buttons
    letterGenerationBtn.disabled = isGenerating;
    
    // Update letter status section
    updateLetterStatus();
};

const updateActivityFeed = () => {
    if (!activityFeed) return;
    
    if (letters.length === 0) {
        activityFeed.innerHTML = `
            <div class="empty-state">
                <p>No activity yet. Generate your first letter!</p>
            </div>
        `;
        return;
    }
    
    activityFeed.innerHTML = letters
        .map(letter => `
            <div class="activity-item slide-in">
                <div class="activity-header">
                    <h4>${letter.title}</h4>
                    <span class="activity-date">${formatDate(letter.createdAt)}</span>
                </div>
                <p class="activity-description">${letter.description}</p>
                <div class="activity-actions">
                    <button class="btn btn-outline btn-sm" onclick="downloadLetter('${letter.id}')">
                        Download
                    </button>
                </div>
            </div>
        `)
        .join('');
};

const updateLetterStatus = () => {
    if (!letterStatusSection) return;
    
    if (!isGenerating && letters.length === 0) {
        letterStatusSection.innerHTML = `
            <div class="empty-state">
                <p>Start by generating your first letter!</p>
            </div>
        `;
        return;
    }
    
    if (isGenerating) {
        letterStatusSection.innerHTML = `
            <div class="status-card loading">
                <div class="status-icon">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="status-content">
                    <h4>Generating your letter...</h4>
                    <p>This may take a few moments</p>
                </div>
            </div>
        `;
    }
};

// File Upload Handling
const setupDropZone = (dropZone) => {
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });
    
    dropZone.addEventListener('drop', handleDrop);
};

const handleDrop = (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
};

const handleFiles = (files) => {
    const formData = new FormData();
    [...files].forEach(file => {
        formData.append('files', file);
    });
    generateLetter(formData);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dropzones
    document.querySelectorAll('.dropzone').forEach(setupDropZone);
    
    // Initialize UI
    updateUI();
    updateActivityFeed();
    
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Sidebar toggle
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Letter generation form
    const letterForm = document.querySelector('#letterForm');
    if (letterForm) {
        letterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(letterForm);
            await generateLetter(formData);
        });
    }
});

// Download functionality
const downloadLetter = async (letterId) => {
    try {
        const response = await fetch(`/download-letter/${letterId}`);
        if (!response.ok) throw new Error('Failed to download letter');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `letter-${letterId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        showToast(error.message, 'error');
    }
};
