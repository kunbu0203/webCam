$(function () {
  $(window).on('resize.vh', function () {
    var vh = window.innerHeight * 0.01;
    $('html').css('--vh', vh + 'px');
  }).trigger('resize.vh');
  const img = new Image();
  img.src = './assets/image/touch/logo.png'; // 你想顯示的圖片路徑
  const food = new Image();
  food.src = './assets/image/food.svg'; // 你想顯示的圖片路徑

  let streamObj; // 預計用來存放 串流相關的物件(MediaStream)
  let camera;
  let front = true;
  let frameReady = false;
  let cameraStart = false;
  let gameStart = false;
  let ballY1 = -100;
  let ballY2 = -500;
  let point = 0;
  const faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  // 開啟 webcam
  openCam('user');
  function openCam(type) {
    const $video = document.createElement('video');
    $video.setAttribute('playsinline', '');
    $video.setAttribute('autoplay', '');
    $video.setAttribute('muted', '');
    document.querySelector('.camera-video').appendChild($video);
    const $canvas = document.createElement('canvas');
    document.querySelector('.camera-screen').appendChild($canvas);
    const ctx = $canvas.getContext('2d');
    let loadedDataHandler; // 全局變數存儲 loadeddata 事件處理程序

    // 開啟視訊鏡頭，瀏覽器會跳詢問視窗
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: type,
        width: {
          ideal: 2400
        },
        height: {
          ideal: 3200
        }
      }
    }).then(async function (stream) {
      streamObj = stream; // 將串流物件放在 streamObj 全域變數，方便後面關閉 webcam 時會用到
      $video.srcObject = stream; // video 標籤顯示 webcam 畫面

      // 先移除之前的事件綁定
      if (loadedDataHandler) {
        $video.removeEventListener('loadeddata', loadedDataHandler);
      }
      const addLoadedDataHandler = new Promise((resolve, reject) => {
        // 重新定義並綁定 loadeddata 事件
        loadedDataHandler = function () {
          // 將 video 標籤的影片寬高，顯示於 canvas 標籤上
          $canvas.width = $video.videoWidth;
          $canvas.height = $video.videoHeight;
          resolve();
        };

        // 綁定事件
        $video.addEventListener('loadeddata', loadedDataHandler, false);
      });
      await addLoadedDataHandler;
      faceMesh.onResults(onResults);
      function onResults(results) {
        requestAnimationFrame(() => {
          // 清空Canvas
          ctx.clearRect(0, 0, $canvas.width, $canvas.height);
          ctx.save();
          if (type === 'user') {
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

            // 計算頭頂的座標
            const topOfHead = landmarks[10];
            const x = topOfHead.x * $canvas.width;
            const y = topOfHead.y * $canvas.height;
            const imgW = faceWidth + scale * 10;
            // 根據比例繪製圖片
            ctx.drawImage(img, x - imgW / 2, y - imgW, imgW, imgW);

            // 嘴巴張開偵測
            const upperLip = landmarks[13];
            const lowerLip = landmarks[14];
            const mouthOpenDistance = Math.abs(upperLip.y - lowerLip.y);

            // 設定一個閾值，當距離大於這個值時視為張嘴
            if (mouthOpenDistance > 0.05) {
              $('.camera-text').addClass('hide');
              if (!gameStart) {
                gameStart = true;
              }
            } else {
              $('.camera-text').removeClass('hide');
            }
            if (gameStart) {
              const lipCenter = (upperLip.y + lowerLip.y) / 2;
              const leftMouthCorner = landmarks[61].x * $canvas.width;
              const rightMouthCorner = landmarks[291].x * $canvas.width;
              const ballX = $canvas.width - 300;
              const ballXCenter = ballX + 50;
              const ballX2 = $canvas.width - 700;
              const ballXCenter2 = ballX2 + 50;
              if (ballY1 > $canvas.height) {
                ballY1 = -200;
              }
              if (ballY1 + 50 > lipCenter * $canvas.height && leftMouthCorner < ballXCenter && rightMouthCorner > ballXCenter && mouthOpenDistance > 0.05) {
                ballY1 = -200;
                point++;
              }
              if (ballY2 > $canvas.height) {
                ballY2 = -400;
              }
              if (ballY2 + 50 > lipCenter * $canvas.height && leftMouthCorner < ballXCenter2 && rightMouthCorner > ballXCenter2 && mouthOpenDistance > 0.05) {
                ballY2 = -400;
                point++;
              }
              $('.camera-direction').hide();
              ctx.drawImage(food, ballX, ballY1, 100, 100);
              ballY1 += 10;
              ctx.drawImage(food, ballX2, ballY2, 100, 100);
              ballY2 += 8;
            }
          }
          $('.text').text(point);
          ctx.restore();
        });
      }
      camera = new Camera($video, {
        onFrame: async () => {
          await faceMesh.send({
            image: $video
          });
          if (!frameReady) {
            frameReady = true;
          }
          if (frameReady && cameraStart) {
            $('.loading').addClass('hide');
          }
        },
        width: $video.videoWidth,
        height: $video.videoHeight,
        facingMode: type
      });
      camera.start();
      if (!cameraStart) {
        cameraStart = true;
      }
      if (frameReady && cameraStart) {
        $('.loading').addClass('hide');
      }
    }).catch(function (error) {
      // 若無法取得畫面，執行 catch
      alert('取得相機訪問權限失敗: ', error.message, error.name);
    });
  }
  $(`[data-camera-direction]`).off('click.direction').on('click.direction', function () {
    $('.loading').removeClass('hide');
    streamObj.getTracks().forEach(track => track.stop());
    if (camera) {
      camera.stop(); // 停止之前的 Camera
    }

    document.querySelector('.camera-video').innerHTML = '';
    document.querySelector('.camera-screen').innerHTML = '';
    frameReady = false;
    cameraStart = false;
    front = !front;
    setTimeout(() => {
      openCam(!front ? 'environment' : 'user');
    }, 0);
  });
});