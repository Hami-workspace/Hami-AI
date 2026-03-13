document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');
    const typingIndicator = document.getElementById('typingIndicator');
    const sendBtn = document.getElementById('sendBtn');

    // New UI Elements
    const suggestedPrompts = document.getElementById('suggestedPrompts');
    const themeLight = document.getElementById('themeLight');
    const themeDark = document.getElementById('themeDark');

    // Setup Theme Toggles
    if (themeLight && themeDark) {
        themeLight.addEventListener('click', () => {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeLight.classList.add('active');
            themeDark.classList.remove('active');
        });
        themeDark.addEventListener('click', () => {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeDark.classList.add('active');
            themeLight.classList.remove('active');
        });
    }

    // Suggested Prompts logic
    if (suggestedPrompts) {
        const promptBtns = suggestedPrompts.querySelectorAll('.prompt-btn');
        promptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const promptText = btn.getAttribute('data-prompt');
                if (promptText) {
                    userInput.value = promptText;
                    userInput.style.height = 'auto';
                    userInput.style.height = (userInput.scrollHeight) + 'px';
                    sendBtn.style.color = 'var(--accent-border)';
                    userInput.focus();

                    if (!isTyping) {
                        handleLocalSubmit();
                    }
                }
            });
        });
    }

    // Voice Input Logic
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        // Optionally set language here, e.g. recognition.lang = 'en-US' or 'ur-PK' etc.
        // It generally defaults to the browser's language.

        recognition.onstart = function () {
            voiceInputBtn.style.color = '#ef4444'; // turn red to indicate recording
            voiceInputBtn.classList.add('recording-pulse');
            userInput.placeholder = "Listening...";
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            userInput.value += (userInput.value ? ' ' : '') + transcript;
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            sendBtn.style.color = 'var(--accent-border)';
        };

        recognition.onerror = function (event) {
            console.error("Speech recognition error", event.error);
            userInput.placeholder = "Message HAMI AI...";
            voiceInputBtn.style.color = '';
            voiceInputBtn.classList.remove('recording-pulse');
        };

        recognition.onend = function () {
            userInput.placeholder = "Message HAMI AI...";
            voiceInputBtn.style.color = '';
            voiceInputBtn.classList.remove('recording-pulse');
        };
    }

    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', () => {
            if (recognition) {
                if (voiceInputBtn.classList.contains('recording-pulse')) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            } else {
                alert("Voice recognition is not supported in this browser.");
            }
        });
    }

    // File Attachment Logic
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileUploadInput = document.getElementById('fileUploadInput');
    let attachedFileContent = null;
    let attachedFileName = null;

    if (attachFileBtn && fileUploadInput) {
        attachFileBtn.addEventListener('click', () => {
            fileUploadInput.click();
        });

        fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            attachedFileName = file.name;

            // For now, we support basic text reading to append to prompt
            // Or just visual indication. Let's read text files for simplicity.
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    attachedFileContent = evt.target.result;
                    userInput.value += `\n[Attached File: ${attachedFileName}]\n${attachedFileContent}\n`;
                    userInput.style.height = 'auto';
                    userInput.style.height = (userInput.scrollHeight) + 'px';
                    sendBtn.style.color = 'var(--accent-border)';
                };
                reader.readAsText(file);
            } else {
                // For images or unsupported, just visually append name (Real API integration would need base64 encoding etc.)
                userInput.value += `\n[Attached File: ${attachedFileName}] `;
                userInput.style.height = 'auto';
                userInput.style.height = (userInput.scrollHeight) + 'px';
                sendBtn.style.color = 'var(--accent-border)';
            }

            // Reset input
            fileUploadInput.value = '';
        });
    }

    // State
    let isTyping = false;
    let sessions = {};
    let currentSessionId = Date.now().toString();
    // We will keep a small chat history to send to the API for context
    let chatHistory = [
        { role: 'system', content: 'You are HAMI AI, a highly advanced, professional, and intelligent AI agent. You act as an expert consultant. You always think carefully step-by-step before answering to ensure your responses are 100% accurate, logical, and highly reliable. Please respond in English unless asked otherwise. CRITICAL INSTRUCTION: Always provide your answers in a clear, well-structured, professional format. Use bullet points or numbered lists. Break down complex information into easily readable chunks. NEVER write long, dense paragraphs.' }
    ];

    // Auto-resize textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        if (this.value.trim() !== '') {
            sendBtn.style.color = 'var(--accent-hover)';
        } else {
            sendBtn.style.color = '';
        }
    });

    // Handle Enter key (Shift+Enter for new line)
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim() !== '' && !isTyping) {
                handleLocalSubmit();
            }
        }
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (userInput.value.trim() !== '' && !isTyping) {
            handleLocalSubmit();
        }
    });

    function handleLocalSubmit() {
        const message = userInput.value.trim();
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.style.color = '';

        appendUserMessage(message);
        chatHistory.push({ role: 'user', content: message });

        isTyping = true;
        sendBtn.disabled = true;
        typingIndicator.classList.remove('hidden');
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Hide suggested prompts after first message
        if (suggestedPrompts) {
            suggestedPrompts.style.display = 'none';
        }

        // Process Response
        processMessage(message);
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user-message';
        msgDiv.innerHTML = `
            <div class="avatar user-avatar">A</div>
            <div class="message-content-wrapper">
                <div class="message-content">
                    <p>${escapeHTML(text)}</p>
                </div>
            </div>
        `;
        chatContainer.appendChild(msgDiv);
    }

    function appendAIMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';

        // Configure marked to use breaks for newlines
        if (window.marked) {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
        }

        // Use marked.js if available to parse markdown, otherwise basic formatting
        const formattedText = window.marked ? marked.parse(text) : `<p>${escapeHTML(text).replace(/\n/g, '<br>')}</p>`;

        msgDiv.innerHTML = `
            <div class="avatar ai-avatar">H</div>
            <div class="message-content-wrapper">
                <div class="message-content">
                    ${formattedText}
                </div>
                <div class="msg-actions">
                    <button class="msg-action-btn copy-btn" title="Copy text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy
                    </button>
                    <button class="msg-action-btn like-btn" title="Good response">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                    </button>
                    <button class="msg-action-btn dislike-btn" title="Bad response">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                    </button>
                    <button class="msg-action-btn regen-btn" title="Regenerate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Regenerate
                    </button>
                </div>
            </div>
        `;
        chatContainer.appendChild(msgDiv);

        // Action Handlers
        const copyBtn = msgDiv.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(text).catch(() => { });
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = 'Copied!';
                setTimeout(() => copyBtn.innerHTML = originalHtml, 2000);
            });
        }
        const regenBtn = msgDiv.querySelector('.regen-btn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                // Remove the last two messages from memory to regenerate
                if (chatHistory.length >= 2) {
                    const lastUserMsg = chatHistory[chatHistory.length - 2];
                    if (lastUserMsg.role === 'user') {
                        chatHistory.pop(); // remove ai
                        chatHistory.pop(); // remove user

                        // Also remove from DOM
                        chatContainer.removeChild(msgDiv);
                        if (chatContainer.lastChild && chatContainer.lastChild.classList && chatContainer.lastChild.classList.contains('user-message')) {
                            chatContainer.removeChild(chatContainer.lastChild);
                        }

                        // Resubmit
                        userInput.value = lastUserMsg.content;
                        handleLocalSubmit();
                    }
                }
            });
        }

        // Ensure scroll stays at bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Highlight code if there are code blocks
        const codeBlocks = msgDiv.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            block.style.color = '#e2e8f0';
        });
    }

    async function processMessage(message) {
        try {
            // Check if the user is asking for an image
            const lowerMsg = message.toLowerCase();
            const isImageRequest = lowerMsg.startsWith('/imagine') ||
                lowerMsg.includes('generate an image') ||
                lowerMsg.includes('generate image') ||
                lowerMsg.includes('generate a picture') ||
                lowerMsg.includes('generate picture') ||
                lowerMsg.includes('generate a pic') ||
                lowerMsg.includes('generate pic') ||
                lowerMsg.includes('create a picture') ||
                lowerMsg.includes('create an image') ||
                lowerMsg.includes('create a pic') ||
                lowerMsg.includes('draw a') ||
                lowerMsg.includes('picture of') ||
                lowerMsg.includes('image of') ||
                lowerMsg.includes('pic of') ||
                lowerMsg.includes('photo of') ||
                lowerMsg.includes('make a picture') ||
                lowerMsg.includes('tasveer') ||
                lowerMsg.includes('picture bnao') ||
                lowerMsg.includes('image banao') ||
                lowerMsg.includes('image bnao') ||
                lowerMsg.includes('pic bnao') ||
                lowerMsg.includes('pic banao') ||
                lowerMsg.includes('photo bnao') ||
                // Advanced artistic keywords for detailed prompts
                lowerMsg.includes('cinematic 3d') ||
                lowerMsg.includes('aspect ratio') ||
                lowerMsg.includes('photorealistic') ||
                /^(a |an |)(3d render|illustration|digital art|painting|concept art) of/i.test(lowerMsg);

            if (isImageRequest) {
                // Extract the prompt from the message
                let userPrompt = message;
                if (lowerMsg.startsWith('/imagine')) {
                    userPrompt = message.substring(8).trim();
                } else {
                    userPrompt = message.replace(/generate an image of|generate a picture of|generate a pic of|generate image of|generate picture of|generate pic of|create a picture of|create an image of|create a pic of|draw a|picture of|image of|pic of|photo of|make a picture of|tasveer|banao|bnao/gi, '').trim();
                }

                if (!userPrompt) userPrompt = "a beautiful random digital art";

                const seed = Math.floor(Math.random() * 1000000);

                // Add a temporary loading message for the user
                const tempLoadingDiv = document.createElement('div');
                tempLoadingDiv.className = 'message ai-message';
                tempLoadingDiv.innerHTML = `
                    <div class="avatar ai-avatar">H</div>
                    <div class="message-content-wrapper">
                        <div class="message-content">
                            <p><i>Processing your image...</i></p>
                        </div>
                    </div>
                `;
                chatContainer.appendChild(tempLoadingDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;

                let enhancedPrompt = userPrompt;

                // Temporarily bypassing prompt enhancement as per user request to drop Gemini API
                // Could be re-added via pollinations if needed.

                try {
                    // Remove loading message securely
                    if (chatContainer.contains(tempLoadingDiv)) {
                        chatContainer.removeChild(tempLoadingDiv);
                    }

                    if (enhancedPrompt === userPrompt) {
                        // If enhancement failed or returned exactly the same, let's at least add some quality tags
                        enhancedPrompt = `${userPrompt}, highly detailed, professional digital art, 8k resolution`;
                    }

                    const cleanUserPrompt = userPrompt.replace(/\\n/g, ' ').trim();
                    const encodedPrompt = encodeURIComponent(enhancedPrompt);
                    const encodedUserPrompt = encodeURIComponent(cleanUserPrompt);

                    // Create image securely inside DOM
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'message ai-message';

                    msgDiv.innerHTML = `
                        <div class="avatar ai-avatar">H</div>
                        <div class="message-content-wrapper">
                            <div class="message-content" id="img-container-${seed}">
                                <p>Here is the image for <strong>"${escapeHTML(cleanUserPrompt)}"</strong>:</p>
                                <!-- Image Element will be injected securely here -->
                                <div class="image-actions" id="actions-${seed}" style="display: none;">
                                    <button class="image-btn" id="dl-btn-${seed}" title="Download Image">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                        Download High-Res
                                    </button>
                                </div>
                                <p style="font-size: 0.75rem; color: var(--text-secondary); font-style: italic; margin-top: 8px;">(Generated by AI)</p>
                            </div>
                        </div>
                    `;
                    chatContainer.appendChild(msgDiv);

                    const container = document.getElementById(`img-container-${seed}`);
                    const actionsDiv = document.getElementById(`actions-${seed}`);

                    // Wrapper for loading text + image
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';
                    imgWrapper.style.minHeight = '300px';
                    imgWrapper.style.background = 'var(--bg-primary)';
                    imgWrapper.style.display = 'flex';
                    imgWrapper.style.alignItems = 'center';
                    imgWrapper.style.justifyContent = 'center';
                    imgWrapper.style.borderRadius = '8px';
                    imgWrapper.style.overflow = 'hidden';
                    imgWrapper.style.marginBottom = '12px';

                    const loaderText = document.createElement('div');
                    loaderText.style.position = 'absolute';
                    loaderText.style.color = 'var(--text-primary)';
                    loaderText.style.textAlign = 'center';

                    const loadingMessages = [
                        "Checking the AI servers...",
                        "Almost there! Generating pixels...",
                        "Finalizing your image..."
                    ];
                    let currentMessageIndex = 0;
                    loaderText.innerHTML = `<i>${loadingMessages[currentMessageIndex]}</i><br><small style="opacity:0.7">This can take 10-20 seconds.</small>`;

                    const messageInterval = setInterval(() => {
                        currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
                        loaderText.innerHTML = `<i>${loadingMessages[currentMessageIndex]}</i><br><small style="opacity:0.7">This can take 10-20 seconds.</small>`;
                    }, 5000); // Change message every 5 seconds

                    const imgNode = document.createElement('img');
                    imgNode.id = `img-${seed}`;
                    imgNode.alt = cleanUserPrompt;
                    imgNode.style.position = 'relative';
                    imgNode.style.width = '100%';
                    imgNode.style.display = 'block';
                    imgNode.style.opacity = '0'; // Hide broken image icon initially

                    imgWrapper.appendChild(loaderText);
                    imgWrapper.appendChild(imgNode);
                    container.insertBefore(imgWrapper, actionsDiv);

                    const formattedFlickrTags = cleanUserPrompt.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\\s+/g, ',');
                    const fallbacks = [
                        `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}`,
                        `https://dummyjson.com/image/1080x1080?text=${encodeURIComponent(cleanUserPrompt.substring(0, 30).replace(/\\s+/g, '+'))}`
                    ];
                    let currentFallback = 0;
                    let loadTimeout;

                    const loadFallback = () => {
                        clearTimeout(loadTimeout);
                        if (currentFallback < fallbacks.length) {
                            console.warn("Generating image with: ", fallbacks[currentFallback]);
                            imgNode.src = fallbacks[currentFallback];

                            // Set a longer 60 second timeout before giving up on this specific model
                            // so the user isn't waiting a full minute to see all fallbacks fail, but long enough for AI
                            loadTimeout = setTimeout(() => {
                                console.warn("Image load timed out, forcing fallback.");
                                imgNode.src = ''; // Cancel current load
                                imgNode.onerror();
                            }, 60000);
                        } else {
                            clearInterval(messageInterval);
                            loaderText.style.display = 'none';
                            imgNode.style.opacity = '1';
                            actionsDiv.style.display = 'flex';
                            let shortPrompt = cleanUserPrompt.substring(0, 30);
                            imgNode.src = `https://placehold.co/1080x1080/1a1a1a/ffffff?text=${encodeURIComponent(shortPrompt + '\\n(All AI Servers Offline)')}`;
                        }
                    };

                    imgNode.onload = function () {
                        clearTimeout(loadTimeout);
                        // Prevent dummy generic placeholders from 'succeeding' if we forcefully cleared src
                        if (!this.src || this.src.endsWith(window.location.host + '/')) return;

                        clearInterval(messageInterval); // Stop rotating messages
                        loaderText.style.display = 'none';
                        this.style.opacity = '1';
                        this.style.background = 'transparent';
                        imgWrapper.style.minHeight = 'auto';
                        actionsDiv.style.display = 'flex';
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    };

                    imgNode.onerror = function () {
                        clearTimeout(loadTimeout);
                        currentFallback++;
                        loadFallback();
                    };

                    chatHistory.push({ role: 'assistant', content: `[Generated Image: ${enhancedPrompt}]` });
                    saveCurrentSession();

                    // Image generation via Vercel Serverless Function
                    const generateReplicateImage = async () => {
                        try {
                            if (window.location.protocol === 'file:') {
                                throw new Error("You are opening this file locally (file://). The local HTML file cannot reach your Vercel backend at `/api/generate`. Please test this on your LIVE Vercel URL (e.g., https://your-project.vercel.app).");
                            }

                            loaderText.innerHTML = `<i>Generating with AI...</i><br><small style="opacity:0.7">This can take a few seconds.</small>`;

                            const options = {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ prompt: enhancedPrompt })
                            };

                            let response = await fetch('/api/generate', options);

                            if (!response.ok) {
                                const errText = await response.text();
                                throw new Error(`API Error [${response.status}]: ${errText}. (If 404, you are testing locally without Vercel running)`);
                            }

                            let data = await response.json();

                            if (data.url) {
                                // Due to CORS on external images, it might be better to just set the src directly
                                // Vercel can return the Replicate URL, and we just display it.
                                imgNode.src = data.url;
                            } else if (data.error) {
                                throw new Error("API responded with error: " + data.error);
                            } else {
                                throw new Error("No URL returned from API");
                            }
                        } catch (err) {
                            console.error("Image generation error:", err.message || err);

                            // Show the error inside the chat clearly so user can screenshot it
                            appendAIMessage("⚠️ **Debug Error (Replicate/Vercel):**\n`" + (err.message || err) + "`\n\n*(Falling back to backup image generators...)*");

                            loadFallback();
                        }
                    };

                    // Initial call to start loading with Replicate
                    generateReplicateImage();

                    // Action Listeners
                    document.getElementById(`dl-btn-${seed}`).addEventListener('click', async function () {
                        const originalText = this.innerHTML;
                        this.innerHTML = 'Downloading...';

                        try {
                            let currentSrc = imgNode.src;
                            if (currentSrc.includes('placehold.co') || currentSrc.includes('dummyjson')) throw new Error('Cannot download placeholder image');
                            // Use allorigins raw proxy for external image downloads to bypass strict CORS
                            const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(currentSrc);
                            let response;
                            try {
                                response = await fetch(currentSrc);
                                if (!response.ok) throw new Error('Network response not ok');
                            } catch (e) {
                                response = await fetch(proxyUrl);
                            }

                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);

                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `HAMI-AI-${cleanUserPrompt.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                            console.error('Download failed', err);
                            // Final fallback
                            window.open(imgNode.src, '_blank');
                        }
                        this.innerHTML = originalText;
                    });

                    // Removed regen-btn as we now use global buttons on AI msgs or simplified for images

                    chatContainer.scrollTop = chatContainer.scrollHeight;

                } catch (error) {
                    console.error("Image generation block failed completely: ", error);
                    if (chatContainer.contains(tempLoadingDiv)) {
                        chatContainer.removeChild(tempLoadingDiv);
                    }
                    appendAIMessage("Sorry, I encountered an error while trying to generate your image.");
                }

                isTyping = false;
                sendBtn.disabled = false;
                typingIndicator.classList.add('hidden');
                return;
            }

            // Use Pollinations API for text generation. 
            // CRITICAL: Must use credentials: 'omit' to force anonymous mode.
            // Pollinations strictly blocks authenticated browser requests (via cookies) to this endpoint natively.
            const recentHistory = chatHistory.slice(-15);

            let text = "";
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'omit',
                body: JSON.stringify({
                    messages: recentHistory.map(m => ({
                        role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
                        content: m.content
                    })),
                    model: 'openai' // or 'mixtral' etc.
                })
            };

            try {
                // 1. Try direct fetch first
                const response = await fetch('https://text.pollinations.ai/', requestOptions);
                if (!response.ok) throw new Error('Direct fetch failed');
                text = await response.text();
            } catch (err1) {
                console.warn("Direct API failed, trying CORS proxy:", err1);
                try {
                    // 2. Try with corsproxy.io
                    const proxyResponse = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://text.pollinations.ai/'), requestOptions);
                    if (!proxyResponse.ok) throw new Error('Proxy fetch failed');
                    text = await proxyResponse.text();
                } catch (err2) {
                    console.warn("Proxy API failed, trying simple GET fallback:", err2);
                    // 3. Fallback to simple GET request with just the last user message
                    const lastUserMsg = chatHistory.filter(m => m.role === 'user').pop();
                    const prompt = lastUserMsg ? lastUserMsg.content : "Hello";
                    const getResponse = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
                    if (!getResponse.ok) throw new Error('GET fallback failed');
                    text = await getResponse.text();
                }
            }

            // Attempt to parse JSON response if the API returned an object or array string instead of plain text
            try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].message) {
                        text = parsed.choices[0].message.content || text;
                    } else if (parsed.content !== undefined || parsed.reasoning_content !== undefined) {
                        // The model might return a direct object with reasoning_content and content
                        // Prefer content, otherwise fallback to reasoning_content
                        let finalMsg = parsed.content;
                        if (!finalMsg && parsed.reasoning_content) {
                            finalMsg = parsed.reasoning_content;
                        }
                        if (finalMsg) {
                            text = finalMsg;
                        }
                    }
                }
            } catch (e) {
                // If text is not valid JSON, it's just raw text, which is the expected default behavior
            }

            if (!text || text.trim() === '') {
                throw new Error("Sorry, I could not generate a response.");
            }

            chatHistory.push({ role: 'assistant', content: text });
            appendAIMessage(text);
            saveCurrentSession(); // Save after AI response

        } catch (error) {
            console.error("Caught API Error: ", error);
            // Fallback response in case API fails
            let userFriendlyError = error.message.includes("text brain") || error.message.includes("overloaded")
                ? error.message
                : "Sorry, I am experiencing a temporary connection issue. Please try again in a moment.";
            appendAIMessage(userFriendlyError);
        } finally {
            isTyping = false;
            sendBtn.disabled = false;
            typingIndicator.classList.add('hidden');
        }
    }

    // --- Chat History Management --- //

    function loadSessions() {
        const saved = localStorage.getItem('hami_sessions');
        if (saved) {
            sessions = JSON.parse(saved);
        } else {
            sessions = {};
        }
        renderSidebar();
    }

    function saveCurrentSession() {
        // Automatically set title based on first user message if not set
        if (chatHistory.length > 1 && !sessions[currentSessionId]?.title) {
            const firstUserMsg = chatHistory.find(m => m.role === 'user');
            if (firstUserMsg) {
                let title = firstUserMsg.content.substring(0, 30);
                if (firstUserMsg.content.length > 30) title += '...';

                if (!sessions[currentSessionId]) {
                    sessions[currentSessionId] = { id: currentSessionId, timestamp: Date.now() };
                }
                sessions[currentSessionId].title = title;
            }
        }

        if (chatHistory.length > 1) {
            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { id: currentSessionId, timestamp: Date.now(), title: "New Chat" };
            }
            sessions[currentSessionId].history = [...chatHistory];
            sessions[currentSessionId].timestamp = Date.now();
            localStorage.setItem('hami_sessions', JSON.stringify(sessions));
            renderSidebar();
        }
    }

    function renderSidebar() {
        const chatHistoryList = document.getElementById('chatHistoryList');
        if (!chatHistoryList) return;

        chatHistoryList.innerHTML = '';

        // Sort sessions by timestamp descending (newest first)
        const sortedSessions = Object.values(sessions).sort((a, b) => b.timestamp - a.timestamp);

        sortedSessions.forEach(session => {
            const li = document.createElement('li');
            li.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-item-title';
            titleSpan.textContent = session.title || "New Chat";
            titleSpan.title = session.title || "New Chat";

            // Determine Icon based on title content matching image features
            let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
            const tl = titleSpan.textContent.toLowerCase();
            if (tl.includes('image') || tl.includes('picture') || tl.includes('pic ') || tl.includes('photo')) {
                iconSvg = '🖼️'; // Or any image SVG
            } else if (tl.includes('car')) {
                iconSvg = '🚗';
            } else if (tl.includes('code') || tl.includes('function')) {
                iconSvg = '💻';
            }

            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = iconSvg;
            iconSpan.style.opacity = '0.7';

            const itemContent = document.createElement('div');
            itemContent.className = 'history-item-content';
            itemContent.appendChild(iconSpan);
            itemContent.appendChild(titleSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'history-action-btn';
            renameBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            renameBtn.title = "Rename";
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newTitle = prompt("Enter new name for this chat:", session.title || "New Chat");
                if (newTitle !== null && newTitle.trim() !== '') {
                    sessions[session.id].title = newTitle.trim();
                    localStorage.setItem('hami_sessions', JSON.stringify(sessions));
                    renderSidebar();
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-action-btn delete';
            deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            deleteBtn.title = "Delete";
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this chat?")) {
                    delete sessions[session.id];
                    localStorage.setItem('hami_sessions', JSON.stringify(sessions));
                    if (session.id === currentSessionId) {
                        createNewSession();
                    } else {
                        renderSidebar();
                    }
                }
            });

            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(itemContent);
            li.appendChild(actionsDiv);

            li.addEventListener('click', () => {
                loadSessionData(session.id);
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });

            chatHistoryList.appendChild(li);
        });
    }

    function loadSessionData(id) {
        if (!sessions[id]) return;

        currentSessionId = id;
        chatHistory = [...sessions[id].history];

        // Clear chat container
        chatContainer.innerHTML = '';

        // Re-render history
        chatHistory.forEach(msg => {
            if (msg.role === 'user') {
                appendUserMessage(msg.content);
            } else if (msg.role === 'assistant') {
                appendAIMessage(msg.content);
            }
        });

        if (suggestedPrompts && chatHistory.length > 1) {
            suggestedPrompts.style.display = 'none';
        } else if (suggestedPrompts) {
            suggestedPrompts.style.display = 'flex';
        }

        renderSidebar();
    }

    function createNewSession() {
        currentSessionId = Date.now().toString();
        chatHistory = [
            { role: 'system', content: 'You are HAMI AI, a highly advanced, professional, and intelligent AI agent. You act as an expert consultant. You always think carefully step-by-step before answering to ensure your responses are 100% accurate, logical, and highly reliable. Please respond in English unless asked otherwise. CRITICAL INSTRUCTION: Always provide your answers in a clear, well-structured, professional format. Use bullet points or numbered lists. Break down complex information into easily readable chunks. NEVER write long, dense paragraphs.' }
        ];
        chatContainer.innerHTML = ''; // Clear existing messages
        const initialMessage = document.createElement('div');
        initialMessage.className = 'message ai-message';
        initialMessage.innerHTML = `
            <div class="avatar ai-avatar">H</div>
            <div class="message-content-wrapper">
                <div class="message-content">
                    <p>Hello! I am <strong>HAMI AI</strong>. I am designed to give you instant, accurate, and updated answers. How can I assist you today?</p>
                </div>
            </div>
        `;
        chatContainer.appendChild(initialMessage);

        if (suggestedPrompts) {
            suggestedPrompts.style.display = 'flex';
        }
        renderSidebar();

        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    // --- Sidebar DOM Events --- //
    const newChatBtn = document.getElementById('newChatBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewSession);
    }

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar if clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // Initialize Sessions
    loadSessions();

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
