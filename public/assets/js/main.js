$(async function () {
  $(window).on('resize.vh', function () {
    var vh = window.innerHeight * 0.01;
    $('html').css('--vh', vh + 'px');
  }).trigger('resize.vh');
  const $video = document.querySelector('[data-camera-video]');
  const $canvas = document.querySelector('[data-camera-canvas]');
  const ctx = $canvas.getContext('2d');
  let streamObj; // 預計用來存放 串流相關的物件(MediaStream)
  let front = true;
  let loadedDataHandler; // 全局變數存儲 loadeddata 事件處理程序
  let camera;
  const img = new Image();
  img.src = './assets/image/touch/logo.png'; // 你想顯示的圖片路徑
  img.onload = () => {
    // 開啟 webcam
    openCam();
  };
  function openCam() {
    // 開啟視訊鏡頭，瀏覽器會跳詢問視窗
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: front ? 'user' : 'environment',
        width: {
          ideal: 2400
        },
        height: {
          ideal: 3200
        }
      }
    }).then(function (stream) {
      streamObj = stream; // 將串流物件放在 streamObj 全域變數，方便後面關閉 webcam 時會用到
      $video.srcObject = stream; // video 標籤顯示 webcam 畫面

      // 先移除之前的事件綁定
      if (loadedDataHandler) {
        $video.removeEventListener('loadeddata', loadedDataHandler);
      }
      // 重新定義並綁定 loadeddata 事件
      loadedDataHandler = function () {
        // 將 video 標籤的影片寬高，顯示於 canvas 標籤上
        $canvas.width = $video.videoWidth;
        $canvas.height = $video.videoHeight;
        $('.camera-loading').addClass('hide');
      };

      // 綁定事件
      $video.addEventListener('loadeddata', loadedDataHandler, false);
      const faceMesh = new FaceMesh({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      faceMesh.onResults(onResults);
      function onResults(results) {
        requestAnimationFrame(() => {
          // 清空Canvas
          ctx.clearRect(0, 0, $canvas.width, $canvas.height);
          ctx.save();
          if (front) {
            // 水平反轉
            ctx.translate($canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(results.image, 0, 0, $canvas.width, $canvas.height);
          if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
              // drawConnectors(ctx, landmarks, FACEMESH_TESSELATION,
              //     { color: '#C0C0C070', lineWidth: 1 });
              // drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' });
              // drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' });
              // drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
              drawConnectors(ctx, landmarks, FACEMESH_LIPS, {
                color: '#E0E0E0'
              });
            }
          }
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // 計算臉部的外接矩形範圍
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            for (const point of landmarks) {
              const x = point.x * $canvas.width;
              const y = point.y * $canvas.height;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }

            // 計算臉部面積
            const faceWidth = maxX - minX;
            const faceHeight = maxY - minY;
            const faceArea = faceWidth * faceHeight;

            // 根據面積調整圖片大小，面積越大，頭越近
            const scale = faceArea / (window.innerWidth * window.innerHeight);
            // $('.text').text(scale);

            // 計算頭頂的座標
            const topOfHead = landmarks[10];
            const x = topOfHead.x * $canvas.width;
            const y = topOfHead.y * $canvas.height;
            const imgW = faceWidth + scale * 10;
            // 根據比例繪製圖片
            ctx.drawImage(img, x - imgW / 2, y - imgW, imgW, imgW);
          }
          ctx.restore();
        });
      }
      alert(`${$video.videoWidth}, ${$video.videoHeight}`);
      camera = new Camera($video, {
        onFrame: async () => {
          await faceMesh.send({
            image: $video
          });
        },
        width: 3024,
        height: 2400,
        facingMode: front ? 'user' : 'environment'
      });
      camera.start();
    }).catch(function (error) {
      // 若無法取得畫面，執行 catch
      alert('取得相機訪問權限失敗: ', error.message, error.name);
    });
  }
  $('[data-camera-direction]').on('click', function () {
    $('.camera-loading').removeClass('hide');
    streamObj.getTracks().forEach(track => track.stop());
    if (camera) {
      camera.stop(); // 停止之前的 Camera
    }

    front = !front;
    openCam();
  });
});