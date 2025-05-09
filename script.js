// Adjectives and nouns for generating random usernames
const adjectives = [
    'Mysterious', 'Silent', 'Shadowy', 'Whispering', 'Hidden', 'Secret',
    'Quiet', 'Stealthy', 'Covert', 'Unknown', 'Masked', 'Veiled',
    'Cryptic', 'Enigmatic', 'Anonymous', 'Invisible', 'Phantom', 'Ghostly'
];

const nouns = [
    'Mouse', 'Whisper', 'Shadow', 'Phantom', 'Ghost', 'Spirit',
    'Echo', 'Mystery', 'Secret', 'Mask', 'Veil', 'Shade',
    'Silence', 'Whisper', 'Mystery', 'Enigma', 'Riddle', 'Puzzle'
];

// Fun facts about anonymity and privacy
const funFacts = [
    "The first anonymous chat system was created in 1978!",
    "The word 'anonymous' comes from the Greek word 'anonymos' meaning 'without a name'.",
    "The first web browser was created in 1990 by Tim Berners-Lee.",
    "The first emoji was created in 1999 by Shigetaka Kurita.",
    "The first social media platform was created in 1997.",
    "The first instant messaging service was created in 1996.",
    "The first webcam was used to monitor a coffee pot in 1991.",
    "The first website is still online at info.cern.ch",
    "The first emoticon was created in 1982 by Scott Fahlman.",
    "The first domain name was registered in 1985."
];

// Channel management
const channels = {
    'general': [],
    'random': [],
    'gaming': [],
    'music': []
};

// Current active channel
let currentChannel = 'general';

// Generate a random username
function generateUsername() {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// Update the username display
function updateUsername() {
    const usernameElement = document.getElementById('anonymous-name');
    usernameElement.textContent = generateUsername();
}

// Update fun fact (now takes index)
function updateFunFact(index) {
    const funFactElement = document.getElementById('fun-fact');
    funFactElement.textContent = funFacts[index % funFacts.length];
}

// Listen for fun fact changes in Firestore
db.collection('appState').doc('funFact').onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        if (typeof data.index === 'number') {
            updateFunFact(data.index);
        }
    }
});

// Only one client should update the fun fact every 15 seconds
function startFunFactUpdater() {
    // Use a random delay to reduce collision
    setTimeout(() => {
        setInterval(async () => {
            // Try to update the fun fact index if this client is the leader
            const funFactRef = db.collection('appState').doc('funFact');
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(funFactRef);
                let newIndex = 0;
                if (doc.exists && typeof doc.data().index === 'number') {
                    newIndex = (doc.data().index + 1) % funFacts.length;
                }
                transaction.set(funFactRef, { index: newIndex });
            });
        }, 15000);
    }, Math.random() * 5000); // Randomize initial delay
}

// Add a message to the chat
function addMessageToChat(message, isOwnMessage = false) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'own-message' : ''}`;
    messageElement.innerHTML = `
        <div class="avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.username}</span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-text">${message.text}</div>
        </div>
    `;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add a system message
function addSystemMessage(text) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message system-message';
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update online users count and list
function updateOnlineUsers(count, users) {
    const userCountElement = document.getElementById('user-count');
    userCountElement.textContent = count + (count === 1 ? ' anonymous user' : ' anonymous users');

    // Update the online user list
    const onlineList = document.getElementById('online-list');
    if (onlineList) {
        onlineList.innerHTML = '';
        users.forEach(username => {
            const userDiv = document.createElement('div');
            userDiv.className = 'online-user';
            userDiv.textContent = username;
            onlineList.appendChild(userDiv);
        });
    }
}

// Initialize the chat
function initChat() {
    updateUsername();
    startFunFactUpdater();
    
    const username = document.getElementById('anonymous-name').textContent;
    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('message-input');
    const button = document.querySelector('#message-form button');
    
    // Set up real-time listener for messages
    db.collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                addMessageToChat(message, message.username === username);
            }
        });
    });
    
    // Set up real-time listener for online users
    db.collection('onlineUsers').onSnapshot((snapshot) => {
        const now = Date.now();
        let onlineCount = 0;
        let onlineUsernames = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastSeen && (now - data.lastSeen.toMillis()) < 10000) { // 10 seconds
                onlineCount++;
                onlineUsernames.push(doc.id);
            }
        });
        updateOnlineUsers(onlineCount, onlineUsernames);
    });
    
    // Add current user to online users
    const userRef = db.collection('onlineUsers').doc(username);
    userRef.set({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update last seen timestamp every 5 seconds
    setInterval(() => {
        userRef.update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }, 5000);
    
    // Remove user from online users when they leave
    window.addEventListener('beforeunload', () => {
        userRef.delete();
    });
    
    // Function to send message
    function sendMessage() {
        const message = input.value.trim();
        if (message) {
            const now = new Date();
            const messageData = {
                username: username,
                text: message,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add message to Firestore
            db.collection('messages').add(messageData);
            
            // Clear input
            input.value = '';
            
            // Update fun fact every 5 messages
            if (messagesDiv.children.length % 5 === 0) {
                updateFunFact();
            }
        }
    }
    
    // Add click event to button
    button.onclick = function(e) {
        e.preventDefault();
        sendMessage();
    };
    
    // Add enter key event to input
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };
    
    // Add welcome message
    addSystemMessage('Welcome to Anonymouse Chat! Your identity is hidden, but your words are heard.<br><small>Try using emojis like :) :D <3</small>');
}

// Handle channel switching
function setupChannelHandling() {
    const channelElements = document.querySelectorAll('.channel');
    channelElements.forEach(channel => {
        channel.addEventListener('click', () => {
            // Remove active class from all channels
            channelElements.forEach(c => c.classList.remove('active'));
            // Add active class to clicked channel
            channel.classList.add('active');
            // Update current channel
            currentChannel = channel.querySelector('span').textContent;
            // Update header
            document.querySelector('.chat-header h2').textContent = `# ${currentChannel}`;
            // Load messages for the channel
            loadMessages();
        });
    });
}

// Load messages for current channel
function loadMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = ''; // Clear existing messages
    
    // Get messages from localStorage
    const savedMessages = JSON.parse(localStorage.getItem(`messages_${currentChannel}`) || '[]');
    
    // Display messages
    savedMessages.forEach(msg => {
        const messageElement = createMessageElement(msg.username, msg.text, msg.time);
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create message element
function createMessageElement(username, text, time) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
        <div class="avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${text}</div>
        </div>
    `;
    return messageElement;
}

// Add some fun features
function addFunFeatures() {
    // Add emoji support
    const emojiMap = {
        ':)': '😊',
        ':(': '😢',
        ':D': '😃',
        ';)': '😉',
        '<3': '❤️',
        ':P': '😛',
        ':O': '😮',
        ':|': '😐'
    };

    // Replace text emoticons with emojis
    function replaceEmoticons(text) {
        let result = text;
        for (const [emoticon, emoji] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(emoticon, 'g'), emoji);
        }
        return result;
    }

    // Modify the addMessage function to include emoji support
    const originalAddMessage = addMessage;
    addMessage = function(text) {
        text = replaceEmoticons(text);
        originalAddMessage(text);
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initChat);

// Initialize fun features
addFunFeatures(); 