// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const cvUpload = document.getElementById('cvUpload');
const jobDescUpload = document.getElementById('jobDescUpload');
const recentActivity = document.getElementById('recentActivity');
const emailInput = document.getElementById('email');

// State Management
let isGenerating = false;
let userEmail = localStorage.getItem('userEmail') || '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Restore email if previously saved
    if (userEmail) {
        emailInput.value = userEmail;
    }

    // Load recent activity
    loadRecentActivity();

    // Add file input listeners
    setupFileInputs();
});

// File Input Setup
function setupFileInputs() {
    const fileInputs = [cvUpload, jobDescUpload];
    
    fileInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                validateFile(file, input);
            }
        });
    });
}

// File Validation
function validateFile(file, input) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        input.value = '';
        return false;
    }

    if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF or image file (JPG, PNG)');
        input.value = '';
        return false;
    }

    return true;
}

// Form Submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isGenerating) {
        return;
    }

    const formData = new FormData(uploadForm);
    
    // Validate files
    const cv = cvUpload.files[0];
    const jobDesc = jobDescUpload.files[0];

    if (!validateFile(cv, cvUpload) || !validateFile(jobDesc, jobDescUpload)) {
        return;
    }

    // Save email for future use
    localStorage.setItem('userEmail', emailInput.value);

    try {
        isGenerating = true;
        showLoadingState();

        const response = await fetch('/generate-letter', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to generate letter');
        }

        const data = await response.json();
        
        // Add new activity to dashboard
        addActivityCard({
            title: formData.get('letterType') === 'cover-letter' ? 'Cover Letter' : 'Motivation Letter',
            description: 'Generated successfully',
            id: data.id
        });

        showSuccessMessage('Letter generated successfully!');
        uploadForm.reset();

    } catch (error) {
        showErrorMessage(error.message);
    } finally {
        isGenerating = false;
        hideLoadingState();
    }
});

// UI Updates
function showLoadingState() {
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Generating...';
}

function hideLoadingState() {
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Generate Letter';
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    uploadForm.insertAdjacentElement('beforebegin', messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    uploadForm.insertAdjacentElement('beforebegin', messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// Recent Activity Management
async function loadRecentActivity() {
    if (!userEmail) {
        showEmptyState();
        return;
    }

    try {
        const response = await fetch(`/recent-activity?email=${encodeURIComponent(userEmail)}`);
        if (!response.ok) {
            throw new Error('Failed to load recent activity');
        }

        const activities = await response.json();
        
        if (activities.length === 0) {
            showEmptyState();
            return;
        }

        recentActivity.innerHTML = '';
        activities.forEach(activity => addActivityCard(activity));

    } catch (error) {
        console.error('Error loading recent activity:', error);
        showEmptyState();
    }
}

function showEmptyState() {
    recentActivity.innerHTML = `
        <p class="no-activity-message">No recent activity. Start generating letters now!</p>
    `;
}

function addActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.innerHTML = `
        <h3>${activity.title}</h3>
        <p>${activity.description}</p>
        <button class="btn-secondary" onclick="downloadLetter('${activity.id}')">Download</button>
    `;
    
    // Remove empty state if it exists
    const emptyState = recentActivity.querySelector('.no-activity-message');
    if (emptyState) {
        emptyState.remove();
    }

    recentActivity.insertBefore(card, recentActivity.firstChild);
}

// Letter Download
async function downloadLetter(letterId) {
    try {
        const response = await fetch(`/download-letter/${letterId}`);
        if (!response.ok) {
            throw new Error('Failed to download letter');
        }

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
        showErrorMessage('Failed to download letter. Please try again.');
    }
}

// Add some CSS for loading spinner and messages
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .success-message,
    .error-message {
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 15px;
        text-align: center;
    }

    .success-message {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .error-message {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
`;
document.head.appendChild(style);
