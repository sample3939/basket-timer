class BasketTimer {
    constructor() {
        this.isRunning = false;
        this.totalSeconds = 0;
        this.currentSeconds = 0;
        this.intervalId = null;
        this.wakeLock = null;
        this.audioContext = null;
        this.voiceQueue = [];
        this.isAnnouncing = false;
        this.lastAnnouncedMinute = -1;
        this.hasAnnounced30Seconds = false;
        this.countdownStarted = false;
        this.voiceAudios = {};
        this.visibilityChangeListenerAdded = false;
        this.periodicWakeLockInterval = null;
        this.fallbackVideo = null;
        this.noSleepEnabled = false;
        this.activitySimulationInterval = null;
        
        this.isIntervalMode = false;
        this.intervalPhase = 0; // 0: 7分, 1: 3分
        this.totalCycles = 0;
        
        this.minutesValue = 10;
        this.secondsValue = 0;
        
        this.minutesWheel = null;
        this.secondsWheel = null;
        
        this.initElements();
        this.createWheels();
        this.initEventListeners();
        this.initAudio();
        this.registerServiceWorker();
        
        // 初期化完了後にホイール位置を確定
        setTimeout(() => {
            this.updateMinutesWheel();
            this.updateSecondsWheel();
        }, 150);
    }
    
    initElements() {
        this.timerSetup = document.getElementById('timerSetup');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.intervalBtn = document.getElementById('intervalBtn');
        this.timeRemaining = document.getElementById('timeRemaining');
        this.buzzer = document.getElementById('buzzer');
        this.silentAudio = document.getElementById('silentAudio');
        
        // Dedicated voice audio elements
        this.voiceElements = {
            '10min': document.getElementById('voice-10min'),
            '9min': document.getElementById('voice-9min'),
            '8min': document.getElementById('voice-8min'),
            '7min': document.getElementById('voice-7min'),
            '6min': document.getElementById('voice-6min'),
            '5min': document.getElementById('voice-5min'),
            '4min': document.getElementById('voice-4min'),
            '3min': document.getElementById('voice-3min'),
            '2min': document.getElementById('voice-2min'),
            '1min': document.getElementById('voice-1min'),
            '30sec': document.getElementById('voice-30sec'),
            '10': document.getElementById('voice-10'),
            '9': document.getElementById('voice-9'),
            '8': document.getElementById('voice-8'),
            '7': document.getElementById('voice-7'),
            '6': document.getElementById('voice-6'),
            '5': document.getElementById('voice-5'),
            '4': document.getElementById('voice-4'),
            '3': document.getElementById('voice-3'),
            '2': document.getElementById('voice-2'),
            '1': document.getElementById('voice-1')
        };
        
        this.minutesItems = document.getElementById('minutesItems');
        this.secondsItems = document.getElementById('secondsItems');
        
        // タイマー設定画面でも画面ロックを防止
        this.keepAwake();
        
        // NoSleep.jsライブラリを有効化
        if (window.noSleep) {
            setTimeout(() => {
                window.noSleep.enable().then(() => {
                    console.log('NoSleep library activated');
                }).catch(error => {
                    console.warn('NoSleep library failed:', error);
                });
            }, 1000);
        }
    }
    
    createWheels() {
        this.createMinutesWheel();
        this.createSecondsWheel();
        this.setupWheelInteraction();
    }
    
    createMinutesWheel() {
        this.minutesItems.innerHTML = '';
        for (let i = 0; i <= 59; i++) {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.textContent = i;
            item.dataset.value = i;
            item.addEventListener('click', () => {
                this.minutesValue = i;
                this.updateMinutesWheel();
            });
            this.minutesItems.appendChild(item);
        }
        // 短い遅延でホイールを更新
        setTimeout(() => this.updateMinutesWheel(), 50);
    }
    
    createSecondsWheel() {
        this.secondsItems.innerHTML = '';
        for (let i = 0; i <= 55; i += 5) {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.textContent = i.toString().padStart(2, '0');
            item.dataset.value = i;
            item.addEventListener('click', () => {
                this.secondsValue = i;
                this.updateSecondsWheel();
            });
            this.secondsItems.appendChild(item);
        }
        // 短い遅延でホイールを更新
        setTimeout(() => this.updateSecondsWheel(), 50);
    }
    
    updateMinutesWheel() {
        const items = this.minutesItems.querySelectorAll('.wheel-item');
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = window.innerWidth <= 480;
        const isTablet = window.innerWidth >= 768;
        const isTabletLandscape = isTablet && isLandscape;
        
        // Use exact CSS media query values
        let wheelHeight, itemHeight;
        if (isTabletLandscape) {
            // @media (min-width: 768px) and (orientation: landscape) - tablet landscape
            wheelHeight = 140;
            itemHeight = 35;
        } else if (isLandscape && !isTablet) {
            // @media (orientation: landscape) - mobile landscape
            wheelHeight = 120;
            itemHeight = 30;
        } else if (isTablet) {
            // @media (min-width: 768px) - tablet portrait
            wheelHeight = 240;
            itemHeight = 48;
        } else if (isMobile) {
            // @media (max-width: 480px)
            wheelHeight = 160;
            itemHeight = 32;
        } else {
            // Default desktop
            wheelHeight = 200;
            itemHeight = 40;
        }
        
        const centerOffset = wheelHeight / 2 - itemHeight / 2;
        
        items.forEach((item, index) => {
            item.classList.remove('selected', 'adjacent', 'far');
            
            const distance = Math.abs(index - this.minutesValue);
            if (index === this.minutesValue) {
                item.classList.add('selected');
            } else if (distance === 1) {
                item.classList.add('adjacent');
            } else if (distance === 2) {
                item.classList.add('far');
            }
        });
        
        const translateY = centerOffset - (this.minutesValue * itemHeight);
        this.minutesItems.style.transform = `translateY(${translateY}px)`;
    }
    
    updateSecondsWheel() {
        const items = this.secondsItems.querySelectorAll('.wheel-item');
        const isLandscape = window.innerWidth > window.innerHeight;
        const isMobile = window.innerWidth <= 480;
        const isTablet = window.innerWidth >= 768;
        const isTabletLandscape = isTablet && isLandscape;
        
        // Use exact CSS media query values
        let wheelHeight, itemHeight;
        if (isTabletLandscape) {
            // @media (min-width: 768px) and (orientation: landscape) - tablet landscape
            wheelHeight = 140;
            itemHeight = 35;
        } else if (isLandscape && !isTablet) {
            // @media (orientation: landscape) - mobile landscape
            wheelHeight = 120;
            itemHeight = 30;
        } else if (isTablet) {
            // @media (min-width: 768px) - tablet portrait
            wheelHeight = 240;
            itemHeight = 48;
        } else if (isMobile) {
            // @media (max-width: 480px)
            wheelHeight = 160;
            itemHeight = 32;
        } else {
            // Default desktop
            wheelHeight = 200;
            itemHeight = 40;
        }
        
        const centerOffset = wheelHeight / 2 - itemHeight / 2;
        const secondsIndex = this.secondsValue / 5;
        
        items.forEach((item, index) => {
            item.classList.remove('selected', 'adjacent', 'far');
            
            const distance = Math.abs(index - secondsIndex);
            if (index === secondsIndex) {
                item.classList.add('selected');
            } else if (distance === 1) {
                item.classList.add('adjacent');
            } else if (distance === 2) {
                item.classList.add('far');
            }
        });
        
        const translateY = centerOffset - (secondsIndex * itemHeight);
        this.secondsItems.style.transform = `translateY(${translateY}px)`;
    }
    
    setupWheelInteraction() {
        this.setupWheelEvents(this.minutesItems, 'minutes');
        this.setupWheelEvents(this.secondsItems, 'seconds');
    }
    
    setupWheelEvents(wheelElement, type) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let startValue = 0;
        let velocity = 0;
        let lastTime = 0;
        let lastY = 0;
        
        const handleStart = (e) => {
            isDragging = true;
            startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            lastY = startY;
            lastTime = Date.now();
            velocity = 0;
            startValue = type === 'minutes' ? this.minutesValue : Math.floor(this.secondsValue / 5);
            wheelElement.style.transition = 'none';
        };
        
        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            const deltaY = startY - currentY;
            const currentTime = Date.now();
            
            // Calculate velocity for momentum scrolling
            if (currentTime - lastTime > 0) {
                velocity = (lastY - currentY) / (currentTime - lastTime);
            }
            lastY = currentY;
            lastTime = currentTime;
            
            const isLandscape = window.innerWidth > window.innerHeight;
            const isMobile = window.innerWidth <= 480;
            const isTablet = window.innerWidth >= 768;
            const isTabletLandscape = isTablet && isLandscape;
            
            // Use exact CSS media query values
            let itemHeight;
            if (isTabletLandscape) {
                itemHeight = 35;
            } else if (isLandscape && !isTablet) {
                itemHeight = 30;
            } else if (isTablet) {
                itemHeight = 48;
            } else if (isMobile) {
                itemHeight = 32;
            } else {
                itemHeight = 40;
            }
            const steps = Math.round(deltaY / itemHeight);
            
            if (type === 'minutes') {
                this.minutesValue = Math.max(0, Math.min(59, startValue + steps));
                this.updateMinutesWheel();
            } else {
                const newIndex = Math.max(0, Math.min(11, startValue + steps));
                this.secondsValue = newIndex * 5;
                this.updateSecondsWheel();
            }
        };
        
        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            wheelElement.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Apply momentum scrolling
            if (Math.abs(velocity) > 0.5) {
                const momentumSteps = Math.round(velocity * 100);
                const currentValue = type === 'minutes' ? this.minutesValue : Math.floor(this.secondsValue / 5);
                
                if (type === 'minutes') {
                    this.minutesValue = Math.max(0, Math.min(59, currentValue + momentumSteps));
                    this.updateMinutesWheel();
                } else {
                    const newIndex = Math.max(0, Math.min(11, currentValue + momentumSteps));
                    this.secondsValue = newIndex * 5;
                    this.updateSecondsWheel();
                }
            }
        };
        
        // Mouse wheel support
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;
            
            if (type === 'minutes') {
                this.minutesValue = Math.max(0, Math.min(59, this.minutesValue + delta));
                this.updateMinutesWheel();
            } else {
                const currentIndex = Math.floor(this.secondsValue / 5);
                const newIndex = Math.max(0, Math.min(11, currentIndex + delta));
                this.secondsValue = newIndex * 5;
                this.updateSecondsWheel();
            }
        };
        
        wheelElement.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        wheelElement.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        
        wheelElement.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    initEventListeners() {
        this.startBtn.addEventListener('click', () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = !isMobileDevice && !isTouchDevice;
            
            if (isDesktop) {
                // デスクトップの場合は音声初期化
                this.initAudioContext();
                console.log('Desktop audio initialization');
            } else {
                // モバイル・タブレットの場合は従来の処理
                this.initAudioContext();
                this.testAudio();
                console.log('Mobile/Tablet audio initialization');
            }
            
            this.startTimer();
        });
        
        this.intervalBtn.addEventListener('click', () => {
            this.toggleIntervalMode();
        });
        this.stopBtn.addEventListener('click', () => this.toggleTimer());
        this.cancelBtn.addEventListener('click', () => this.cancelTimer());
        
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                const isDesktop = !isMobileDevice && !isTouchDevice;
                
                // 音声初期化
                this.initAudioContext();
                console.log('Audio initialization');
                
                const timeInSeconds = parseInt(btn.dataset.time);
                this.minutesValue = Math.floor(timeInSeconds / 60);
                this.secondsValue = timeInSeconds % 60;
                this.secondsValue = Math.floor(this.secondsValue / 5) * 5;
                this.updateMinutesWheel();
                this.updateSecondsWheel();
            });
        });
        
        // 初回タッチで音声を有効化
        document.addEventListener('touchstart', () => this.initAudioContext(), { once: true });
        document.addEventListener('click', () => this.initAudioContext(), { once: true });
        
        // シンプルなorientation change対応
        let orientationTimer = null;
        window.addEventListener('orientationchange', () => {
            if (orientationTimer) clearTimeout(orientationTimer);
            orientationTimer = setTimeout(() => {
                this.updateMinutesWheel();
                this.updateSecondsWheel();
            }, 400);
        });
    }
    
    toggleIntervalMode() {
        this.isIntervalMode = !this.isIntervalMode;
        
        if (this.isIntervalMode) {
            this.intervalBtn.classList.add('active');
            this.intervalBtn.textContent = '7分→3分 OFF';
            this.intervalPhase = 0;
            this.totalCycles = 0;
            // 7分に設定
            this.minutesValue = 7;
            this.secondsValue = 0;
            this.updateMinutesWheel();
            this.updateSecondsWheel();
        } else {
            this.intervalBtn.classList.remove('active');
            this.intervalBtn.textContent = '7分→3分 繰り返し';
            // 通常モードに戻す
            this.minutesValue = 10;
            this.secondsValue = 0;
            this.updateMinutesWheel();
            this.updateSecondsWheel();
        }
    }
    
    initAudio() {
        this.buzzer.volume = 1.0;
        // 専用音声要素も初期化
        Object.values(this.voiceElements).forEach(voiceElement => {
            if (voiceElement) {
                voiceElement.volume = 1.0;
                voiceElement.preload = 'auto';
            }
        });
    }
    
    
    
    async initAudioContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            }
            
            // 音声を確実に有効化
            await this.testAudio();
        } catch (error) {
            console.warn('Audio context initialization failed:', error);
        }
    }
    
    async testAudio() {
        try {
            // ブザー音の準備（再生せずに準備のみ）
            this.buzzer.volume = 1.0;
            this.buzzer.load();
            console.log('Audio test successful - buzzer loaded without playing');
            
            // 専用音声要素をモバイル用に有効化（完全無音）
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            if (isMobileDevice || isTouchDevice) {
                // モバイル・タブレットでのみ音声を事前準備（完全無音で初期化のみ）
                Object.values(this.voiceElements).forEach(async (voiceElement) => {
                    if (voiceElement) {
                        try {
                            // 完全に無音で初期化（二重の無音化）
                            voiceElement.muted = true;
                            voiceElement.volume = 0;
                            voiceElement.currentTime = 0;
                            
                            // 確実にmuted状態で再生
                            await new Promise(resolve => {
                                voiceElement.onloadeddata = () => {
                                    voiceElement.muted = true; // 再度確認
                                    const playPromise = voiceElement.play();
                                    if (playPromise) {
                                        playPromise.then(() => {
                                            voiceElement.pause();
                                            voiceElement.currentTime = 0;
                                            // 初期化完了後にmutedを解除して音量を設定
                                            voiceElement.muted = false;
                                            voiceElement.volume = 1.0;
                                            resolve();
                                        }).catch(error => {
                                            console.warn('Silent play failed:', error);
                                            resolve();
                                        });
                                    } else {
                                        resolve();
                                    }
                                };
                                
                                // タイムアウト処理
                                setTimeout(() => {
                                    resolve();
                                }, 100);
                            });
                            
                            console.log('Voice element silently initialized for mobile:', voiceElement.id);
                        } catch (error) {
                            console.warn('Voice element initialization failed:', voiceElement.id, error);
                        }
                    }
                });
            } else {
                // デスクトップでは音声準備をスキップ
                console.log('Desktop detected - skipping voice element preparation');
            }
            console.log('Voice elements prepared and activated for mobile');
        } catch (error) {
            console.warn('Audio test failed:', error);
        }
    }
    
    
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }
    
    async keepAwake() {
        console.log('Attempting to keep screen awake...');
        
        // デスクトップかどうかを判定
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isDesktop = !isMobileDevice && !isTouchDevice;
        
        if (isDesktop) {
            console.log('Desktop detected - Wake Lock not needed');
            return;
        }
        
        // Wake Lock APIを試行（モバイル・タブレットのみ）
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock activated successfully');
                
                // Wake Lockが解除された時の処理
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock was released');
                });
                
                // ページが非表示になった時のリスナーを追加
                if (!this.visibilityChangeListenerAdded) {
                    document.addEventListener('visibilitychange', async () => {
                        if (document.visibilityState === 'visible' && (this.isRunning || this.timerSetup.style.display !== 'none')) {
                            try {
                                this.wakeLock = await navigator.wakeLock.request('screen');
                                console.log('Wake Lock reactivated after visibility change');
                            } catch (error) {
                                console.warn('Wake Lock reactivation failed:', error);
                                this.fallbackKeepAwake();
                            }
                        }
                    });
                    this.visibilityChangeListenerAdded = true;
                }
                
                // フォールバックも同時に実行（確実性向上）
                this.fallbackKeepAwake();
                
            } catch (error) {
                console.warn('Wake Lock failed:', error);
                this.fallbackKeepAwake();
            }
        } else {
            console.log('Wake Lock not supported, using fallback only');
            this.fallbackKeepAwake();
        }
        
        // 定期的なWake Lock再要求
        this.setupPeriodicWakeLock();
    }
    
    fallbackKeepAwake() {
        try {
            console.log('Starting fallback keep awake methods...');
            
            // デスクトップかどうかを判定
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isDesktop = !isMobileDevice && !isTouchDevice;
            
            if (!isDesktop) {
                // モバイル・タブレットでのみ無音オーディオを再生
                this.silentAudio.loop = true;
                this.silentAudio.muted = false;
                this.silentAudio.volume = 0.001;
                this.silentAudio.play().then(() => {
                    console.log('Silent audio started successfully (mobile/tablet only)');
                }).catch(error => {
                    console.warn('Silent audio failed:', error);
                });
            } else {
                console.log('Desktop detected - skipping silent audio');
            }
            
        } catch (error) {
            console.warn('Fallback keep awake failed:', error);
        }
    }
    
    setupPeriodicWakeLock() {
        // デスクトップかどうかを判定
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isDesktop = !isMobileDevice && !isTouchDevice;
        
        if (isDesktop) {
            console.log('Desktop detected - Periodic Wake Lock not needed');
            return;
        }
        
        // 30秒ごとにWake Lockを再要求（モバイル・タブレットのみ）
        this.periodicWakeLockInterval = setInterval(async () => {
            if ('wakeLock' in navigator && (this.isRunning || this.timerSetup.style.display !== 'none')) {
                try {
                    if (!this.wakeLock || this.wakeLock.released) {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                        console.log('Periodic Wake Lock renewed');
                    }
                } catch (error) {
                    console.warn('Periodic Wake Lock renewal failed:', error);
                }
            }
        }, 30000);
    }
    
    releaseAwake() {
        console.log('Releasing wake lock...');
        
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        
        if (this.periodicWakeLockInterval) {
            clearInterval(this.periodicWakeLockInterval);
            this.periodicWakeLockInterval = null;
        }
        
        try {
            this.silentAudio.pause();
            this.silentAudio.currentTime = 0;
        } catch (error) {
            console.warn('Silent audio stop failed:', error);
        }
        
        if (this.fallbackVideo) {
            this.fallbackVideo.pause();
            this.fallbackVideo.currentTime = 0;
        }
        
        if (this.noSleepEnabled) {
            this.noSleepEnabled = false;
        }
        
        if (this.activitySimulationInterval) {
            clearInterval(this.activitySimulationInterval);
            this.activitySimulationInterval = null;
        }
    }
    
    startTimer() {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isDesktop = !isMobileDevice && !isTouchDevice;
        const isMobile = isMobileDevice || isTouchDevice;
        
        // モバイルデバイスでのみフルスクリーンを有効化
        if (isMobile && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(error => {
                console.log('Fullscreen request failed:', error);
            });
        }
        
        // 音声初期化
        this.initAudioContext();
        console.log('Timer start - audio initialization');
        
        // 初回開始時のみ時間設定を取得
        if (this.currentSeconds === 0) {
            if (this.isIntervalMode) {
                // インターバルモードの場合は現在のフェーズに応じて時間を設定
                const currentTime = this.intervalPhase === 0 ? 7 * 60 : 3 * 60;
                this.totalSeconds = currentTime;
                this.currentSeconds = currentTime;
            } else {
                this.totalSeconds = this.minutesValue * 60 + this.secondsValue;
                this.currentSeconds = this.totalSeconds;
            }
            
            if (this.currentSeconds <= 0) return;
            
            this.lastAnnouncedMinute = -1;
            this.hasAnnounced30Seconds = false;
            this.countdownStarted = false;
        }
        
        this.isRunning = true;
        
        this.timerSetup.classList.add('hidden');
        this.timerDisplay.classList.remove('hidden');
        
        this.updateDisplay();
        this.keepAwake();
        
        this.intervalId = setInterval(() => {
            this.currentSeconds--;
            
            // モバイルデバイス判定
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobile = isMobileDevice || isTouchDevice;
            
            if (isMobile) {
                // モバイル: 音声を200ms早く再生してBluetooth遅延を補正
                setTimeout(() => this.handleAnnouncements(), 0);
                setTimeout(() => this.updateDisplay(), 200);
                
                // モバイル: ブザー音も200ms早く再生（0になる瞬間に合わせる）
                if (this.currentSeconds <= 0) {
                    setTimeout(() => this.endTimer(), 0);
                }
            } else {
                // デスクトップ: 従来通り
                this.handleAnnouncements();
                this.updateDisplay();
                
                if (this.currentSeconds <= 0) {
                    this.endTimer();
                }
            }
        }, 1000);
    }
    
    
    
    
    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.resumeTimer();
        }
    }
    
    pauseTimer() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.releaseAwake();
        this.stopAllAnnouncements();
        
        this.stopBtn.innerHTML = '▶';
        this.stopBtn.style.color = '#34c759';
        this.stopBtn.style.borderColor = '#34c759';
    }
    
    resumeTimer() {
        this.isRunning = true;
        this.keepAwake();
        
        this.stopBtn.innerHTML = '❚❚';
        this.stopBtn.style.color = '#ff9500';
        this.stopBtn.style.borderColor = '#ff9500';
        
        this.intervalId = setInterval(() => {
            this.currentSeconds--;
            
            // モバイルデバイス判定
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobile = isMobileDevice || isTouchDevice;
            
            if (isMobile) {
                // モバイル: 音声を200ms早く再生してBluetooth遅延を補正
                setTimeout(() => this.handleAnnouncements(), 0);
                setTimeout(() => this.updateDisplay(), 200);
                
                // モバイル: ブザー音も200ms早く再生（0になる瞬間に合わせる）
                if (this.currentSeconds <= 0) {
                    setTimeout(() => this.endTimer(), 0);
                }
            } else {
                // デスクトップ: 従来通り
                this.handleAnnouncements();
                this.updateDisplay();
                
                if (this.currentSeconds <= 0) {
                    this.endTimer();
                }
            }
        }, 1000);
    }
    
    cancelTimer() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.timerSetup.classList.remove('hidden');
        this.timerDisplay.classList.add('hidden');
        
        this.releaseAwake();
        this.stopAllAnnouncements();
        
        // NoSleep.jsライブラリを無効化
        if (window.noSleep) {
            window.noSleep.disable();
        }
        
        this.currentSeconds = 0;
        
        if (this.isIntervalMode) {
            // インターバルモードの場合は7分に戻す
            this.intervalPhase = 0;
            this.minutesValue = 7;
            this.secondsValue = 0;
        } else {
            this.minutesValue = 10;
            this.secondsValue = 0;
        }
        this.updateMinutesWheel();
        this.updateSecondsWheel();
        
        // ボタンの状態をリセット
        this.stopBtn.innerHTML = '❚❚';
        this.stopBtn.style.color = '#ff9500';
        this.stopBtn.style.borderColor = '#ff9500';
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.currentSeconds / 60);
        const seconds = this.currentSeconds % 60;
        this.timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    handleAnnouncements() {
        const minutes = Math.floor(this.currentSeconds / 60);
        const seconds = this.currentSeconds % 60;
        
        // 次の音声を先読み（モバイル用最適化）
        this.preloadNextVoice();
        
        if (seconds === 0 && minutes > 0 && minutes <= 10 && minutes !== this.lastAnnouncedMinute) {
            this.announce(`${minutes}min`);
            this.lastAnnouncedMinute = minutes;
        }
        
        if (this.currentSeconds === 30 && !this.hasAnnounced30Seconds && this.currentSeconds < this.totalSeconds) {
            this.announce('30sec');
            this.hasAnnounced30Seconds = true;
        }
        
        if (this.currentSeconds <= 10 && this.currentSeconds >= 1 && !this.countdownStarted) {
            this.countdownStarted = true;
        }
        
        if (this.countdownStarted && this.currentSeconds <= 10 && this.currentSeconds >= 1) {
            this.announce(this.currentSeconds.toString());
        }
    }
    
    preloadNextVoice() {
        // 専用音声要素を使用しているため、既に全て読み込み済み
        // この関数は不要だが、互換性のため残しておく
    }
    
    announce(audioKey) {
        // ブザーと全く同じaudio要素で音声再生
        this.playVoiceWithBuzzer(audioKey);
    }
    
    playVoiceWithBuzzer(audioKey) {
        try {
            const voiceElement = this.voiceElements[audioKey];
            if (!voiceElement) {
                console.warn('Voice element not found:', audioKey);
                return;
            }
            
            // モバイルデバイス判定
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobile = isMobileDevice || isTouchDevice;
            
            // 専用の音声要素を使用
            voiceElement.volume = 1.0;
            voiceElement.currentTime = 0;
            
            // 統一された音声再生処理
            const playPromise = voiceElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Voice played successfully:', audioKey);
                }).catch(error => {
                    console.warn('Voice play failed:', audioKey, error);
                });
            }
        } catch (error) {
            console.warn('Voice play failed:', audioKey, error);
        }
    }
    
    
    
    stopAllAnnouncements() {
        // 全ての専用音声要素を停止
        Object.values(this.voiceElements).forEach(voiceElement => {
            if (voiceElement) {
                voiceElement.pause();
                voiceElement.currentTime = 0;
            }
        });
    }
    
    async endTimer() {
        console.log('Timer ended - starting cleanup');
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.releaseAwake();
        this.stopAllAnnouncements();
        
        // ブザー音を再生（非同期、エラーが発生しても続行）
        this.playBuzzerSound();
        
        if (this.isIntervalMode) {
            // インターバルモードの場合は次のフェーズに進む
            this.handleIntervalTransition();
        } else {
            // 通常モードの場合は設定画面に戻る
            this.returnToSetup();
        }
    }
    
    handleIntervalTransition() {
        // フェーズを切り替え
        this.intervalPhase = this.intervalPhase === 0 ? 1 : 0;
        if (this.intervalPhase === 0) {
            this.totalCycles++;
        }
        
        const phaseName = this.intervalPhase === 0 ? '7分' : '3分';
        console.log(`${phaseName}開始`);
        
        console.log(`Interval transition to phase ${this.intervalPhase} (${phaseName}), cycle ${this.totalCycles}`);
        
        // 2秒後に次のタイマーを開始
        setTimeout(() => {
            this.currentSeconds = 0; // リセットして新しい時間を設定
            this.hasAnnounced30Seconds = false; // 30秒フラグをリセット
            this.lastAnnouncedMinute = -1; // 分単位フラグをリセット
            this.countdownStarted = false; // カウントダウンフラグをリセット
            this.startTimer();
        }, 2000);
    }
    
    returnToSetup() {
        console.log('Setting timeout to return to setup screen');
        setTimeout(() => {
            console.log('Returning to setup screen');
            this.timerSetup.classList.remove('hidden');
            this.timerDisplay.classList.add('hidden');
            
            // タイマーをリセット
            this.currentSeconds = 0;
            if (!this.isIntervalMode) {
                this.minutesValue = 10;
                this.secondsValue = 0;
                this.updateMinutesWheel();
                this.updateSecondsWheel();
            }
            
            // ボタンの状態をリセット
            this.stopBtn.innerHTML = '❚❚';
            this.stopBtn.style.color = '#ff9500';
            this.stopBtn.style.borderColor = '#ff9500';
            console.log('Setup screen restored');
        }, 2000);
    }
    
    playBuzzerSound() {
        try {
            // ブザー音を再生（専用音声要素とは別）
            this.buzzer.volume = 1.0;
            this.buzzer.currentTime = 0;
            
            // Web Audio APIでゲインを追加（可能な場合）
            this.setupBuzzerGain();
            
            const playPromise = this.buzzer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Buzzer played successfully at maximum volume');
                }).catch(error => {
                    console.warn('Buzzer play failed:', error);
                });
            }
        } catch (error) {
            console.warn('Buzzer play failed:', error);
        }
    }
    
    setupBuzzerGain() {
        try {
            if (this.audioContext && !this.buzzerGainSetup) {
                const source = this.audioContext.createMediaElementSource(this.buzzer);
                const gainNode = this.audioContext.createGain();
                
                // ゲインを2.0に設定（音量を2倍に増幅、ただし歪みに注意）
                gainNode.gain.value = 2.0;
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                this.buzzerGainSetup = true;
                console.log('Buzzer gain amplification setup completed');
            }
        } catch (error) {
            console.warn('Buzzer gain setup failed:', error);
        }
    }
}

// Initialize the timer
const timer = new BasketTimer();