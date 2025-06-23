/**
 * NoSleep.js - 完全版 スリープ防止ライブラリ
 * モバイルデバイスの画面スリープを確実に防止
 */
class NoSleep {
    constructor() {
        this.enabled = false;
        this.media = null;
        this.wakeLock = null;
        this.intervals = [];
        this.eventListeners = [];
        
        // 複数のフォールバック戦略を準備
        this.strategies = [
            this.wakeLockStrategy.bind(this),
            this.videoStrategy.bind(this),
            this.audioStrategy.bind(this),
            this.activityStrategy.bind(this),
            this.webrtcStrategy.bind(this),
            this.workerStrategy.bind(this)
        ];
    }
    
    async enable() {
        if (this.enabled) return;
        this.enabled = true;
        
        console.log('NoSleep: Starting all anti-sleep strategies...');
        
        // すべての戦略を並行実行
        for (const strategy of this.strategies) {
            try {
                await strategy();
            } catch (error) {
                console.warn('NoSleep strategy failed:', error);
            }
        }
        
        // 画面タッチ時のリアクティベーション
        this.setupReactivation();
        
        console.log('NoSleep: All strategies activated');
    }
    
    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        
        console.log('NoSleep: Disabling all strategies...');
        
        // Wake Lock解除
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        
        // メディア停止
        if (this.media) {
            this.media.pause();
            this.media.remove();
            this.media = null;
        }
        
        // インターバル削除
        this.intervals.forEach(id => clearInterval(id));
        this.intervals = [];
        
        // イベントリスナー削除
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        console.log('NoSleep: All strategies disabled');
    }
    
    // 戦略1: Wake Lock API
    async wakeLockStrategy() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('NoSleep: Wake Lock activated');
                
                // Wake Lock再取得の定期実行
                const renewInterval = setInterval(async () => {
                    if (this.enabled && (!this.wakeLock || this.wakeLock.released)) {
                        try {
                            this.wakeLock = await navigator.wakeLock.request('screen');
                            console.log('NoSleep: Wake Lock renewed');
                        } catch (e) {
                            console.warn('NoSleep: Wake Lock renewal failed');
                        }
                    }
                }, 30000);
                this.intervals.push(renewInterval);
                
            } catch (error) {
                console.warn('NoSleep: Wake Lock failed:', error);
            }
        }
    }
    
    // 戦略2: ビデオ戦略（強化版）
    async videoStrategy() {
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = false;
        video.loop = true;
        video.volume = 0.001;
        video.style.position = 'fixed';
        video.style.top = '-1000px';
        video.style.left = '-1000px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-9999';
        
        // 透明な1フレームビデオデータ（Base64）
        video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAABe1tZGF0AAACnQYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjc0MyA1NGU2ZWM2IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNiAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAABWWWIhAA3//728P4FNjuY0JcRzeidDNmXUcNHe1fvCjUFU0KGgIEF5aHFk4QA';
        
        document.body.appendChild(video);
        this.media = video;
        
        const playVideo = async () => {
            try {
                await video.play();
                console.log('NoSleep: Video strategy activated');
            } catch (error) {
                console.warn('NoSleep: Video play failed, retrying...', error);
                setTimeout(playVideo, 1000);
            }
        };
        
        await playVideo();
        
        // 定期的な再生確認
        const videoInterval = setInterval(() => {
            if (this.enabled && video.paused) {
                playVideo();
            }
        }, 5000);
        this.intervals.push(videoInterval);
    }
    
    // 戦略3: オーディオ戦略
    async audioStrategy() {
        const audio = document.createElement('audio');
        audio.loop = true;
        audio.volume = 0.001;
        audio.muted = false;
        
        // 無音オーディオデータ（Base64）
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYdCjmH1fLNdyQGKXzH7OOZRgUO1vlHuXVlZH4SbK3k1J1YGQ5Sr+TvqWkiAQNW5qKsXp9GHhZA1e7xhjMRAUNg2OPGk3YGRLjQ0t2YWxkLZ6xmK3TF6eiOWR4PT73U2ttbFQgGUzrfWrcfAwWjRqv3zlHWAQKrOZ7dWwIv6v8lOa47nxA';
        
        document.body.appendChild(audio);
        
        const playAudio = async () => {
            try {
                await audio.play();
                console.log('NoSleep: Audio strategy activated');
            } catch (error) {
                console.warn('NoSleep: Audio play failed, retrying...', error);
                setTimeout(playAudio, 1000);
            }
        };
        
        await playAudio();
    }
    
    // 戦略4: アクティビティシミュレーション
    async activityStrategy() {
        const activities = [
            () => {
                // 微細なスクロール
                window.scrollBy(0, 0.1);
                setTimeout(() => window.scrollBy(0, -0.1), 10);
            },
            () => {
                // DOM操作
                const div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.left = '-9999px';
                div.style.opacity = '0';
                document.body.appendChild(div);
                setTimeout(() => document.body.removeChild(div), 10);
            },
            () => {
                // フォーカス操作
                const input = document.createElement('input');
                input.style.position = 'absolute';
                input.style.left = '-9999px';
                input.style.opacity = '0';
                document.body.appendChild(input);
                input.focus();
                setTimeout(() => {
                    input.blur();
                    document.body.removeChild(input);
                }, 50);
            }
        ];
        
        const activityInterval = setInterval(() => {
            if (this.enabled) {
                const activity = activities[Math.floor(Math.random() * activities.length)];
                try {
                    activity();
                } catch (error) {
                    console.warn('NoSleep: Activity simulation failed:', error);
                }
            }
        }, 10000);
        
        this.intervals.push(activityInterval);
        console.log('NoSleep: Activity simulation started');
    }
    
    // 戦略5: WebRTC戦略
    async webrtcStrategy() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1, height: 1 }, 
                audio: false 
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.style.position = 'absolute';
            video.style.left = '-9999px';
            video.style.opacity = '0';
            video.muted = true;
            video.playsInline = true;
            
            document.body.appendChild(video);
            await video.play();
            
            console.log('NoSleep: WebRTC strategy activated');
        } catch (error) {
            console.warn('NoSleep: WebRTC strategy failed:', error);
        }
    }
    
    // 戦略6: Web Worker戦略
    async workerStrategy() {
        try {
            const workerCode = `
                let keepAlive = true;
                function ping() {
                    if (keepAlive) {
                        self.postMessage('ping');
                        setTimeout(ping, 1000);
                    }
                }
                ping();
                
                self.onmessage = function(e) {
                    if (e.data === 'stop') {
                        keepAlive = false;
                    }
                };
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            
            worker.onmessage = () => {
                // Worker からのメッセージを受信してブラウザを活性化
            };
            
            this.worker = worker;
            console.log('NoSleep: Worker strategy activated');
        } catch (error) {
            console.warn('NoSleep: Worker strategy failed:', error);
        }
    }
    
    setupReactivation() {
        const reactivate = () => {
            if (this.enabled) {
                // Wake Lockを再取得
                if ('wakeLock' in navigator) {
                    navigator.wakeLock.request('screen').then(wakeLock => {
                        this.wakeLock = wakeLock;
                    }).catch(() => {});
                }
                
                // メディア再生を確認
                if (this.media && this.media.paused) {
                    this.media.play().catch(() => {});
                }
            }
        };
        
        const events = ['touchstart', 'touchmove', 'touchend', 'click', 'scroll', 'keydown'];
        events.forEach(eventName => {
            const handler = reactivate;
            document.addEventListener(eventName, handler, { passive: true });
            this.eventListeners.push({ element: document, event: eventName, handler });
        });
        
        // ページ復帰時の再アクティベーション
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                setTimeout(reactivate, 100);
            }
        };
        
        document.addEventListener('visibilitychange', visibilityHandler);
        this.eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler });
    }
}

// グローバルインスタンスを作成
window.noSleep = new NoSleep();