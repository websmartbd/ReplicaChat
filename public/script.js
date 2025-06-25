document.addEventListener('DOMContentLoaded', () => {
    // Main containers
    const setupModal = document.getElementById('setup-modal');
    const modalContent = document.getElementById('upload-container'); // Content area within the modal
    const chatContainer = document.getElementById('chat-container');
    
    // Step 0: API Key
    const apiKeyStep = document.getElementById('api-key-step');
    const apiKeyForm = document.getElementById('api-key-form');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyStatus = document.getElementById('api-key-status');
    
    // Step 1: Upload
    const uploadStep = document.getElementById('upload-step');
    const uploadForm = document.getElementById('upload-form');
    const chatfileInput = document.getElementById('chatfile');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileUploadFilename = document.getElementById('file-upload-filename');
    const uploadStatus = document.getElementById('upload-status');
    
    // Step 2: Selection
    const selectionStep = document.getElementById('selection-step');
    const participantList = document.getElementById('participant-list');
    const createReplicaBtn = document.getElementById('create-replica-btn');
    const replicaStatus = document.getElementById('replica-status');

    // Step 3: Chat
    const chatForm = document.getElementById('chat-form');
    const messageContainer = document.getElementById('message-container');
    const messageInput = document.getElementById('message-input');
    const typingIndicator = document.getElementById('typing-indicator');
    const backBtn = document.getElementById('back-btn');
    const chatTitle = document.getElementById('chat-title');
    const chatSubtitle = document.getElementById('chat-subtitle');
    const aiAvatar = document.getElementById('ai-avatar');
    const aiAvatarSmall = document.getElementById('ai-avatar-small');

    // Progress Bar
    const progressSection = document.getElementById('progress-section');
    const progressBar = document.getElementById('progress-bar');
    const progressLabel = document.getElementById('progress-label');

    // State variables
    let apiKey = '';
    let uploadId = '';
    let participants = [];
    let selectedFriendName = '';
    let yourName = '';

    // --- UI Control Functions ---
    function showModal() {
        chatContainer.classList.add('blur-sm', 'pointer-events-none');
        setupModal.classList.remove('hidden');
        setTimeout(() => {
            setupModal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95', 'opacity-0');
        }, 10); // Short delay to allow CSS transition
    }

    function hideModal() {
        chatContainer.classList.remove('blur-sm', 'pointer-events-none');
        modalContent.classList.add('scale-95', 'opacity-0');
        setupModal.classList.add('opacity-0');
        setTimeout(() => {
            setupModal.classList.add('hidden');
        }, 300); // Must match transition duration
    }

    function resetUI() {
        cleanupChunks();
        uploadForm.reset();
        if (fileUploadLabel) fileUploadLabel.textContent = 'Select a chat file';
        if (fileUploadFilename) fileUploadFilename.textContent = '';
        uploadStatus.textContent = '';
        replicaStatus.textContent = '';
        progressSection.classList.add('hidden');
        selectionStep.classList.add('hidden');
        uploadStep.classList.add('hidden');
        apiKeyStep.classList.add('hidden');

        // Logic on reset
        if (localStorage.getItem('gemini-api-key')) {
            uploadStep.classList.remove('hidden');
        } else {
            apiKeyStep.classList.remove('hidden');
        }

        messageContainer.innerHTML = '';
        chatTitle.textContent = 'Chat with Replica';
        chatSubtitle.textContent = 'Offline';
        chatSubtitle.classList.replace('text-green-500', 'text-gray-500');
        aiAvatar.textContent = 'AI';
        selectedFriendName = '';
        uploadId = '';
        yourName = '';
        showModal();
    }

    // --- Event Listeners ---
    chatfileInput.addEventListener('change', () => {
        if (chatfileInput.files.length > 0) {
            fileUploadLabel.textContent = 'File Selected';
            fileUploadFilename.textContent = chatfileInput.files[0].name;
        } else {
            fileUploadLabel.textContent = 'Select a chat file';
            fileUploadFilename.textContent = '';
        }
    });

    uploadForm.addEventListener('submit', handleUpload);
    createReplicaBtn.addEventListener('click', handleCreateReplica);
    apiKeyForm.addEventListener('submit', handleApiKeySave);
    backBtn.addEventListener('click', resetUI);
    chatForm.addEventListener('submit', handleSendMessage);
    window.addEventListener('beforeunload', cleanupChunks);

    // --- Initial Setup ---
    function initialize() {
        const savedKey = localStorage.getItem('gemini-api-key');
        if (savedKey) {
            apiKey = savedKey;
            apiKeyStep.classList.add('hidden');
            uploadStep.classList.remove('hidden');
        } else {
            apiKeyStep.classList.remove('hidden');
            uploadStep.classList.add('hidden');
        }
        showModal();
    }
    initialize();

    // --- Event Handlers ---
    function handleApiKeySave(e) {
        e.preventDefault();
        const key = apiKeyInput.value.trim();
        if (!key) {
            showError('Please enter an API key.', apiKeyStatus);
            return;
        }
        if (!key.startsWith('AIza')) {
            showError('That does not look like a valid Google AI API key.', apiKeyStatus);
            return;
        }

        apiKey = key;
        localStorage.setItem('gemini-api-key', key);
        apiKeyStatus.textContent = 'API Key saved!';
        apiKeyStatus.style.color = '#16a34a'; // green

        setTimeout(() => {
            apiKeyStep.classList.add('hidden');
            uploadStep.classList.remove('hidden');
        }, 1000);
    }

    async function handleUpload(e) {
        e.preventDefault();
        const fileInput = document.getElementById('chatfile');
        const file = fileInput.files[0];
        if (!file) { 
            showError('Please select a file.', uploadStatus);
            return;
        }

        if (!file.name.toLowerCase().endsWith('.json')) {
            showError('Invalid file type. Please upload a JSON file.', uploadStatus);
            return;
        }

        const formData = new FormData();
        formData.append('chatfile', file);

        uploadStatus.textContent = 'Uploading and analyzing...';
        uploadStatus.style.color = '#4f46e5'; // Indigo

        try {
            const response = await fetch('/upload', { 
                method: 'POST', 
                body: formData,
                headers: {
                    'x-api-key': apiKey
                }
            });
            const data = await response.json();

            if (!response.ok) {
                showError(data.error, uploadStatus);
                return;
            }
            
            uploadId = data.uploadId;
            participants = data.participants;
            populateParticipantList();

            uploadStep.classList.add('hidden');
            selectionStep.classList.remove('hidden');

        } catch (error) {
            showError('An error occurred during upload.', uploadStatus);
            console.error('Upload error:', error);
        }
    }

    async function handleCreateReplica() {
        const selectedRadio = document.querySelector('input[name="participant"]:checked');
        if (!selectedRadio) {
            showError('Please select a person to replicate.', replicaStatus);
            return;
        }
        selectedFriendName = selectedRadio.value;
        yourName = participants.find(p => p !== selectedFriendName);

        replicaStatus.textContent = 'Learning personality... This may take a moment.';
        replicaStatus.style.color = '#16a34a'; // Green
        progressSection.classList.remove('hidden');
        updateProgress(0, 1, 0); // Initial progress

        const pollInterval = startPolling();

        try {
            const response = await fetch('/create-replica', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey 
                },
                body: JSON.stringify({ uploadId, selectedFriend: selectedFriendName, yourName }),
            });
            const data = await response.json();

            clearInterval(pollInterval);
            if (!response.ok) {
                showError(data.error, replicaStatus);
                progressSection.classList.add('hidden');
                return;
            }
            
            updateProgress(1, 1, 1); // Final progress
            replicaStatus.textContent = 'Replica created successfully!';

            // Update chat header
            chatTitle.textContent = selectedFriendName;
            chatSubtitle.textContent = 'Online';
            chatSubtitle.classList.replace('text-gray-500', 'text-green-500');
            const avatarInitial = selectedFriendName.charAt(0).toUpperCase();
            aiAvatar.textContent = avatarInitial;
            aiAvatarSmall.textContent = avatarInitial;

            setTimeout(() => {
                hideModal();
                addMessage(`Hello! I'm the AI replica of ${selectedFriendName}. Let's chat.`, 'ai');
            }, 1000);

        } catch (error) {
            clearInterval(pollInterval);
            progressSection.classList.add('hidden');
            showError('Failed to create replica.', replicaStatus);
            console.error('Replica creation error:', error);
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        messageInput.value = '';
        typingIndicator.classList.remove('hidden');

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ message, uploadId }),
            });
            
            const data = await response.json();

            if (!response.ok) {
                addMessage(data.error || 'An unknown error occurred.', 'system');
                return;
            }

            addMessage(data.reply, 'ai');

        } catch (error) {
            addMessage('Sorry, a connection error occurred. Please try again.', 'system');
            console.error('Chat error:', error);
        } finally {
            typingIndicator.classList.add('hidden');
        }
    }

    // --- Helper Functions ---
    function populateParticipantList() {
        participantList.innerHTML = '';
        participants.forEach((name, index) => {
            const div = document.createElement('div');
            div.className = 'p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-all';
            div.innerHTML = `
                <label class="flex items-center space-x-4 cursor-pointer">
                    <input type="radio" name="participant" value="${name}" ${index === 0 ? 'checked' : ''} class="form-radio h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                    <span class="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg">${name.charAt(0).toUpperCase()}</span>
                    <span class="text-gray-800 font-semibold flex-1">${name}</span>
                </label>
            `;
            participantList.appendChild(div);
        });
    }

    function startPolling() {
        return setInterval(async () => {
            if (!uploadId) return;
            try {
                const resp = await fetch(`/replica-progress/${uploadId}`);
                const data = await resp.json();
                if (data.total > 0) {
                    updateProgress(data.current, data.total);
                }
            } catch (e) { /* Ignore polling errors */ }
        }, 800);
    }

    function updateProgress(current, total, chunks) {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        progressBar.style.width = percent + '%';
        progressLabel.textContent = `Analyzing memories... ${percent}%`;
    }

    function addMessage(text, sender) {
        const bubble = document.createElement('div');

        if (sender === 'system') {
            bubble.classList.add('system-message', 'mb-4');
        } else {
            bubble.classList.add('p-4', 'rounded-lg', 'shadow-md', 'message-bubble', 'mb-4');
            const senderClass = sender === 'user' ? 'user-message self-end' : 'ai-message self-start';
            bubble.classList.add(...senderClass.split(' '));
        }

        const textNode = document.createTextNode(text || ''); // Handle undefined/null text gracefully
        bubble.appendChild(textNode);
        
        messageContainer.prepend(bubble);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    async function cleanupChunks() {
        if (!uploadId) return;
        try {
            await fetch('/cleanup-chunks', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uploadId })
            });
        } catch (err) { /* Ignore cleanup errors */ }
    }

    function showError(message, element) {
        element.textContent = message;
        element.style.color = '#ef4444'; // Red
    }
}); 