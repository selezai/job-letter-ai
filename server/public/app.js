// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const cvUpload = document.getElementById('cvUpload');
const jobDescUpload = document.getElementById('jobDescUpload');
const recentActivity = document.getElementById('recentActivity');
const emailInput = document.getElementById('email');
const generateBtn = document.getElementById('generateBtn');
const spinner = document.getElementById('spinner');
const loadingContainer = document.getElementById('loading');

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
            const maxSize = 50 * 1024 * 1024; // 50MB
            
            if (file && file.size > maxSize) {
                e.target.value = ''; // Clear the input
                showError('File size must be less than 50MB');
            }
        });
    });
}

// Loading functions
function showLoading() {
  document.getElementById("loading").style.display = "block";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

// Form handling
function handleSubmit(event) {
  event.preventDefault();
  showLoading();
  
  // Simulate API call
  setTimeout(() => {
    hideLoading();
    alert('Letter generated successfully!');
    document.getElementById('uploadForm').reset();
  }, 3000);
}

// Add event listeners
document.getElementById('uploadForm').addEventListener('submit', handleSubmit);

// Form Submission
// uploadForm.addEventListener('submit', startLoading);

// Screen Navigation
function showScreen(screen) {
    // Remove active class from all containers and nav items
    document.querySelectorAll('.container').forEach((container) => {
        container.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.remove('active');
    });

    // Add active class to selected screen and nav item
    document.getElementById(screen).classList.add('active');
    document.querySelector(`.nav-item[onclick="showScreen('${screen}')"]`).classList.add('active');
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

// Modal handling
const modal = document.getElementById('onboardingModal');
const closeBtn = document.querySelector('.close');
const nextBtn = document.getElementById('nextStep');
const onboardingText = document.querySelector(".modal-content p");
const dots = document.querySelectorAll(".dot");
const toneSelector = document.getElementById("tone");
const toneDescription = document.querySelector('.tone-description');

const toneDescriptions = {
  professional: "A formal and polished tone suitable for traditional industries and corporate roles.",
  enthusiastic: "An energetic and passionate tone that shows strong interest in the role and company.",
  concise: "A clear and direct tone that gets straight to the point while maintaining professionalism."
};

const steps = [
  "Step 1: Upload your CV.",
  "Step 2: Upload the Job Description.",
  "Step 3: Select Tone & Style.",
  "You're all set!"
];

let currentStep = 0;

function updateProgress() {
  // Update dots
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentStep);
  });
  
  // Update text
  onboardingText.innerText = steps[currentStep];
  
  // Show/hide tone selector on step 3
  toneSelector.style.display = currentStep === 2 ? 'block' : 'none';
  
  // Update button text
  if (currentStep === steps.length - 1) {
    nextBtn.innerText = "Get Started";
  }
}

// Show modal on first visit
if (!localStorage.getItem('onboardingComplete')) {
  modal.style.display = 'block';
  updateProgress();
}

// Update tone description when selection changes
toneSelector.addEventListener("change", () => {
  const selectedTone = toneSelector.value;
  console.log("Tone selected:", selectedTone);
  
  // Update description
  toneDescription.textContent = toneDescriptions[selectedTone];
  
  // Store selection
  localStorage.setItem('selectedTone', selectedTone);
  
  // Add visual feedback
  toneSelector.classList.add('tone-changed');
  setTimeout(() => {
    toneSelector.classList.remove('tone-changed');
  }, 300);
});

// Initialize tone from localStorage or default to 'professional'
const savedTone = localStorage.getItem('selectedTone') || 'professional';
toneSelector.value = savedTone;
toneDescription.textContent = toneDescriptions[savedTone];

// Close modal when clicking close button
closeBtn.onclick = function() {
  modal.style.display = 'none';
  localStorage.setItem('onboardingComplete', 'true');
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = 'none';
    localStorage.setItem('onboardingComplete', 'true');
  }
}

// Handle next step button
nextBtn.onclick = function() {
  // If on tone selection step, store the selected tone
  if (currentStep === 2) {
    const selectedTone = document.getElementById('tone').value;
    localStorage.setItem('selectedTone', selectedTone);
  }
  
  currentStep++;
  if (currentStep < steps.length) {
    updateProgress();
  } else {
    modal.style.display = 'none';
    localStorage.setItem('onboardingComplete', 'true');
    showScreen('upload');
  }
}

// Letter Preview Unlock
const unlockButton = document.getElementById('unlockButton');
const letterPreview = document.querySelector('.letter-preview');

unlockButton.addEventListener('click', async () => {
  // Here you would typically handle the payment process
  // For now, we'll just simulate it with a timeout
  unlockButton.disabled = true;
  unlockButton.innerHTML = `
    <span class="unlock-icon">⌛</span>
    Processing...
  `;
  
  try {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Success
    letterPreview.classList.remove('locked');
    unlockButton.style.display = 'none';
    
    // Store unlock state
    localStorage.setItem('letterUnlocked', 'true');
    
    // Show success message
    showSuccessMessage('Letter unlocked successfully!');
    
  } catch (error) {
    // Handle error
    unlockButton.disabled = false;
    unlockButton.innerHTML = `
      <span class="unlock-icon">🔓</span>
      Try Again
    `;
    showErrorMessage('Failed to process payment. Please try again.');
  }
});

// Check if letter is already unlocked
if (localStorage.getItem('letterUnlocked') === 'true') {
  letterPreview.classList.remove('locked');
  unlockButton.style.display = 'none';
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
