<template>
  <div class="wrapper" @mousemove="handleWrapperMouseMove" @mouseleave="handleWrapperMouseLeave">

    <div class="scene" :class="{ moved: isStarted, maximized: isMaximized }">
  
      <div class="backplate-outer">
        <div style="position: fixed; bottom: 0; margin: 0 10%;">
          <div class="storage">
            <span class="label" style="margin-bottom: 0;">{{ lang === 'en' ? 'Data Storage' : '数据储存' }}</span>
            <label class="switch">
              <input type="checkbox" v-model="relay.store" @change="toggleStore" />
              <span class="slider">
                <span class="slider-knob"></span>
              </span>
            </label>
            <span class="value" :class="{ 'active': relay.store }">
              {{ relay.store ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </div>
      </div>
      <div class="backplate-inner">
        <div class="title-bar">
          <div class="title-bar-drag">
            <span class="title-text">{{ lang === 'en' ? 'Gun Relay - TalkFlow' : '枪支中继器 - TalkFlow' }}</span>
          </div>
          <div class="title-bar-controls">
            <button class="control-btn lang-toggle" @click="toggleLang">
              {{ lang === 'en' ? '中文' : 'English' }}
            </button>
            <button class="control-btn minimize" @click="minimizeWindow" title="Minimize">-</button>
            <button class="control-btn close" @click="closeWindow" title="Close">×</button>
          </div>
        </div>
      </div>
      <div
        class="phone"
        :class="{ shifted: isStarted, 'border-animate': isStarted, maximized: isMaximized }"
        :style="combinedPhoneStyle"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @mousedown="handleMouseDown"
        @mousemove="handleDraggingMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <div :class="{ phone__panel: !isStarted, phone__panel1: isStarted }">
        
          <div class="status-grid">
            <div class="status-card status">
              <div class="label">{{ lang === 'en' ? 'Status' : '状态' }}</div>
              <div class="status-content">
                <span :class="['status-value', relay.status]">{{ relay.status }}</span>
                <span class="sub-text" v-if="relay.pulse && relay.started">
                  <span class="time">{{ formatTime(relay.pulse - relay.started) }}</span>
                  <span class="time-seconds">({{ ((relay.pulse - relay.started) / 1000).toFixed(2) }}s)</span>
                </span>
                <span class="sub-text waiting" v-else>Waiting...</span>
              </div>
            </div>
            <div class="status-card wires">
              <div class="label">{{ lang === 'en' ? 'Active Wires' : '活跃数量' }}</div>
              <div class="value-progress">
                <span style="color: black;font-size: 20px;">{{ relay.activeWires }} / {{ relay.totalConnections }}</span>
                <!-- <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(relay.activeWires / relay.totalConnections) * 100}%` }"></div>
                </div> -->
              </div>
            </div>
            <div class="status-card link-qr" style="width: 100vw;">
              <div class="label">Relay URL</div>
              <div class="link-qr-content">
                <a :href="relay.link + '/gun'" target="_blank" class="peer-link">{{ relay.link }}/gun</a>
                <div class="qr-container" v-if="relay.link" v-html="qrcodeSvg(relay.link)"></div>
              </div>
            </div>
            <!-- <div class="status-card network">
              <div class="label">Network Mode</div>
              <div class="network-content">
                <span class="network-value" :class="{ 'world': isWorldMode, 'local': !isWorldMode }">
                  {{ isWorldMode ? 'World Mode' : 'Local Mode' }}
                </span>
              </div>
            </div> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import GUN from 'gun';
import ms from 'ms';
import qrcodeSvg from '@qrcode/svg';
import { reactive, onMounted, ref } from 'vue';

export default {
  name: 'RelayPeerPhone',
  setup() {
    let gun;
    const relay = reactive({
      status: 'connecting',
      pulse: 0,
      started: 0,
      store: false,
      host: '',
      message: '',
      activeWires: 0,
      totalConnections: 0,
      link: '',
      talk(ev) {
        if (gun) {
          gun.get('talkflow-messages').get('message').put(ev.target.value);
          console.log('Message sent:', ev.target.value);
        }
      },
      listen(db) {
        db.map().on((d, k) => {
          console.log('GUN update:', k, d);
          relay[k] = d;
        });
      },
    });

    const lang = ref('en');
    const isStarted = ref(false);
    const isMaximized = ref(false);
    const isWorldMode = ref(false);
    const rotation = reactive({ x: -13, y: -13 });
    const hoverRotation = reactive({ x: 0, y: 0 });
    const touchStart = reactive({ x: 0, y: 0 });
    const mouseStart = reactive({ x: 0, y: 0 });
    const initialRotation = reactive({ x: -13, y: -13 });
    const isDragging = ref(false);

    const toggleLang = () => {
      lang.value = lang.value === 'en' ? 'zh' : 'en';
    };

    const formatTime = (milliseconds) => {
      if (!milliseconds || isNaN(milliseconds)) return '0ms';
      return ms(milliseconds);
    };

    const toggleStore = async () => {
      if (!window.electronAPI || typeof window.electronAPI.setRelayStore !== 'function') {
        console.error('electronAPI.setRelayStore is not available');
        return;
      }
      try {
        await window.electronAPI.setRelayStore(relay.store);
        console.log('Data storage set to:', relay.store);
        gun.get(relay.host).get('store').put(relay.store);
      } catch (err) {
        console.error('Failed to toggle store:', err);
        relay.store = !relay.store;
      }
    };

    const minimizeWindow = () => {
      window.electronAPI.send('window-minimize');
    };

    const closeWindow = () => {
      window.electronAPI.send('window-close');
    };

    const toggleStart = () => {
      isStarted.value = !isStarted.value;
    };

    const handleTouchStart = (event) => {
      touchStart.x = event.touches[0].clientX;
      touchStart.y = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
      if (event.touches.length !== 1) return;
      const touchEndX = event.touches[0].clientX;
      const touchEndY = event.touches[0].clientY;
      const diffX = touchEndX - touchStart.x;
      const diffY = touchEndY - touchStart.y;
      rotation.y += diffX / 10;
      rotation.x -= diffY / 10;
      touchStart.x = touchEndX;
      touchStart.y = touchEndY;
    };

    const handleMouseDown = (event) => {
      isDragging.value = true;
      mouseStart.x = event.clientX;
      mouseStart.y = event.clientY;
      initialRotation.x = rotation.x;
      initialRotation.y = rotation.y;
    };

    const handleDraggingMouseMove = (event) => {
      if (!isDragging.value) return;
      const diffX = event.clientX - mouseStart.x;
      const diffY = event.clientY - mouseStart.y;
      rotation.y = initialRotation.y + diffX / 10;
      rotation.x = initialRotation.x - diffY / 10;
    };

    const handleMouseUp = () => {
      isDragging.value = false;
    };

    const handleWrapperMouseMove = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const maxTilt = 5;
      const edgeThreshold = 0.2;

      const deltaX = (x - halfWidth) / halfWidth;
      const deltaY = (y - halfHeight) / halfHeight;
      hoverRotation.x = deltaY * maxTilt;
      hoverRotation.y = deltaX * maxTilt;

      if (!isMaximized.value) {
        if (deltaX < -1 + edgeThreshold) hoverRotation.y -= 3;
        if (deltaX > 1 - edgeThreshold) hoverRotation.y += 3;
        if (deltaY < -1 + edgeThreshold) hoverRotation.x -= 3;
        if (deltaY > 1 - edgeThreshold) hoverRotation.x += 3;
      }
    };

    const handleWrapperMouseLeave = () => {
      hoverRotation.x = 0;
      hoverRotation.y = 0;
    };

    const combinedPhoneStyle = () => ({
      transform: `rotateX(${rotation.x + hoverRotation.x}deg) rotateY(${rotation.y + hoverRotation.y}deg)`,
    });

 
    const checkNetworkStatus = async () => {
      try {

        const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
        isWorldMode.value = true; 
      } catch (err) {
        isWorldMode.value = false; 
      }
    };

    onMounted(() => {
      if (!window.electronAPI) {
        console.error('electronAPI not available');
        return;
      }

      window.electronAPI
        .getRelayInfo()
        .then((info) => {
          console.log('Relay info received:', info);
          relay.link = info.link;
          relay.host = info.host;
          gun = GUN([info.link + '/gun']);
          const db = gun.get(info.host);
          relay.listen(db);
          console.log('Connected to GUN at:', info.link + '/gun');
        })
        .catch((err) => {
          console.error('Failed to get relay info:', err);
          relay.status = 'error';
        });

      window.electronAPI.onRelayUpdate((data) => {
        console.log('Relay update received:', data);
        relay.activeWires = data.activeWires;
        relay.totalConnections = data.totalConnections;
      });

      window.electronAPI.on('window-maximized', () => {
        isMaximized.value = true;
      });

      window.electronAPI.on('window-unmaximized', () => {
        isMaximized.value = false;
      });

      window.electronAPI.invoke('is-window-maximized').then((maximized) => {
        isMaximized.value = maximized;
      });

    
      checkNetworkStatus();
      setInterval(checkNetworkStatus, 30000); 
    });

    return {
      relay,
      qrcodeSvg,
      formatTime,
      lang,
      toggleLang,
      toggleStore,
      isStarted,
      toggleStart,
      isMaximized,
      isWorldMode, 
      combinedPhoneStyle,
      handleTouchStart,
      handleTouchMove,
      handleMouseDown,
      handleDraggingMouseMove,
      handleMouseUp,
      handleWrapperMouseMove,
      handleWrapperMouseLeave,
      minimizeWindow,
      closeWindow,
    };
  },
};
</script>

<style scoped>
:root {
  --aurora-teal: #40c4b7;
  --aurora-purple: #4af3d1;
  --aurora-green: #a2e8dd;
  --aurora-blue: #00aacc;
  --aurora-dark: rgb(2, 2, 2);
}

.wrapper {
  position: fixed;
  z-index: 2000;
  width: 100%;
  height: 100%;
  perspective: 1200px;
  pointer-events: all;
  background: linear-gradient(135deg, var(--aurora-dark), rgba(20, 20, 40, 0.8));
  transition: all 0.5s ease;
}

.scene {
  margin: 1% 15%;
  width: 70vw;
  height: 90vh;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
  transform: rotateX(15deg) rotateY(20deg) rotateZ(-15deg);
  /* transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); */
}

.scene.maximized {
  transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
}

.backplate-outer {
  position: absolute;
  width: 500px;
  height: 460px;
  top: 5%;
  left: -5%;
  background: linear-gradient(45deg, rgba(0, 237, 250, 0.8), rgba(10, 20, 20, 0.9));
  border-radius: 40px;
  transform: translateZ(-60px);
  box-shadow: 0 0 30px rgb(64, 196, 183), 0 0 60px rgba(138, 74, 243, 0.1);
  transition: all 0.5s ease;
}

.backplate-inner {
  position: absolute;
  width: 500px;
  height: 430px;
  top: -2.5%;
  left: -2.5%;
  background: linear-gradient(135deg, rgba(1, 255, 221, 0.786), rgba(15, 15, 30, 0.8));
  border-radius: 20px;
  transform: translateZ(-20px);
  transition: all 0.5s ease;
}

.phone {
  top: 8%;
  width: 500px;
  height: 390px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.3s ease, width 0.5s ease, height 0.5s ease, border-radius 0.5s ease;
  background: linear-gradient(45deg, rgba(33, 255, 207, 0.7), rgba(33, 255, 207, 0.7));
  border: 2px solid transparent;
  border-radius: 30px;
  backdrop-filter: blur(5px);
  pointer-events: auto;
  transform: translateZ(20px);
}

.phone.border-animate {
  border-image: linear-gradient(45deg, var(--aurora-teal), var(--aurora-purple)) 1;
}

.phone__panel,
.phone__panel1 {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(4, 255, 205, 0.9), rgba(10, 10, 20, 0.7));
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(64, 196, 183, 0.2);
  transform: translateZ(40px);
  transition: all 0.5s ease-in-out;
  overflow-y: auto;
  backdrop-filter: blur(10px);
}

.phone__panel1 {
  border: 2px solid transparent;
  border-image: linear-gradient(45deg, var(--aurora-green), var(--aurora-blue)) 1;
}

.title-bar {
  width: 100%;
  padding: 10px;
  background: linear-gradient(90deg, var(--aurora-dark), rgba(20, 20, 40, 0.8));
  display: flex;
  justify-content: space-between;
  align-items: center;
  transform: translateZ(50px);
}

.title-bar-drag {
  flex-grow: 1;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
}

.title-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--aurora-green);
  text-shadow: 0 0 5px rgba(162, 232, 221, 0.5);
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
  gap: 8px;
  margin-right: 20px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: linear-gradient(45deg, var(--aurora-teal), var(--aurora-purple));
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 0 10px rgba(64, 196, 183, 0.5);
}

.control-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(138, 74, 243, 0.7);
}

.control-btn:active {
  transform: scale(0.95);
}

.minimize {
  background: linear-gradient(45deg, #ff8c00, #ffbb33);
}

.close {
  background: linear-gradient(45deg, #ff4444, #ff7777);
}

.lang-toggle {
  width: auto;
  padding: 0 10px;
  border-radius: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  padding: 25px;
  width: 100%;
  transform: translateZ(60px);
}

.status-card {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(64, 196, 183, 0.15), rgba(138, 74, 243, 0.15));
  padding: 15px;
  border-radius: 15px;
  border: 1px solid rgba(162, 232, 221, 0.3);
  box-shadow: 0 5px 15px rgba(64, 196, 183, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.status-card:hover {
  transform: translateY(-5px) translateZ(10px);
  box-shadow: 0 10px 25px rgba(162, 232, 221, 0.4);
}

.label {
  font-size: 12px;
  color: var(--aurora-green);
  text-transform: uppercase;
  margin-bottom: 8px;
  text-shadow: 0 0 3px rgba(162, 232, 221, 0.3);
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.status-value {
  font-size: 16px;
  font-weight: 700;
  text-transform: capitalize;
}

.status-value.connecting { color: #ffbb33; }
.status-value.running { color: var(--aurora-teal); }
.status-value.error { color: #ff7777; }

.sub-text {
  font-size: 14px; 
  color: var(--aurora-blue);
}

.sub-text.waiting {
  font-style: italic;
  color: rgba(162, 232, 221, 0.6);
}

.time {
  font-weight: 500;
  font-size: 16px; 
}

.time-seconds {
  color: rgba(162, 232, 221, 0.8);
  font-size: 14px;
}

.value-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(20, 20, 40, 0.8);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--aurora-teal), var(--aurora-purple));
  transition: width 0.5s ease;
}

.link-qr-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.peer-link {
  font-size: 22px;
  color: var(--aurora-teal);
  word-break: break-all;
  transition: color 0.3s ease;
}

.peer-link:hover {
  color: var(--aurora-green);
}

.qr-container {
  width: 100px;
  height: 100px;
}

.network-content {
  display: flex;
  align-items: center;
}

.network-value {
  font-size: 16px;
  font-weight: 600;
}

.network-value.world {
  color: var(--aurora-teal);
  text-shadow: 0 0 5px rgba(64, 196, 183, 0.5);
}

.network-value.local {
  color: #ffbb33;
  text-shadow: 0 0 5px rgba(255, 187, 51, 0.5);
}

.storage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: linear-gradient(135deg, rgba(64, 196, 183, 0.15), rgba(138, 74, 243, 0.15));
  border-radius: 12px;
  border: 1px solid rgba(162, 232, 221, 0.3);
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 24px;
  transition: background 0.3s ease;
  overflow: hidden;
  cursor: pointer;
}

.slider:before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 255, 221, 0.8);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.slider-knob {
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 2px;
  background: black;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 8px rgba(162, 232, 221, 0.5);
}

input:checked + .slider:before {
  opacity: 1;
}

input:checked + .slider .slider-knob {
  transform: translateX(26px);
}

.value {
  font-size: 12px;
  color: var(--aurora-blue);
  transition: color 0.3s ease;
}

.value.active {
  color: var(--aurora-green);
  text-shadow: 0 0 5px rgba(162, 232, 221, 0.5);
}
</style>