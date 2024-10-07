(function () {
  // 背景選項輪播
  const bgSlider = new Swiper('[data-slider-bg]', {
    loop: false,
    slidesPerView: 'auto',
    centeredSlides: true,
    navigation: {
      nextEl: '.-bg .swiper-button-next',
      prevEl: '.-bg .swiper-button-prev'
    },
    on: {
      slideChangeTransitionEnd: function () {
        $(`[data-card-bg="${this.activeIndex + 1}"]`).prop('checked', true).trigger('change.bg');
      }
    }
  });

  // 背景切換
  $('[data-card-bg]').on('change.bg', function (e) {
    $('.card').addClass('-loading');
    const val = $(e.target).data('cardBg');
    const img = new Image();
    img.src = `./assets/image/card/${val}.jpg`;
    img.onload = () => {
      if ($('.card').hasClass('-loading')) {
        $('.card-bg img').attr('src', `./assets/image/card/${val}.jpg`);
        setTimeout(() => {
          $('.card').removeClass('-loading');
        }, 0);
      }
    };
  });
  $('[data-card-bg]').on('change.slide', function (e) {
    const val = $(e.target).data('cardBg');
    bgSlider.slideTo(val - 1);
  });
  let htmlContent;
  let num = 0;
  $('[data-input]').on({
    input: function (e) {
      htmlContent = $(e.target).html();
      num = num === 0 ? 1 : 0;
      $(this).css('height', 'calc(100% + ' + num + 'px)');
      $('[data-clear], [data-next]').attr('disabled', !htmlContent);
      $('.textarea').toggleClass('-hasText', !!htmlContent);
      $('.textarea').toggleClass('-over', $('[data-input]').outerWidth() > $('.textarea-wrap').outerWidth());
    },
    paste: function (e) {
      e.preventDefault();
      // 獲取剪貼簿數據
      const clipboardData = e.originalEvent.clipboardData || window.clipboardData;
      if (clipboardData) {
        // 從剪貼簿中獲取純文字
        const text = clipboardData.getData('text/plain');

        // 插入純文字
        document.execCommand('insertText', false, text);
      }
    },
    focus: function () {
      $('.textarea').addClass('-focus');
    },
    blur: function () {
      $('.textarea').removeClass('-focus');
      $('.textarea-wrap').scrollLeft(0);
    }
  });
  $('[data-clear]').on('click', function () {
    $('[data-input]').text('').trigger('input');
  });
})();