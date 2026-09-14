(() => {
  const connectionStatus = document.getElementById('connectionStatus');
  const statusHeading = document.getElementById('statusHeading');
  const statusDetail = document.getElementById('statusDetail');
  const voiceButton = document.getElementById('voiceButton');
  const voiceLabel = document.getElementById('voiceLabel');
  const transcript = document.getElementById('transcript');
  const themeToggle = document.getElementById('themeToggle');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;

  function setTheme(theme) {
    const light = theme === 'light';
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    themeToggle.textContent = light ? 'Dark mode' : 'Light mode';
    themeToggle.setAttribute('aria-pressed', String(light));
    localStorage.setItem('field-console-theme', light ? 'light' : 'dark');
  }

  setTheme(localStorage.getItem('field-console-theme') || 'dark');
  themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  function updateConnectionStatus() {
    const online = navigator.onLine;
    connectionStatus.textContent = online ? 'ONLINE' : 'OFFLINE MODE';
    connectionStatus.classList.toggle('offline', !online);
    connectionStatus.setAttribute('aria-label', online ? 'Network connection online' : 'Network connection offline');
  }

  function setStatus(message) {
    statusHeading.textContent = message;
    statusDetail.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Data is stored on this device.`;
  }

  function stopListening() {
    voiceButton.classList.remove('listening');
    voiceButton.setAttribute('aria-pressed', 'false');
    voiceLabel.textContent = 'Voice command';
  }

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      voiceButton.classList.add('listening');
      voiceButton.setAttribute('aria-pressed', 'true');
      voiceLabel.textContent = 'Listening...';
      transcript.textContent = 'Speak now.';
    };
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      transcript.textContent = `Heard: “${text}”`;
      setStatus('Voice command received');
    };
    recognition.onerror = (event) => {
      transcript.textContent = `Voice input unavailable: ${event.error}.`;
      setStatus('Voice command failed');
    };
    recognition.onend = stopListening;
    voiceButton.addEventListener('click', () => recognition.start());
  } else {
    voiceButton.disabled = true;
    voiceButton.setAttribute('aria-disabled', 'true');
    voiceLabel.textContent = 'Voice unavailable';
    transcript.textContent = 'This browser does not support speech recognition.';
  }

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.add('confirmed');
      button.textContent = `DONE: ${button.dataset.action}`;
      setStatus(button.dataset.action);
    });
  });

  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  updateConnectionStatus();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
  }
})();
