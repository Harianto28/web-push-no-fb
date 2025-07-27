if ("serviceWorker" in navigator && "PushManager" in window) {
  navigator.serviceWorker.register("/sw.js").then(async (swReg) => {
    console.log("Service Worker Registered", swReg);

    // Fetch the VAPID public key from the backend
    const keyRes = await fetch("/vapid-public-key");
    const { publicKey } = await keyRes.json();

    document.getElementById("subscribe").onclick = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return alert("Notification permission denied");
      }

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      alert("Subscribed successfully!");
    };
  });
}

// Utility to convert Base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
