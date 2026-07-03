<template>
  <view class="launch-container">
    <image
      class="logo"
      src="/static/icons/croissant.svg"
      mode="aspectFit"
    ></image>
    <view class="loading-dots" aria-label="正在加载">
      <view class="dot"></view>
      <view class="dot"></view>
      <view class="dot"></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.launch-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--bg-color);
}

.logo {
  width: 150px;
  height: 150px;
  margin-bottom: 40px;
  animation: float 3s ease-in-out infinite;
}

.loading-dots {
  display: flex;
}

.dot {
  width: 10px;
  height: 10px;
  margin: 0 5px;
  background-color: var(--primary-color);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
