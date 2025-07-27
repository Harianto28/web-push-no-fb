if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('/sw.js').then(swReg => {
    console.log('Service Worker Registered', swReg);

    document.getElementById('subscribe').onclick = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return alert('Notification permission denied');

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: '"BKrjtF_OB64bep0z1ovcF2HNxMTFZEoD_N8AEGKfm79qK7vEdIoWZWhQU5anTxF1hW8Nxvq9JLWOy3f7788sv5k"'
      });

      await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      alert('Subscribed successfully!');
    };
  });
}