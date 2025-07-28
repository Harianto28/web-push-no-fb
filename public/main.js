if ("serviceWorker" in navigator && "PushManager" in window) {
  const deviceInfo = document.getElementById("deviceInfo");
  const subscribeButton = document.getElementById("subscribe");
  const statusElement = document.getElementById("status");

  // Display device info
  if (deviceInfo) {
    deviceInfo.innerHTML = `
      Platform: ${navigator.platform}<br>
      User Agent: ${navigator.userAgent.substring(0, 60)}...<br>
      Service Worker: ✅ Supported<br>
      Push Manager: ✅ Supported
    `;
  }

  // Register service worker
  navigator.serviceWorker
    .register("/sw.js")
    .then(async (swReg) => {
      console.log("✅ Service Worker registered:", swReg);

      const keyRes = await fetch("/vapid-public-key");
      const { publicKey } = await keyRes.json();

      let subscription = await swReg.pushManager.getSubscription();

      if (subscription) {
        updateStatus("Already subscribed!", "success");
        subscribeButton.textContent = "Unsubscribe";
        subscribeButton.onclick = () => unsubscribe(swReg);
      } else {
        updateStatus("Click subscribe to receive notifications", "info");
        subscribeButton.onclick = () => subscribe(swReg, publicKey);
      }
    })
    .catch((err) => {
      console.error("❌ SW registration failed:", err);
      updateStatus("Service Worker registration failed", "error");
    });

  async function subscribe(swReg, publicKey) {
    try {
      updateStatus("Requesting permission...", "info");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        updateStatus("❌ Notification permission denied", "error");
        return;
      }

      updateStatus("Subscribing to push...", "info");

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      updateStatus("✅ Subscribed successfully!", "success");
      subscribeButton.textContent = "Unsubscribe";
      subscribeButton.onclick = () => unsubscribe(swReg);
    } catch (error) {
      console.error("❌ Subscription error:", error);
      updateStatus("Subscription failed: " + error.message, "error");
    }
  }

  async function unsubscribe(swReg) {
    try {
      updateStatus("Unsubscribing...", "info");

      const subscription = await swReg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        updateStatus("✅ Unsubscribed!", "success");
      } else {
        updateStatus("No subscription found", "info");
      }

      subscribeButton.textContent = "Subscribe to Notifications";
      subscribeButton.onclick = () => subscribe(swReg);
    } catch (error) {
      console.error("❌ Unsubscribe error:", error);
      updateStatus("Unsubscribe failed: " + error.message, "error");
    }
  }

  function updateStatus(message, type = "info") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
} else {
  console.warn("❌ Push notifications not supported in this browser.");
  const status = document.getElementById("status");
  if (status) status.textContent = "Push not supported on this device.";
}
